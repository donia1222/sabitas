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
error_log("=== CHANGE PASSWORD REQUEST START ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'not set'));

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
    if (empty($data['sessionToken'])) {
        throw new Exception('Session token is required');
    }
    
    if (empty($data['currentPassword'])) {
        throw new Exception('Current password is required');
    }
    
    if (empty($data['newPassword'])) {
        throw new Exception('New password is required');
    }
    
    if (empty($data['confirmPassword'])) {
        throw new Exception('Password confirmation is required');
    }
    
    $sessionToken = $data['sessionToken'];
    $currentPassword = $data['currentPassword'];
    $newPassword = $data['newPassword'];
    $confirmPassword = $data['confirmPassword'];
    
    // Validar que las nuevas contraseñas coincidan
    if ($newPassword !== $confirmPassword) {
        throw new Exception('New passwords do not match');
    }
    
    // Validar longitud mínima de la nueva contraseña
    if (strlen($newPassword) < 8) {
        throw new Exception('New password must be at least 8 characters long');
    }
    
    // Validar que la nueva contraseña sea diferente a la actual
    if ($currentPassword === $newPassword) {
        throw new Exception('New password must be different from current password');
    }
    
    error_log("Processing password change for session: " . substr($sessionToken, 0, 10) . "...");
    
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
    $currentPasswordHash = $sessionData['password_hash'];
    
    error_log("Found user ID: $userId, Email: $userEmail");
    
    // Verificar contraseña actual
    if (!password_verify($currentPassword, $currentPasswordHash)) {
        error_log("Current password verification failed for user: $userEmail");
        http_response_code(401);
        throw new Exception('Current password is incorrect');
    }
    
    error_log("Current password verification successful");
    
    // Generar hash de la nueva contraseña
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Actualizar la contraseña en la base de datos
    $updatePasswordSql = "UPDATE users 
                         SET password_hash = ?, 
                             updated_at = NOW() 
                         WHERE id = ?";
    
    $updatePasswordStmt = $pdo->prepare($updatePasswordSql);
    $updatePasswordStmt->execute([$newPasswordHash, $userId]);
    
    $rowsAffected = $updatePasswordStmt->rowCount();
    
    if ($rowsAffected === 0) {
        throw new Exception('Failed to update password');
    }
    
    error_log("Password updated successfully for user: $userEmail");
    
    // Opcional: Invalidar todas las sesiones existentes excepto la actual
    // (por seguridad, para cerrar sesión en otros dispositivos)
    $invalidateOtherSessionsSql = "UPDATE user_sessions 
                                  SET expires_at = NOW() 
                                  WHERE user_id = ? AND session_token != ?";
    
    $invalidateStmt = $pdo->prepare($invalidateOtherSessionsSql);
    $invalidateStmt->execute([$userId, $sessionToken]);
    $invalidatedSessions = $invalidateStmt->rowCount();
    
    error_log("Invalidated $invalidatedSessions other sessions for security");
    
    // Respuesta exitosa
    $response = [
        'success' => true,
        'message' => 'Password changed successfully',
        'data' => [
            'user_id' => $userId,
            'email' => $userEmail,
            'updated_at' => date('Y-m-d H:i:s'),
            'invalidated_sessions' => $invalidatedSessions
        ]
    ];
    
    error_log("Sending success response: " . json_encode($response));
    echo json_encode($response);
    
} catch (Exception $e) {
    error_log("Error in change_password.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Determinar código de respuesta HTTP apropiado
    $httpCode = 400;
    if (strpos($e->getMessage(), 'Invalid or expired session') !== false || 
        strpos($e->getMessage(), 'Current password is incorrect') !== false) {
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

error_log("=== CHANGE PASSWORD REQUEST END ===");
?>