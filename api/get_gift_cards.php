<?php
require_once 'config.php';
require_once 'features.php';
setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// Paquete 3: apagado. Ver api/features.php
requireFeature('vales');

try {
    $pdo = getDBConnection();
    $onlyActive = ($_GET['all'] ?? '') !== '1';

    $sql = $onlyActive
        ? "SELECT * FROM gift_cards WHERE is_active = 1 ORDER BY amount ASC"
        : "SELECT * FROM gift_cards ORDER BY amount ASC";

    $stmt = $pdo->query($sql);
    $cards = $stmt->fetchAll();

    foreach ($cards as &$c) {
        $c['id']     = (int)$c['id'];
        $c['amount'] = (float)$c['amount'];
        $c['is_active'] = (int)$c['is_active'];
    }

    echo json_encode(['success' => true, 'gift_cards' => $cards, 'total' => count($cards)]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB error: ' . $e->getMessage()]);
}
?>
