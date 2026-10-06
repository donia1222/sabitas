<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = getDBConnection();
    $upload_dir = 'upload/';
    $base = getUploadBaseUrl();
    $allowed = ['jpg','jpeg','png','gif','webp'];

    // ── DELETE ──────────────────────────────────────────────────────────────
    if ($method === 'DELETE' || (isset($_GET['_method']) && $_GET['_method'] === 'DELETE')) {
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) throw new Exception('ID requerido');

        $stmt = $pdo->prepare("SELECT hero_image,image2,image3,image4 FROM blog_posts WHERE id=:id");
        $stmt->execute([':id' => $id]);
        $post = $stmt->fetch();
        if (!$post) throw new Exception('Post no encontrado');

        $pdo->prepare("DELETE FROM blog_posts WHERE id=:id")->execute([':id' => $id]);

        foreach (['hero_image','image2','image3','image4'] as $f) {
            if ($post[$f] && file_exists($upload_dir . $post[$f])) unlink($upload_dir . $post[$f]);
        }
        echo json_encode(['success' => true, 'message' => 'Post eliminado']);
        exit();
    }

    // ── POST (edit via multipart) ────────────────────────────────────────────
    if ($method === 'POST') {
        $id      = intval($_POST['id'] ?? 0);
        $title   = trim($_POST['title']   ?? '');
        $content = trim($_POST['content'] ?? '');
        if ($id <= 0) throw new Exception('ID requerido');
        if (empty($title) || empty($content)) throw new Exception('Título y contenido requeridos');

        $stmt = $pdo->prepare("SELECT hero_image,image2,image3,image4 FROM blog_posts WHERE id=:id");
        $stmt->execute([':id' => $id]);
        $existing = $stmt->fetch();
        if (!$existing) throw new Exception('Post no encontrado');

        if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);

        $fields = ['hero_image','image2','image3','image4'];
        $image_names = [
            $existing['hero_image'],
            $existing['image2'],
            $existing['image3'],
            $existing['image4'],
        ];

        for ($i = 0; $i < 4; $i++) {
            $key = $fields[$i];
            $url_key = $key . '_url';
            // Remove image?
            if (!empty($_POST['remove_' . $key])) {
                if ($image_names[$i] && !preg_match('/^https?:\/\//', $image_names[$i]) && file_exists($upload_dir . $image_names[$i])) unlink($upload_dir . $image_names[$i]);
                $image_names[$i] = null;
            }
            // New file upload?
            if (isset($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($_FILES[$key]['name'], PATHINFO_EXTENSION));
                if (!in_array($ext, $allowed)) throw new Exception("Tipo no permitido: imagen " . ($i+1));
                if ($_FILES[$key]['size'] > 8 * 1024 * 1024) throw new Exception("Imagen " . ($i+1) . " demasiado grande");
                if ($image_names[$i] && !preg_match('/^https?:\/\//', $image_names[$i]) && file_exists($upload_dir . $image_names[$i])) unlink($upload_dir . $image_names[$i]);
                $name = uniqid() . '_' . time() . '_' . $i . '.' . $ext;
                if (!move_uploaded_file($_FILES[$key]['tmp_name'], $upload_dir . $name)) throw new Exception("Error subiendo imagen " . ($i+1));
                $image_names[$i] = $name;
            // New URL?
            } elseif (!empty($_POST[$url_key]) && preg_match('/^https?:\/\//', $_POST[$url_key])) {
                $image_names[$i] = trim($_POST[$url_key]);
            }
        }

        $stmt = $pdo->prepare("UPDATE blog_posts SET title=:title, content=:content, hero_image=:hero, image2=:img2, image3=:img3, image4=:img4 WHERE id=:id");
        $stmt->execute([
            ':title'   => $title,
            ':content' => $content,
            ':hero'    => $image_names[0],
            ':img2'    => $image_names[1],
            ':img3'    => $image_names[2],
            ':img4'    => $image_names[3],
            ':id'      => $id,
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Post actualizado',
            'image_urls' => array_map(fn($n) => $n ? $base . $n : null, $image_names),
        ]);
        exit();
    }

    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
