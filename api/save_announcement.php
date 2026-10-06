<?php
ob_start();
register_shutdown_function(function() {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        ob_end_clean();
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => $e['message'], 'file' => basename($e['file']), 'line' => $e['line']]);
    }
});
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$method = $_SERVER['REQUEST_METHOD'];
$upload_dir = 'upload/';
$allowed = ['jpg','jpeg','png','gif','webp'];

try {
    $pdo = getDBConnection();
    $base = getUploadBaseUrl();

    // ── DELETE ─────────────────────────────────────────────────────────────
    if ($method === 'DELETE' || (isset($_GET['_method']) && $_GET['_method'] === 'DELETE')) {
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) throw new Exception('ID requerido');

        $stmt = $pdo->prepare("SELECT image1, image2 FROM announcements WHERE id=:id");
        $stmt->execute([':id' => $id]);
        $ann = $stmt->fetch();
        if (!$ann) throw new Exception('Anuncio no encontrado');

        $pdo->prepare("DELETE FROM announcements WHERE id=:id")->execute([':id' => $id]);

        foreach (['image1','image2'] as $f) {
            if ($ann[$f] && !preg_match('/^https?:\/\//', $ann[$f]) && file_exists($upload_dir . $ann[$f])) {
                unlink($upload_dir . $ann[$f]);
            }
        }
        echo json_encode(['success' => true, 'message' => 'Anuncio eliminado']);
        exit();
    }

    // ── POST ───────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $action = trim($_POST['action'] ?? 'save');

        // Toggle active
        if ($action === 'toggle') {
            $id = intval($_POST['id'] ?? 0);
            if ($id <= 0) throw new Exception('ID requerido');

            $stmt = $pdo->prepare("SELECT is_active FROM announcements WHERE id=:id");
            $stmt->execute([':id' => $id]);
            $ann = $stmt->fetch();
            if (!$ann) throw new Exception('Anuncio no encontrado');

            $new_active = $ann['is_active'] ? 0 : 1;
            if ($new_active) {
                $pdo->exec("UPDATE announcements SET is_active = 0");
            }
            $pdo->prepare("UPDATE announcements SET is_active=:active WHERE id=:id")
                ->execute([':active' => $new_active, ':id' => $id]);

            echo json_encode(['success' => true, 'is_active' => (bool)$new_active]);
            exit();
        }

        // Save (create or update)
        $id          = intval($_POST['id'] ?? 0);
        $type        = $_POST['type'] ?? 'general';
        if (!in_array($type, ['general', 'product'])) throw new Exception('Tipo inválido');
        $title       = trim($_POST['title'] ?? '');
        if (empty($title)) throw new Exception('Título requerido');
        $subtitle    = trim($_POST['subtitle'] ?? '') ?: null;
        $product_url = ($type === 'product') ? (trim($_POST['product_url'] ?? '') ?: null) : null;
        $show_once   = !empty($_POST['show_once']) ? 1 : 0;

        if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);

        $image_names = [null, null];
        if ($id > 0) {
            $stmt = $pdo->prepare("SELECT image1, image2 FROM announcements WHERE id=:id");
            $stmt->execute([':id' => $id]);
            $existing = $stmt->fetch();
            if ($existing) {
                $image_names[0] = $existing['image1'];
                $image_names[1] = $existing['image2'];
            }
        }

        $img_fields = ['image1', 'image2'];
        for ($i = 0; $i < 2; $i++) {
            $key = $img_fields[$i];
            if (!empty($_POST['remove_' . $key])) {
                if ($image_names[$i] && !preg_match('/^https?:\/\//', $image_names[$i]) && file_exists($upload_dir . $image_names[$i])) {
                    unlink($upload_dir . $image_names[$i]);
                }
                $image_names[$i] = null;
            }
            if (isset($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
                $ext = strtolower(pathinfo($_FILES[$key]['name'], PATHINFO_EXTENSION));
                if (!in_array($ext, $allowed)) throw new Exception("Tipo no permitido: imagen " . ($i+1));
                if ($_FILES[$key]['size'] > 8 * 1024 * 1024) throw new Exception("Imagen " . ($i+1) . " demasiado grande");
                if ($image_names[$i] && !preg_match('/^https?:\/\//', $image_names[$i]) && file_exists($upload_dir . $image_names[$i])) {
                    unlink($upload_dir . $image_names[$i]);
                }
                $name = uniqid() . '_' . time() . '_ann' . $i . '.' . $ext;
                if (!move_uploaded_file($_FILES[$key]['tmp_name'], $upload_dir . $name)) throw new Exception("Error subiendo imagen " . ($i+1));
                $image_names[$i] = $name;
            } elseif (!empty($_POST[$key . '_url']) && preg_match('/^https?:\/\//', $_POST[$key . '_url'])) {
                $image_names[$i] = trim($_POST[$key . '_url']);
            }
        }

        if ($id > 0) {
            $stmt = $pdo->prepare("UPDATE announcements SET type=:type, title=:title, subtitle=:subtitle, image1=:img1, image2=:img2, product_url=:purl, show_once=:once WHERE id=:id");
            $stmt->execute([':type' => $type, ':title' => $title, ':subtitle' => $subtitle, ':img1' => $image_names[0], ':img2' => $image_names[1], ':purl' => $product_url, ':once' => $show_once, ':id' => $id]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO announcements (type, title, subtitle, image1, image2, product_url, show_once, is_active) VALUES (:type, :title, :subtitle, :img1, :img2, :purl, :once, 0)");
            $stmt->execute([':type' => $type, ':title' => $title, ':subtitle' => $subtitle, ':img1' => $image_names[0], ':img2' => $image_names[1], ':purl' => $product_url, ':once' => $show_once]);
            $id = intval($pdo->lastInsertId());
        }

        $img1_url = $image_names[0] ? (preg_match('/^https?:\/\//', $image_names[0]) ? $image_names[0] : $base . $image_names[0]) : null;
        $img2_url = $image_names[1] ? (preg_match('/^https?:\/\//', $image_names[1]) ? $image_names[1] : $base . $image_names[1]) : null;

        echo json_encode(['success' => true, 'id' => $id, 'image1_url' => $img1_url, 'image2_url' => $img2_url]);
        exit();
    }

    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
