<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

try {
    $pdo = getDBConnection();

    // Auto-migración: tabla key-value para textos/imágenes del sitio
    $pdo->exec("CREATE TABLE IF NOT EXISTS site_content (
        skey VARCHAR(64) NOT NULL,
        svalue MEDIUMTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (skey)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $base = getUploadBaseUrl();

    $rows = $pdo->query("SELECT skey, svalue FROM site_content")->fetchAll(PDO::FETCH_ASSOC);

    $settings = [];
    foreach ($rows as $r) {
        $settings[$r['skey']] = $r['svalue'];
    }

    // Resolver URLs de las imágenes del hero
    foreach (['hero_image_1', 'hero_image_2', 'hero_image_3'] as $imgKey) {
        $val = $settings[$imgKey] ?? '';
        if ($val !== '') {
            $settings[$imgKey . '_url'] = preg_match('/^https?:\/\//', $val) ? $val : $base . $val;
        }
    }

    echo json_encode(['success' => true, 'settings' => $settings], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
