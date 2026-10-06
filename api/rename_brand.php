<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit();
}

try {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON inválido');
    }

    $oldName = isset($data['old_name']) ? trim($data['old_name']) : '';
    $newName = isset($data['new_name']) ? trim($data['new_name']) : '';

    if ($oldName === '' || $newName === '') {
        throw new Exception('old_name y new_name son obligatorios');
    }

    $pdo = getDBConnection();
    $stmt = $pdo->prepare("UPDATE products SET origin = :new WHERE origin = :old");
    $stmt->execute([':new' => $newName, ':old' => $oldName]);

    echo json_encode([
        'success'  => true,
        'updated'  => $stmt->rowCount(),
        'old_name' => $oldName,
        'new_name' => $newName,
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
}
?>
