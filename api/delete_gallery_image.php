<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'DELETE' && !(isset($_GET['_method']) && $_GET['_method'] === 'DELETE')) {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit();
}

try {
    $pdo = getDBConnection();
    $upload_dir = 'upload/';

    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) throw new Exception('ID requerido');

    $stmt = $pdo->prepare("SELECT image FROM gallery_images WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $img = $stmt->fetch();
    if (!$img) throw new Exception('Bild nicht gefunden');

    $pdo->prepare("DELETE FROM gallery_images WHERE id = :id")->execute([':id' => $id]);

    if ($img['image'] && !preg_match('/^https?:\/\//', $img['image']) && file_exists($upload_dir . $img['image'])) {
        unlink($upload_dir . $img['image']);
    }

    echo json_encode(['success' => true, 'message' => 'Bild gelöscht']);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
