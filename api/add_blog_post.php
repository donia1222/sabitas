<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit(); }

try {
    $pdo = getDBConnection();

    $title   = trim($_POST['title']   ?? '');
    $content = trim($_POST['content'] ?? '');

    if (empty($title) || empty($content)) throw new Exception('Título y contenido son requeridos');

    $upload_dir = 'upload/';
    if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);

    $image_names = [null, null, null, null];
    $fields = ['hero_image', 'image2', 'image3', 'image4'];
    $allowed = ['jpg','jpeg','png','gif','webp'];

    for ($i = 0; $i < 4; $i++) {
        $key = $fields[$i];
        $url_key = $key . '_url';
        if (isset($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES[$key]['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $allowed)) throw new Exception("Tipo no permitido: imagen " . ($i+1));
            if ($_FILES[$key]['size'] > 8 * 1024 * 1024) throw new Exception("Imagen " . ($i+1) . " demasiado grande (máx 8MB)");
            $name = uniqid() . '_' . time() . '_' . $i . '.' . $ext;
            if (!move_uploaded_file($_FILES[$key]['tmp_name'], $upload_dir . $name)) throw new Exception("Error subiendo imagen " . ($i+1));
            $image_names[$i] = $name;
        } elseif (!empty($_POST[$url_key]) && preg_match('/^https?:\/\//', $_POST[$url_key])) {
            $image_names[$i] = trim($_POST[$url_key]);
        }
    }

    $stmt = $pdo->prepare("INSERT INTO blog_posts (title, content, hero_image, image2, image3, image4) VALUES (:title, :content, :hero, :img2, :img3, :img4)");
    $stmt->execute([
        ':title'   => $title,
        ':content' => $content,
        ':hero'    => $image_names[0],
        ':img2'    => $image_names[1],
        ':img3'    => $image_names[2],
        ':img4'    => $image_names[3],
    ]);

    $base = getUploadBaseUrl();
    echo json_encode([
        'success' => true,
        'message' => 'Post creado',
        'post_id' => intval($pdo->lastInsertId()),
        'image_urls' => array_map(fn($n) => $n ? $base . $n : null, $image_names),
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
