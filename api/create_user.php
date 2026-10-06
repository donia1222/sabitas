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
error_log("=== CREATE USER REQUEST START ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'not set'));
error_log("Headers: " . print_r(getallheaders(), true));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
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
    $required_fields = ['email', 'password', 'firstName', 'lastName'];
    foreach ($required_fields as $field) {
        if (empty($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    $firstName = trim($data['firstName']);
    $lastName = trim($data['lastName']);
    $phone = $data['phone'] ?? '';
    $address = $data['address'] ?? '';
    $city = $data['city'] ?? '';
    $postalCode = $data['postalCode'] ?? '';
    $canton = $data['canton'] ?? '';
    $notes = $data['notes'] ?? '';
    
    error_log("Processing user: $email");
    
    // Validar email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    // Validar contraseña (mínimo 6 caracteres)
    if (strlen($password) < 6) {
        throw new Exception('Password must be at least 6 characters long');
    }
    
    // Verificar si el email ya existe
    $checkEmailSql = "SELECT id FROM users WHERE email = ?";
    $checkStmt = $pdo->prepare($checkEmailSql);
    $checkStmt->execute([$email]);
    
    if ($checkStmt->fetch()) {
        throw new Exception('Email already exists');
    }
    
    error_log("Email validation passed");
    
    // Hash de la contraseña
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // Insertar usuario
    $insertSql = "INSERT INTO users (
        email, password_hash, first_name, last_name, phone, 
        address, city, postal_code, canton, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $insertStmt = $pdo->prepare($insertSql);
    $result = $insertStmt->execute([
        $email, $passwordHash, $firstName, $lastName, $phone,
        $address, $city, $postalCode, $canton, $notes
    ]);
    
    if (!$result) {
        $errorInfo = $insertStmt->errorInfo();
        error_log("Failed to insert user: " . print_r($errorInfo, true));
        throw new Exception('Failed to create user: ' . $errorInfo[2]);
    }
    
    $userId = $pdo->lastInsertId();
    error_log("User created with ID: $userId");
    
    // Generar token de sesión
    $sessionToken = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

    // Verificar que el token es único
    $checkTokenSql = "SELECT id FROM user_sessions WHERE session_token = ?";
    $checkTokenStmt = $pdo->prepare($checkTokenSql);
    $checkTokenStmt->execute([$sessionToken]);

    // Si el token ya existe, generar uno nuevo
    $attempts = 0;
    while ($checkTokenStmt->fetch() && $attempts < 5) {
        $sessionToken = bin2hex(random_bytes(32));
        $checkTokenStmt->execute([$sessionToken]);
        $attempts++;
    }

    if ($attempts >= 5) {
        throw new Exception('Failed to generate unique session token');
    }

    $sessionSql = "INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_accessed) VALUES (?, ?, ?, NOW(), NOW())";
    $sessionStmt = $pdo->prepare($sessionSql);
    $sessionResult = $sessionStmt->execute([$userId, $sessionToken, $expiresAt]);

    if (!$sessionResult) {
        $errorInfo = $sessionStmt->errorInfo();
        error_log("Failed to create session: " . print_r($errorInfo, true));
        throw new Exception('Failed to create user session: ' . $errorInfo[2]);
    }

    error_log("Session created with token: " . substr($sessionToken, 0, 10) . "...");

    // Verificar que el token se guardó correctamente
    $verifySql = "SELECT id FROM user_sessions WHERE session_token = ? AND user_id = ?";
    $verifyStmt = $pdo->prepare($verifySql);
    $verifyStmt->execute([$sessionToken, $userId]);
    $verifyResult = $verifyStmt->fetch();

    if (!$verifyResult) {
        error_log("Token verification failed");
        throw new Exception('Token creation verification failed');
    }

    error_log("User creation completed successfully");
    
    // Respuesta exitosa
    $response = [
        'success' => true,
        'message' => 'User created successfully',
        'user' => [
            'id' => $userId,
            'email' => $email,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'phone' => $phone,
            'address' => $address,
            'city' => $city,
            'postalCode' => $postalCode,
            'canton' => $canton,
            'notes' => $notes
        ],
        'sessionToken' => $sessionToken
    ];
    
    error_log("Sending response: " . json_encode($response));
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error in create_user.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(400);
    $errorResponse = [
        'success' => false,
        'error' => $e->getMessage()
    ];
    
    error_log("Sending error response: " . json_encode($errorResponse));
    echo json_encode($errorResponse);
}

error_log("=== CREATE USER REQUEST END ===");
?>
