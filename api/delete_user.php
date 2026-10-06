<?php
require_once 'config.php';
require_once 'features.php';

setCORSHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Paquete 3: apagado. Ver api/features.php
requireFeature('cuentas');

// Log inicial para debugging
error_log("=== DELETE USER REQUEST START ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'not set'));

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Función para verificar si una tabla existe
function tableExists($pdo, $tableName) {
    try {
        $sql = "SHOW TABLES LIKE ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$tableName]);
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        error_log("Error checking table $tableName: " . $e->getMessage());
        return false;
    }
}

try {
    $pdo = getDBConnection();
    
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    error_log("Input data: " . $input);
    error_log("Parsed data: " . print_r($data, true));
    
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }
    
    // Validar campos requeridos
    if (empty($data['sessionToken'])) {
        throw new Exception('Session token is required');
    }
    
    if (empty($data['confirmPassword'])) {
        throw new Exception('Password confirmation is required');
    }
    
    $sessionToken = $data['sessionToken'];
    $confirmPassword = $data['confirmPassword'];
    
    error_log("Processing delete request for session: " . substr($sessionToken, 0, 10) . "...");
    
    // Verificar sesión y obtener datos del usuario
    $sessionSql = "SELECT us.user_id, us.expires_at, u.email, u.password_hash, u.first_name, u.last_name 
                   FROM user_sessions us 
                   JOIN users u ON us.user_id = u.id 
                   WHERE us.session_token = ? AND us.expires_at > NOW()";
    
    $sessionStmt = $pdo->prepare($sessionSql);
    $sessionStmt->execute([$sessionToken]);
    $sessionData = $sessionStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$sessionData) {
        error_log("Invalid or expired session token");
        http_response_code(401);
        throw new Exception('Invalid or expired session');
    }
    
    $userId = $sessionData['user_id'];
    $userEmail = $sessionData['email'];
    $passwordHash = $sessionData['password_hash'];
    
    error_log("Found user ID: $userId, Email: $userEmail");
    
    // Verificar contraseña
    if (!password_verify($confirmPassword, $passwordHash)) {
        error_log("Password verification failed for user: $userEmail");
        http_response_code(401);
        throw new Exception('Invalid password');
    }
    
    error_log("Password verification successful");
    
    // Verificar qué tablas existen antes de eliminar
    $tablesToCheck = [
        'user_sessions',
        'order_items', 
        'orders',
        'cart_items',
        'user_favorites',
        'user_addresses',
        'user_wishlist',
        'product_reviews'
    ];
    
    $existingTables = [];
    foreach ($tablesToCheck as $table) {
        if (tableExists($pdo, $table)) {
            $existingTables[] = $table;
            error_log("Table exists: $table");
        } else {
            error_log("Table does not exist: $table");
        }
    }
    
    // Iniciar transacción para eliminar todos los datos relacionados
    $pdo->beginTransaction();
    
    try {
        $deletionResults = [];
        
        // 1. Eliminar sesiones del usuario
        if (in_array('user_sessions', $existingTables)) {
            $deleteSessionsSql = "DELETE FROM user_sessions WHERE user_id = ?";
            $deleteSessionsStmt = $pdo->prepare($deleteSessionsSql);
            $deleteSessionsStmt->execute([$userId]);
            $deletedSessions = $deleteSessionsStmt->rowCount();
            $deletionResults['sessions'] = $deletedSessions;
            error_log("Deleted $deletedSessions user sessions");
        }
        
        // 2. Eliminar items de órdenes del usuario (si existe tabla order_items)
        if (in_array('order_items', $existingTables) && in_array('orders', $existingTables)) {
            $deleteOrderItemsSql = "DELETE oi FROM order_items oi 
                                   JOIN orders o ON oi.order_id = o.id 
                                   WHERE o.user_id = ?";
            $deleteOrderItemsStmt = $pdo->prepare($deleteOrderItemsSql);
            $deleteOrderItemsStmt->execute([$userId]);
            $deletedOrderItems = $deleteOrderItemsStmt->rowCount();
            $deletionResults['orderItems'] = $deletedOrderItems;
            error_log("Deleted $deletedOrderItems order items");
        }
        
        // 3. Eliminar órdenes del usuario
        if (in_array('orders', $existingTables)) {
            $deleteOrdersSql = "DELETE FROM orders WHERE user_id = ?";
            $deleteOrdersStmt = $pdo->prepare($deleteOrdersSql);
            $deleteOrdersStmt->execute([$userId]);
            $deletedOrders = $deleteOrdersStmt->rowCount();
            $deletionResults['orders'] = $deletedOrders;
            error_log("Deleted $deletedOrders orders");
        }
        
        // 4. Eliminar items del carrito del usuario (si existe tabla cart_items)
        if (in_array('cart_items', $existingTables)) {
            $deleteCartSql = "DELETE FROM cart_items WHERE user_id = ?";
            $deleteCartStmt = $pdo->prepare($deleteCartSql);
            $deleteCartStmt->execute([$userId]);
            $deletedCartItems = $deleteCartStmt->rowCount();
            $deletionResults['cartItems'] = $deletedCartItems;
            error_log("Deleted $deletedCartItems cart items");
        }
        
        // 5. Eliminar favoritos del usuario (si existe tabla user_favorites)
        if (in_array('user_favorites', $existingTables)) {
            $deleteFavoritesSql = "DELETE FROM user_favorites WHERE user_id = ?";
            $deleteFavoritesStmt = $pdo->prepare($deleteFavoritesSql);
            $deleteFavoritesStmt->execute([$userId]);
            $deletedFavorites = $deleteFavoritesStmt->rowCount();
            $deletionResults['favorites'] = $deletedFavorites;
            error_log("Deleted $deletedFavorites favorites");
        }
        
        // 6. Eliminar direcciones adicionales del usuario (si existe tabla user_addresses)
        if (in_array('user_addresses', $existingTables)) {
            $deleteAddressesSql = "DELETE FROM user_addresses WHERE user_id = ?";
            $deleteAddressesStmt = $pdo->prepare($deleteAddressesSql);
            $deleteAddressesStmt->execute([$userId]);
            $deletedAddresses = $deleteAddressesStmt->rowCount();
            $deletionResults['addresses'] = $deletedAddresses;
            error_log("Deleted $deletedAddresses additional addresses");
        }
        
        // 7. Eliminar wishlist del usuario (si existe tabla user_wishlist)
        if (in_array('user_wishlist', $existingTables)) {
            $deleteWishlistSql = "DELETE FROM user_wishlist WHERE user_id = ?";
            $deleteWishlistStmt = $pdo->prepare($deleteWishlistSql);
            $deleteWishlistStmt->execute([$userId]);
            $deletedWishlist = $deleteWishlistStmt->rowCount();
            $deletionResults['wishlist'] = $deletedWishlist;
            error_log("Deleted $deletedWishlist wishlist items");
        }
        
        // 8. Eliminar reseñas de productos del usuario (si existe tabla product_reviews)
        if (in_array('product_reviews', $existingTables)) {
            $deleteReviewsSql = "DELETE FROM product_reviews WHERE user_id = ?";
            $deleteReviewsStmt = $pdo->prepare($deleteReviewsSql);
            $deleteReviewsStmt->execute([$userId]);
            $deletedReviews = $deleteReviewsStmt->rowCount();
            $deletionResults['reviews'] = $deletedReviews;
            error_log("Deleted $deletedReviews product reviews");
        }
        
        // 9. Finalmente, eliminar el usuario
        $deleteUserSql = "DELETE FROM users WHERE id = ?";
        $deleteUserStmt = $pdo->prepare($deleteUserSql);
        $deleteUserStmt->execute([$userId]);
        $deletedUser = $deleteUserStmt->rowCount();
        $deletionResults['user'] = $deletedUser;
        
        if ($deletedUser === 0) {
            throw new Exception('Failed to delete user account');
        }
        
        error_log("Successfully deleted user account");
        
        // Confirmar transacción
        $pdo->commit();
        
        error_log("User deletion completed successfully for: $userEmail");
        
        // Respuesta exitosa
        $response = [
            'success' => true,
            'message' => 'User account deleted successfully',
            'deleted' => $deletionResults,
            'existing_tables' => $existingTables,
            'checked_tables' => $tablesToCheck
        ];
        
        error_log("Sending success response: " . json_encode($response));
        echo json_encode($response);
        
    } catch (Exception $e) {
        // Revertir transacción en caso de error
        $pdo->rollBack();
        error_log("Transaction rolled back due to error: " . $e->getMessage());
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error in delete_user.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Determinar código de respuesta HTTP apropiado
    $httpCode = 400;
    if (strpos($e->getMessage(), 'Invalid or expired session') !== false || 
        strpos($e->getMessage(), 'Invalid password') !== false) {
        $httpCode = 401;
    }
    
    http_response_code($httpCode);
    $errorResponse = [
        'success' => false,
        'error' => $e->getMessage()
    ];
    
    error_log("Sending error response: " . json_encode($errorResponse));
    echo json_encode($errorResponse);
}

error_log("=== DELETE USER REQUEST END ===");
?>