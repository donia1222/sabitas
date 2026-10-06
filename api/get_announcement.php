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
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit(); }

try {
    $pdo = getDBConnection();
    $base = getUploadBaseUrl();

    if (isset($_GET['active'])) {
        $stmt = $pdo->query("SELECT * FROM announcements WHERE is_active = 1 LIMIT 1");
        $ann = $stmt->fetch();
        if (!$ann) { echo json_encode(['success' => true, 'announcement' => null]); exit(); }
        $ann['is_active'] = (bool)$ann['is_active'];
        $ann['show_once']  = (bool)$ann['show_once'];
        foreach (['image1','image2'] as $f) {
            $val = $ann[$f];
            $ann[$f . '_url'] = $val ? (preg_match('/^https?:\/\//', $val) ? $val : $base . $val) : null;
        }
        echo json_encode(['success' => true, 'announcement' => $ann]);
    } else {
        $stmt = $pdo->query("SELECT * FROM announcements ORDER BY created_at DESC");
        $anns = $stmt->fetchAll();
        foreach ($anns as &$ann) {
            $ann['is_active'] = (bool)$ann['is_active'];
            $ann['show_once']  = (bool)$ann['show_once'];
            foreach (['image1','image2'] as $f) {
                $val = $ann[$f];
                $ann[$f . '_url'] = $val ? (preg_match('/^https?:\/\//', $val) ? $val : $base . $val) : null;
            }
        }
        echo json_encode(['success' => true, 'announcements' => $anns, 'total' => count($anns)]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
