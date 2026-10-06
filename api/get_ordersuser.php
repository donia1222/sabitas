<?php
// Incluir configuración
require_once 'config.php';
require_once 'features.php';

// CONFIGURACIÓN CORS MEJORADA - DEBE IR AL INICIO
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, Cache-Control, Authorization');
header('Access-Control-Allow-Credentials: false');
header('Content-Type: application/json; charset=utf-8');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Paquete 3: apagado. Ver api/features.php
requireFeature('cuentas');

// IMPORTANTE: Evitar cualquier output antes del JSON
ob_start();

try {
    // Conectar a la base de datos usando config.php
    $pdo = getDBConnection();
    
    // Parámetros de consulta - CONVERTIR A ENTEROS
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(50, max(1, intval($_GET['limit']))) : 20;
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    $email = isset($_GET['email']) ? $_GET['email'] : null;
    $orderNumber = isset($_GET['order_number']) ? $_GET['order_number'] : null;
    $search = isset($_GET['search']) ? $_GET['search'] : null;
    
    $offset = ($page - 1) * $limit;
    
    // Construir consulta base
    $whereConditions = [];
    $params = [];
    
    if ($status && in_array($status, ['pending', 'processing', 'completed', 'cancelled'])) {
        $whereConditions[] = "o.status = ?";
        $params[] = $status;
    }
    
    if ($email) {
        $whereConditions[] = "o.customer_email LIKE ?";
        $params[] = "%$email%";
    }
    
    if ($orderNumber) {
        $whereConditions[] = "o.order_number LIKE ?";
        $params[] = "%$orderNumber%";
    }
    
    if ($search) {
        $whereConditions[] = "(o.customer_first_name LIKE ? OR o.customer_last_name LIKE ? OR o.customer_email LIKE ? OR o.order_number LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
    
    // Consulta para contar total de pedidos
    $countSql = "SELECT COUNT(*) as total FROM orders o $whereClause";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalOrders = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Consulta principal para obtener pedidos
    $ordersSql = "SELECT 
        o.id,
        o.order_number,
        o.customer_first_name,
        o.customer_last_name,
        o.customer_email,
        o.customer_phone,
        o.customer_address,
        o.customer_city,
        o.customer_postal_code,
        o.customer_canton,
        o.customer_notes,
        o.total_amount,
        o.shipping_cost,
        o.status,
        o.payment_method,
        o.payment_status,
        o.created_at,
        o.updated_at,
        COUNT(oi.id) as items_count
    FROM orders o 
    LEFT JOIN order_items oi ON o.id = oi.order_id
    $whereClause 
    GROUP BY o.id
    ORDER BY o.created_at DESC 
    LIMIT $limit OFFSET $offset";
    
    $ordersStmt = $pdo->prepare($ordersSql);
    $ordersStmt->execute($params);
    $orders = $ordersStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener items para cada pedido si se solicita
    $includeItems = isset($_GET['include_items']) && $_GET['include_items'] === 'true';
    
    if ($includeItems && !empty($orders)) {
        $orderIds = array_column($orders, 'id');
        $placeholders = str_repeat('?,', count($orderIds) - 1) . '?';
        
        $itemsSql = "SELECT 
            oi.order_id,
            oi.product_id,
            oi.product_name,
            oi.product_description,
            oi.product_image,
            oi.price,
            oi.quantity,
            oi.subtotal,
            oi.heat_level,
            oi.rating,
            oi.badge,
            oi.origin
        FROM order_items oi 
        WHERE oi.order_id IN ($placeholders)
        ORDER BY oi.id";
        
        $itemsStmt = $pdo->prepare($itemsSql);
        $itemsStmt->execute($orderIds);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Agrupar items por order_id
        $itemsByOrder = [];
        foreach ($items as $item) {
            $itemsByOrder[$item['order_id']][] = $item;
        }
        
        // Agregar items a cada pedido
        foreach ($orders as &$order) {
            $order['items'] = $itemsByOrder[$order['id']] ?? [];
        }
    }
    
    // Calcular información de paginación
    $totalPages = ceil($totalOrders / $limit);
    
    // Estadísticas adicionales
    $statsSql = "SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
    FROM orders";
    
    $statsStmt = $pdo->query($statsSql);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // Limpiar cualquier output buffer antes de enviar JSON
    ob_clean();
    
    // Respuesta JSON
    $response = [
        'success' => true,
        'data' => $orders,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $totalPages,
            'total_orders' => $totalOrders,
            'per_page' => $limit,
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1
        ],
        'stats' => $stats,
        'filters' => [
            'status' => $status,
            'email' => $email,
            'order_number' => $orderNumber,
            'search' => $search
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Limpiar output buffer en caso de error
    ob_clean();
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ], JSON_UNESCAPED_UNICODE);
}

// Finalizar output buffer
ob_end_flush();
?>
