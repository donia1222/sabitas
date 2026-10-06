<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit(); }

try {
    $pdo = getDBConnection();
    $base = getUploadBaseUrl();

    $stmt = $pdo->query("SELECT * FROM gallery_images ORDER BY created_at DESC");
    $images = $stmt->fetchAll();

    foreach ($images as &$img) {
        $img['id'] = intval($img['id']);
        $val = $img['image'];
        $img['image_url'] = $val ? (preg_match('/^https?:\/\//', $val) ? $val : $base . $val) : null;
    }

    echo json_encode(['success' => true, 'images' => $images, 'total' => count($images)]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
