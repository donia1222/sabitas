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

    if (json_last_error() !== JSON_ERROR_NONE || !isset($data['ids']) || !is_array($data['ids'])) {
        throw new Exception('JSON inválido o falta el campo "ids"');
    }

    $ids = array_filter(array_map('intval', $data['ids']), fn($id) => $id > 0);

    if (count($ids) === 0) {
        throw new Exception('No se proporcionaron IDs válidos');
    }

    $pdo = getDBConnection();

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("DELETE FROM products WHERE id IN ($placeholders)");
    $stmt->execute(array_values($ids));
    $deleted = $stmt->rowCount();

    echo json_encode([
        'success' => true,
        'deleted' => $deleted,
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
}
?>
