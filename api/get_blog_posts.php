<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit(); }

try {
    $pdo = getDBConnection();
    $base = getUploadBaseUrl();

    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        if ($id <= 0) throw new Exception('ID inválido');

        $stmt = $pdo->prepare("SELECT * FROM blog_posts WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $post = $stmt->fetch();

        if (!$post) { http_response_code(404); echo json_encode(['success' => false, 'error' => 'Post no encontrado']); exit(); }

        $post['id'] = intval($post['id']);
        foreach (['hero_image','image2','image3','image4'] as $f) {
            $val = $post[$f];
            $post[$f . '_url'] = $val ? (preg_match('/^https?:\/\//', $val) ? $val : $base . $val) : null;
        }
        echo json_encode(['success' => true, 'post' => $post]);

    } else {
        $stmt = $pdo->query("SELECT * FROM blog_posts ORDER BY created_at DESC");
        $posts = $stmt->fetchAll();

        foreach ($posts as &$post) {
            $post['id'] = intval($post['id']);
            foreach (['hero_image','image2','image3','image4'] as $f) {
                $val = $post[$f];
                $post[$f . '_url'] = $val ? (preg_match('/^https?:\/\//', $val) ? $val : $base . $val) : null;
            }
        }
        echo json_encode(['success' => true, 'posts' => $posts, 'total' => count($posts)]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
