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
error_log("=== RESET PASSWORD REQUEST START ===");
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'not set'));

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Función para generar contraseña aleatoria de 8 caracteres
function generateRandomPassword($length = 8) {
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $password = '';
    $charactersLength = strlen($characters);
    
    for ($i = 0; $i < $length; $i++) {
        $password .= $characters[rand(0, $charactersLength - 1)];
    }
    
    return $password;
}

// Función para enviar email
function sendPasswordResetEmail($email, $firstName, $newPassword) {
    $to = $email;
    $subject = "Ihr neues Passwort - Lichtbild";
    $from = "noreply@lichtbild.ch";
    
    // Crear el mensaje HTML
    $message = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>Neues Passwort</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316, #dc2626); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .password-box { background: #fff; border: 2px solid #f97316; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }
            .password { font-size: 24px; font-weight: bold; color: #dc2626; letter-spacing: 2px; }
            .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Lichtbild</h1>
                <h2>Passwort zurückgesetzt</h2>
            </div>
            <div class='content'>
                <p>Hallo " . htmlspecialchars($firstName) . ",</p>
                
                <p>Sie haben eine Passwort-Zurücksetzung für Ihr Konto angefordert. Ihr neues temporäres Passwort lautet:</p>
                
                <div class='password-box'>
                    <div class='password'>" . htmlspecialchars($newPassword) . "</div>
                </div>
                
                <div class='warning'>
                    <strong>⚠️ Wichtige Sicherheitshinweise:</strong>
                    <ul>
                        <li>Melden Sie sich sofort mit diesem Passwort an</li>
                        <li>Ändern Sie das Passwort nach der Anmeldung in Ihrem Profil</li>
                        <li>Teilen Sie dieses Passwort niemals mit anderen</li>
                        <li>Löschen Sie diese E-Mail nach der Verwendung</li>
                    </ul>
                </div>
                
                <p><strong>So melden Sie sich an:</strong></p>
                <ol>
                    <li>Gehen Sie zur Anmeldeseite</li>
                    <li>Geben Sie Ihre E-Mail ein: <strong>" . htmlspecialchars($email) . "</strong></li>
                    <li>Verwenden Sie das oben stehende temporäre Passwort</li>
                    <li>Gehen Sie zu Ihrem Profil und ändern Sie das Passwort</li>
                </ol>
                
                <p>Falls Sie diese Passwort-Zurücksetzung nicht angefordert haben, kontaktieren Sie uns bitte umgehend.</p>
                
                <p>Mit freundlichen Grüßen,<br>
                Ihr Lichtbild Team</p>
            </div>
            <div class='footer'>
                <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.</p>
                <p>© Lichtbild - info@lichtbild.ch</p>
            </div>
        </div>
    </body>
    </html>
    ";
    
    // Headers für HTML-Email
    $headers = array(
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: Lichtbild <' . $from . '>',
        'Reply-To: ' . $from,
        'X-Mailer: PHP/' . phpversion()
    );
    
    // Email senden
    $result = mail($to, $subject, $message, implode("\r\n", $headers));
    
    error_log("Email sent to $to: " . ($result ? 'SUCCESS' : 'FAILED'));
    
    return $result;
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
    
    // Validar campo requerido
    if (empty($data['email'])) {
        throw new Exception('E-Mail-Adresse ist erforderlich');
    }
    
    $email = trim(strtolower($data['email']));
    
    // Validar formato de email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Ungültige E-Mail-Adresse');
    }
    
    error_log("Processing password reset for email: $email");
    
    // Verificar si el usuario existe
    $userSql = "SELECT id, email, first_name, last_name FROM users WHERE email = ? AND is_active = 1";
    $userStmt = $pdo->prepare($userSql);
    $userStmt->execute([$email]);
    $userData = $userStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$userData) {
        error_log("User not found or inactive for email: $email");
        // Por seguridad, no revelamos si el email existe o no
        // Enviamos la misma respuesta exitosa
        echo json_encode([
            'success' => true,
            'message' => 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein neues Passwort gesendet.'
        ]);
        exit();
    }
    
    $userId = $userData['id'];
    $firstName = $userData['first_name'];
    
    error_log("Found user ID: $userId, Name: $firstName");
    
    // Generar nueva contraseña de 8 caracteres
    $newPassword = generateRandomPassword(8);
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    
    error_log("Generated new password for user: $email");
    
    // Iniciar transacción
    $pdo->beginTransaction();
    
    try {
        // Actualizar la contraseña en la base de datos
        $updatePasswordSql = "UPDATE users 
                             SET password_hash = ?, 
                                 updated_at = NOW() 
                             WHERE id = ?";
        
        $updatePasswordStmt = $pdo->prepare($updatePasswordSql);
        $updatePasswordStmt->execute([$newPasswordHash, $userId]);
        
        $rowsAffected = $updatePasswordStmt->rowCount();
        
        if ($rowsAffected === 0) {
            throw new Exception('Failed to update password in database');
        }
        
        error_log("Password updated in database for user: $email");
        
        // Invalidar todas las sesiones existentes por seguridad
        $invalidateSessionsSql = "UPDATE user_sessions 
                                 SET expires_at = NOW() 
                                 WHERE user_id = ?";
        
        $invalidateStmt = $pdo->prepare($invalidateSessionsSql);
        $invalidateStmt->execute([$userId]);
        $invalidatedSessions = $invalidateStmt->rowCount();
        
        error_log("Invalidated $invalidatedSessions sessions for security");
        
        // Enviar email con la nueva contraseña
        $emailSent = sendPasswordResetEmail($email, $firstName, $newPassword);
        
        if (!$emailSent) {
            throw new Exception('Failed to send password reset email');
        }
        
        error_log("Password reset email sent successfully to: $email");
        
        // Confirmar transacción
        $pdo->commit();
        
        // Respuesta exitosa
        $response = [
            'success' => true,
            'message' => 'Ein neues Passwort wurde an Ihre E-Mail-Adresse gesendet.',
            'data' => [
                'email' => $email,
                'invalidated_sessions' => $invalidatedSessions,
                'email_sent' => true
            ]
        ];
        
        error_log("Password reset completed successfully for: $email");
        echo json_encode($response);
        
    } catch (Exception $e) {
        // Revertir transacción en caso de error
        $pdo->rollBack();
        error_log("Transaction rolled back due to error: " . $e->getMessage());
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error in reset_password.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(400);
    $errorResponse = [
        'success' => false,
        'error' => $e->getMessage()
    ];
    
    error_log("Sending error response: " . json_encode($errorResponse));
    echo json_encode($errorResponse);
}

error_log("=== RESET PASSWORD REQUEST END ===");
?>
