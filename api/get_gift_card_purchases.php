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

    $stmt = $pdo->query(
        "SELECT gcp.*, gc.name AS gift_card_name, o.order_number
         FROM gift_card_purchases gcp
         LEFT JOIN gift_cards gc ON gc.id = gcp.gift_card_id
         LEFT JOIN orders o ON o.id = gcp.order_id
         ORDER BY gcp.created_at DESC"
    );
    $purchases = $stmt->fetchAll();

    foreach ($purchases as &$p) {
        $p['id']           = (int)$p['id'];
        $p['order_id']     = (int)$p['order_id'];
        $p['gift_card_id'] = (int)$p['gift_card_id'];
        $p['amount']       = (float)$p['amount'];
    }

    echo json_encode(['success' => true, 'purchases' => $purchases, 'total' => count($purchases)]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB error: ' . $e->getMessage()]);
}
?>
