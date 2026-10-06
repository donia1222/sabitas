<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $pdo = getDBConnection();

    $pdo->exec("CREATE TABLE IF NOT EXISTS site_content (
        skey VARCHAR(64) NOT NULL,
        svalue MEDIUMTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (skey)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $upsert = $pdo->prepare("INSERT INTO site_content (skey, svalue) VALUES (:k, :v)
                             ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)");

    // 1) Guardar campos de texto (todo lo que venga en POST excepto archivos)
    foreach ($_POST as $key => $value) {
        // Solo claves conocidas (footer_* y hero_*) por seguridad
        if (preg_match('/^(footer_|hero_)[a-z0-9_]+$/i', $key)) {
            $upsert->execute([':k' => $key, ':v' => is_string($value) ? $value : '']);
        }
    }

    // 2) Subir imágenes del hero (si vienen)
    $upload_dir = 'upload/';
    if (!is_dir($upload_dir)) { mkdir($upload_dir, 0755, true); }
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    foreach (['hero_image_1', 'hero_image_2', 'hero_image_3'] as $imgKey) {
        if (isset($_FILES[$imgKey]) && $_FILES[$imgKey]['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES[$imgKey]['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $allowed)) {
                throw new Exception("Bildformat nicht erlaubt ($imgKey). Erlaubt: " . implode(', ', $allowed));
            }
            if ($_FILES[$imgKey]['size'] > 5 * 1024 * 1024) {
                throw new Exception("Bild zu gross ($imgKey). Maximal 5MB");
            }
            $name = uniqid() . '_' . time() . '_' . $imgKey . '.' . $ext;
            if (!move_uploaded_file($_FILES[$imgKey]['tmp_name'], $upload_dir . $name)) {
                throw new Exception("Fehler beim Hochladen ($imgKey)");
            }
            $upsert->execute([':k' => $imgKey, ':v' => $name]);
        }
    }

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
