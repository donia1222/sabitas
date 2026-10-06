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

error_log("=== GET USER REQUEST START ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'not set'));

// Aceptar tanto GET como POST
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $pdo = getDBConnection();
    
    $sessionToken = '';
    
    // Método 1: POST body (NUEVO - más confiable)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data && isset($data['sessionToken'])) {
            $sessionToken = $data['sessionToken'];
            error_log("Token found in POST body: " . substr($sessionToken, 0, 10) . "...");
        }
    }
    
    // Método 2: Header Authorization (fallback)
    if (empty($sessionToken)) {
        $authHeader = '';
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    $authHeader = $value;
                    break;
                }
            }
        }
        
        if (empty($authHeader)) {
            foreach ($_SERVER as $key => $value) {
                if (strtolower($key) === 'http_authorization') {
                    $authHeader = $value;
                    break;
                }
            }
        }
        
        if (!empty($authHeader) && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $sessionToken = trim($matches[1]);
            error_log("Token found in Authorization header: " . substr($sessionToken, 0, 10) . "...");
        }
    }
    
    // Método 3: GET parameter (fallback)
    if (empty($sessionToken) && isset($_GET['token'])) {
        $sessionToken = $_GET['token'];
        error_log("Token found in GET parameter: " . substr($sessionToken, 0, 10) . "...");
    }
    
    error_log("Final token: " . ($sessionToken ? substr($sessionToken, 0, 10) . "..." : "EMPTY"));
    
    if (empty($sessionToken)) {
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'error' => 'Authorization token required',
            'debug' => [
                'method' => $_SERVER['REQUEST_METHOD'],
                'origin' => $origin,
                'post_data' => $_SERVER['REQUEST_METHOD'] === 'POST' ? $input ?? 'no input' : 'not post',
                'authHeader' => $authHeader ?? '',
                'server_auth' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'not set',
                'get_token' => $_GET['token'] ?? 'not set'
            ]
        ]);
        exit();
    }
    
    // Verificar sesión CON INFORMACIÓN DETALLADA
    $sessionSql = "SELECT us.user_id, us.expires_at, us.created_at,
                          u.email, u.first_name, u.last_name, u.phone,
                          u.address, u.city, u.postal_code, u.canton, u.notes,
                          u.created_at as user_created_at, u.last_login, u.is_active
                   FROM user_sessions us
                   JOIN users u ON us.user_id = u.id
                   WHERE us.session_token = ?";
    
    $sessionStmt = $pdo->prepare($sessionSql);
    $sessionStmt->execute([$sessionToken]);
    $session = $sessionStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        error_log("No session found for token: " . substr($sessionToken, 0, 10) . "...");
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'error' => 'Invalid session token'
        ]);
        exit();
    }
    
    // LOG DETALLADO DE LA SESIÓN
    error_log("Session found - expires_at: " . $session['expires_at']);
    error_log("Current time: " . date('Y-m-d H:i:s'));
    error_log("Session expires timestamp: " . strtotime($session['expires_at']));
    error_log("Current timestamp: " . time());
    error_log("Time difference: " . (strtotime($session['expires_at']) - time()) . " seconds");
    
    // Verificar si la sesión ha expirado CON MÁS TIEMPO
    $expirationTime = strtotime($session['expires_at']);
    $currentTime = time();
    
    if ($expirationTime < $currentTime) {
        error_log("Session expired - expires: $expirationTime, current: $currentTime");
        
        // EXTENDER LA SESIÓN AUTOMÁTICAMENTE si expiró hace menos de 1 hora
        $timeDiff = $currentTime - $expirationTime;
        if ($timeDiff < 3600) { // menos de 1 hora
            error_log("Auto-extending expired session");
            $newExpiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
            $extendSql = "UPDATE user_sessions SET expires_at = ?, last_accessed = NOW() WHERE session_token = ?";
            $extendStmt = $pdo->prepare($extendSql);
            $extendStmt->execute([$newExpiresAt, $sessionToken]);
            
            // Actualizar la sesión en memoria
            $session['expires_at'] = $newExpiresAt;
            error_log("Session extended to: " . $newExpiresAt);
        } else {
            // Sesión realmente expirada
            http_response_code(401);
            echo json_encode([
                'success' => false, 
                'error' => 'Session expired'
            ]);
            exit();
        }
    }
    
    // Verificar si el usuario está activo
    if (!$session['is_active']) {
        error_log("User not active");
        http_response_code(401);
        echo json_encode([
            'success' => false, 
            'error' => 'User account is deactivated'
        ]);
        exit();
    }
    
    // Obtener estadísticas de pedidos del usuario
    $orderStatsSql = "SELECT 
                        COUNT(*) as total_orders,
                        COALESCE(SUM(total_amount), 0) as total_spent,
                        MAX(created_at) as last_order_date
                      FROM orders 
                      WHERE user_id = ?";
    $statsStmt = $pdo->prepare($orderStatsSql);
    $statsStmt->execute([$session['user_id']]);
    $orderStats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // Obtener últimos pedidos
    $recentOrdersSql = "SELECT id, order_number, total_amount, status, created_at
                        FROM orders 
                        WHERE user_id = ? 
                        ORDER BY created_at DESC 
                        LIMIT 5";
    $recentStmt = $pdo->prepare($recentOrdersSql);
    $recentStmt->execute([$session['user_id']]);
    $recentOrders = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Actualizar último acceso Y extender sesión
    $newExpiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    $updateAccessSql = "UPDATE user_sessions SET last_accessed = NOW(), expires_at = ? WHERE session_token = ?";
    $updateStmt = $pdo->prepare($updateAccessSql);
    $updateStmt->execute([$newExpiresAt, $sessionToken]);
    
    error_log("User data retrieved successfully - session extended to: " . $newExpiresAt);
    
    echo json_encode([
        'success' => true,
        'user' => $session,
        'orderStats' => $orderStats,
        'recentOrders' => $recentOrders
    ]);
    
} catch (Exception $e) {
    error_log("Error in get_user.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error: ' . $e->getMessage()
    ]);
}

error_log("=== GET USER REQUEST END ===");
?>
