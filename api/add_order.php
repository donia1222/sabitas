<?php
// Incluir configuración y funciones de email
require_once 'config.php';
require_once 'features.php';
require_once 'email_functions.php';
require_once 'process_gift_card_order.php';

// Configurar headers CORS y content type
header('Content-Type: application/json');
setCORSHeaders(); // Usar la función del config.php

// Log de debugging (opcional - comentar en producción)
error_log("=== ADD ORDER REQUEST ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Headers: " . json_encode(getallheaders()));

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Paquete 3: apagado. Ver api/features.php
requireFeature('pedidos');

// Solo permitir POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Only POST is accepted.',
        'received_method' => $_SERVER['REQUEST_METHOD']
    ]);
    exit();
}

try {
    // Obtener datos JSON del request
    $input = file_get_contents('php://input');
    error_log("Raw input: " . $input);
    
    if (empty($input)) {
        throw new Exception('No data received');
    }
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data: ' . json_last_error_msg());
    }
    
    error_log("Decoded data: " . json_encode($data));
    
    // Validar datos requeridos
    $required_fields = ['customerInfo', 'cart', 'totalAmount'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    $customerInfo = $data['customerInfo'];
    $billingAddress = $data['billingAddress'] ?? null;
    $cart = $data['cart'];
    $totalAmount = $data['totalAmount'];
    $paypalPayerID = $data['paypalPayerID'] ?? null;

    // Determinar método de pago (necesario para validación de dirección)
    $paymentMethod = $data['paymentMethod'] ?? 'paypal';
    $isPickup = ($paymentMethod === 'pickup');

    // En Abholung im Geschäft no hay envío: forzar coste 0
    $shippingCost = $isPickup ? 0 : ($data['shippingCost'] ?? 0);

    // Validar información del cliente
    // En Abholung im Geschäft la dirección de envío no es obligatoria
    $required_customer_fields = $isPickup
        ? ['firstName', 'lastName', 'email', 'phone']
        : ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode', 'canton'];
    foreach ($required_customer_fields as $field) {
        if (empty($customerInfo[$field])) {
            throw new Exception("Missing required customer field: $field");
        }
    }
    
    // Validar que el carrito no esté vacío
    if (empty($cart) || !is_array($cart)) {
        throw new Exception("Cart is empty or invalid");
    }
    
    // Conectar a la base de datos usando config.php
    error_log("Attempting database connection...");
    $pdo = getDBConnection();
    error_log("Database connected successfully");
    
    // Verificar que las tablas existen
    $tables_check = $pdo->query("SHOW TABLES LIKE 'orders'")->rowCount();
    if ($tables_check == 0) {
        throw new Exception("Database table 'orders' does not exist. Please run the SQL setup script first.");
    }
    
    // Generar número de pedido único
    $orderNumber = (string)mt_rand(10000, 99999);
    error_log("Generated order number: $orderNumber");
    
    // Iniciar transacción
    $pdo->beginTransaction();
    error_log("Transaction started");
    
    // ============================================
    // VALIDAR Y VERIFICAR STOCK DISPONIBLE
    // ============================================
    error_log("=== CHECKING STOCK AVAILABILITY ===");
    
    $stockErrors = [];
    $stockUpdates = [];
    
    foreach ($cart as $index => $item) {
        // Saltar gutscheine — no tienen stock en products
        if (($item['item_type'] ?? '') === 'gutschein') continue;

        $productId = $item['id'] ?? 0;
        $requestedQuantity = $item['quantity'] ?? 1;

        if ($productId <= 0) {
            $stockErrors[] = "Producto inválido en posición $index";
            continue;
        }

        // Obtener stock actual del producto
        $stockSql = "SELECT id, name, stock FROM products WHERE id = :id";
        $stockStmt = $pdo->prepare($stockSql);
        $stockStmt->execute([':id' => $productId]);
        $product = $stockStmt->fetch();
        
        if (!$product) {
            $stockErrors[] = "Producto con ID $productId no encontrado";
            continue;
        }
        
        $currentStock = $product['stock'];
        $productName = $product['name'];
        
        error_log("Product: $productName (ID: $productId) - Current stock: $currentStock, Requested: $requestedQuantity");
        
        // Verificar si hay suficiente stock
        if ($currentStock < $requestedQuantity) {
            $stockErrors[] = "Stock insuficiente para '$productName'. Disponible: $currentStock, Solicitado: $requestedQuantity";
            continue;
        }
        
        // Preparar actualización de stock
        $newStock = $currentStock - $requestedQuantity;
        $stockUpdates[] = [
            'id' => $productId,
            'name' => $productName,
            'currentStock' => $currentStock,
            'requestedQuantity' => $requestedQuantity,
            'newStock' => $newStock
        ];
    }
    
    // Si hay errores de stock, cancelar la transacción
    if (!empty($stockErrors)) {
        $pdo->rollback();
        error_log("Stock validation failed: " . implode(", ", $stockErrors));
        throw new Exception("Error de stock: " . implode("; ", $stockErrors));
    }
    
    // ============================================
    // ACTUALIZAR STOCK DE PRODUCTOS
    // ============================================
    error_log("=== UPDATING PRODUCT STOCK ===");
    
    $updateStockSql = "UPDATE products SET stock = :newStock WHERE id = :productId";
    $updateStockStmt = $pdo->prepare($updateStockSql);
    
    foreach ($stockUpdates as $update) {
        $updateResult = $updateStockStmt->execute([
            ':newStock' => $update['newStock'],
            ':productId' => $update['id']
        ]);
        
        if (!$updateResult) {
            throw new Exception("Error al actualizar stock del producto: " . $update['name']);
        }
        
        error_log("Stock updated for {$update['name']} (ID: {$update['id']}): {$update['currentStock']} -> {$update['newStock']}");
    }
    
    // Determinar estado del pedido según el método de pago
    // (pickup e invoice quedan pendientes: se pagan más tarde / en la tienda)
    $paymentStatus = $data['paymentStatus'] ?? (($paymentMethod === 'invoice' || $isPickup) ? 'pending' : 'completed');
    $orderStatus = ($paymentMethod === 'invoice' || $isPickup) ? 'pending' : 'completed';
    
    // Log para debugging
    error_log("Payment method received: " . $paymentMethod);
    error_log("Payment status received: " . $paymentStatus);
    error_log("Order status set to: " . $orderStatus);
    
    // Preparar notas del pedido
    $notes = $customerInfo['notes'] ?? '';
    if ($paypalPayerID) {
        $notes .= ($notes ? "\n" : "") . "PayPal Payer ID: " . $paypalPayerID;
    }
    if ($paymentMethod === 'invoice') {
        $notes .= ($notes ? "\n" : "") . "Kauf auf Rechnung - Rechnung wird per Post gesendet";
    }
    if ($isPickup) {
        $notes .= ($notes ? "\n" : "") . "Abholung im Geschäft - Bestellung reserviert, Zahlung bei Abholung";
    }
    
    // Agregar información de stock actualizado a las notas
    $stockNotes = "Stock actualizado: ";
    foreach ($stockUpdates as $update) {
        $stockNotes .= "{$update['name']} (-{$update['requestedQuantity']}), ";
    }
    $stockNotes = rtrim($stockNotes, ", ");
    $notes .= ($notes ? "\n" : "") . $stockNotes;
    
    // Insertar pedido principal
    $orderSql = "INSERT INTO orders (
        order_number, customer_first_name, customer_last_name, customer_email, 
        customer_phone, customer_address, customer_city, customer_postal_code, 
        customer_canton, customer_notes, total_amount, shipping_cost, 
        status, payment_method, payment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $orderStmt = $pdo->prepare($orderSql);
    $orderResult = $orderStmt->execute([
        $orderNumber,
        $customerInfo['firstName'],
        $customerInfo['lastName'],
        $customerInfo['email'],
        $customerInfo['phone'],
        $customerInfo['address'] ?? '',
        $customerInfo['city'] ?? '',
        $customerInfo['postalCode'] ?? '',
        $customerInfo['canton'] ?? '',
        $notes,
        $totalAmount,
        $shippingCost,
        $orderStatus,
        $paymentMethod,
        $paymentStatus
    ]);
    
    if (!$orderResult) {
        throw new Exception("Failed to insert order");
    }
    
    $orderId = $pdo->lastInsertId();
    error_log("Order inserted with ID: $orderId");
    
    // Insertar items del pedido
    $itemSql = "INSERT INTO order_items (
        order_id, product_id, product_name, product_description, product_image,
        price, quantity, subtotal, heat_level, rating, badge, origin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $itemStmt = $pdo->prepare($itemSql);
    
    foreach ($cart as $index => $item) {
        $subtotal = $item['price'] * $item['quantity'];
        $itemResult = $itemStmt->execute([
            $orderId,
            $item['id'] ?? 0,
            $item['name'] ?? 'Unknown Product',
            $item['description'] ?? '',
            $item['image'] ?? '',
            $item['price'] ?? 0,
            $item['quantity'] ?? 1,
            $subtotal,
            $item['heatLevel'] ?? 0,
            $item['rating'] ?? 0,
            $item['badge'] ?? '',
            $item['origin'] ?? ''
        ]);
        
        if (!$itemResult) {
            throw new Exception("Failed to insert item $index");
        }
        
        error_log("Item $index inserted successfully");
    }
    
    // Confirmar transacción
    $pdo->commit();
    error_log("Transaction committed successfully");

    // ============================================
    // PROCESAR GUTSCHEINE DEL PEDIDO
    // ============================================
    try {
        $giftCardItems = array_filter($cart, fn($i) => ($i['item_type'] ?? '') === 'gutschein');
        if (!empty($giftCardItems)) {
            // Métodos cuyo pago no es inmediato: el código se activa cuando el admin marca pagado
            $pendingMethods = ['invoice', 'twint', 'pickup'];
            $isPaidNow = !in_array($paymentMethod, $pendingMethods, true);
            processGiftCardOrder(
                $pdo,
                (int)$orderId,
                array_values($giftCardItems),
                $customerInfo['firstName'] . ' ' . $customerInfo['lastName'],
                $customerInfo['email'],
                $isPaidNow,
                $paymentMethod
            );
        }
    } catch (Exception $gcError) {
        error_log("Error processing gift cards: " . $gcError->getMessage());
    }

    // Enviar email de confirmación según el método de pago
    try {
        $emailData = [
            'customerInfo' => $customerInfo,
            'billingAddress' => $billingAddress,
            'cart' => $cart,
            'total' => $totalAmount,
            'orderNumber' => $orderNumber,
            'paymentMethod' => $paymentMethod,
            'paypalPayerID' => $paypalPayerID
        ];
        
        if ($paymentMethod === 'invoice') {
            $emailResponse = sendInvoiceConfirmationEmail($emailData);
            error_log("Invoice email sent: " . json_encode($emailResponse));
        } elseif ($paymentMethod === 'paypal') {
            $emailResponse = sendPayPalConfirmationEmail($emailData);
            error_log("PayPal email sent: " . json_encode($emailResponse));
        } else {
            // stripe, stripe_twint, twint — email genérico de confirmación
            $emailResponse = sendOrderConfirmationEmail($emailData);
            error_log("Order confirmation email sent [$paymentMethod]: " . json_encode($emailResponse));
        }
    } catch (Exception $emailError) {
        error_log("Error sending confirmation email: " . $emailError->getMessage());
        // No interrumpir el proceso por error de email
    }
    
    // Respuesta exitosa
    $response = [
        'success' => true,
        'message' => 'Order saved successfully',
        'orderId' => $orderId,
        'orderNumber' => $orderNumber,
        'stockUpdates' => $stockUpdates, // Información sobre el stock actualizado
        'data' => [
            'id' => $orderId,
            'orderNumber' => $orderNumber,
            'status' => $orderStatus,
            'totalAmount' => $totalAmount,
            'paymentMethod' => $paymentMethod,
            'paymentStatus' => $paymentStatus,
            'paypalPayerID' => $paypalPayerID,
            'createdAt' => date('Y-m-d H:i:s')
        ]
    ];
    
    error_log("Success response: " . json_encode($response));
    echo json_encode($response);
    
} catch (PDOException $e) {
    // Error de base de datos
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage(),
        'error_type' => 'database'
    ]);
    
} catch (Exception $e) {
    // Error general
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log("General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'error_type' => 'general'
    ]);
}
?>