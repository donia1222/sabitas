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

error_log("=== LOGIN USER REQUEST START ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'not set'));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $pdo = getDBConnection();
    
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    error_log("Login input: " . $input);
    
    if (!$data) {
        throw new Exception('Invalid JSON data');
    }
    
    // Validar campos requeridos
    if (empty($data['email']) || empty($data['password'])) {
        throw new Exception('Email and password are required');
    }
    
    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    
    error_log("Login attempt for email: $email");
    
    // Buscar usuario por email
    $userSql = "SELECT id, email, password_hash, first_name, last_name, phone, 
                       address, city, postal_code, canton, notes, is_active
                FROM users WHERE email = ?";
    $userStmt = $pdo->prepare($userSql);
    $userStmt->execute([$email]);
    $user = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        error_log("User not found: $email");
        throw new Exception('Invalid email or password');
    }
    
    // Verificar si el usuario está activo
    if (!$user['is_active']) {
        error_log("User not active: $email");
        throw new Exception('User account is deactivated');
    }
    
    // Verificar contraseña
    if (!password_verify($password, $user['password_hash'])) {
        error_log("Invalid password for user: $email");
        throw new Exception('Invalid email or password');
    }
    
    error_log("Password verified for user: $email");
    
    // Generar nuevo token de sesión
    $sessionToken = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));
    
    // Verificar que el token es único
    $checkTokenSql = "SELECT id FROM user_sessions WHERE session_token = ?";
    $checkTokenStmt = $pdo->prepare($checkTokenSql);
    $checkTokenStmt->execute([$sessionToken]);
    
    $attempts = 0;
    while ($checkTokenStmt->fetch() && $attempts < 5) {
        $sessionToken = bin2hex(random_bytes(32));
        $checkTokenStmt->execute([$sessionToken]);
        $attempts++;
    }
    
    if ($attempts >= 5) {
        throw new Exception('Failed to generate unique session token');
    }
    
    // Crear nueva sesión
    $sessionSql = "INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_accessed) 
                   VALUES (?, ?, ?, NOW(), NOW())";
    $sessionStmt = $pdo->prepare($sessionSql);
    $sessionResult = $sessionStmt->execute([$user['id'], $sessionToken, $expiresAt]);
    
    if (!$sessionResult) {
        $errorInfo = $sessionStmt->errorInfo();
        error_log("Failed to create session: " . print_r($errorInfo, true));
        throw new Exception('Failed to create user session');
    }
    
    // Actualizar último login
    $updateLoginSql = "UPDATE users SET last_login = NOW() WHERE id = ?";
    $updateStmt = $pdo->prepare($updateLoginSql);
    $updateStmt->execute([$user['id']]);
    
    error_log("Login successful for user: $email");
    
    // Respuesta exitosa
    $response = [
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'firstName' => $user['first_name'],
            'lastName' => $user['last_name'],
            'phone' => $user['phone'],
            'address' => $user['address'],
            'city' => $user['city'],
            'postalCode' => $user['postal_code'],
            'canton' => $user['canton'],
            'notes' => $user['notes']
        ],
        'sessionToken' => $sessionToken
    ];
    
    error_log("Sending login response: " . json_encode($response));
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error in login_user.php: " . $e->getMessage());
    
    http_response_code(400);
    $errorResponse = [
        'success' => false,
        'error' => $e->getMessage()
    ];
    
    error_log("Sending login error response: " . json_encode($errorResponse));
    echo json_encode($errorResponse);
}

error_log("=== LOGIN USER REQUEST END ===");
?>
