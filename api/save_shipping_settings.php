<?php
require_once 'config.php';
require_once 'features.php';
setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// Paquete 3: apagado. Ver api/features.php
requireFeature('envios');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit(); }

try {
    $pdo = getDBConnection();
    $body = json_decode(file_get_contents('php://input'), true);

    $zones  = $body['zones']  ?? [];
    $ranges = $body['ranges'] ?? [];
    $rates  = $body['rates']  ?? [];

    $pdo->beginTransaction();

    // Update zones (only enabled flag — zones are fixed)
    foreach ($zones as $z) {
        $stmt = $pdo->prepare("UPDATE shipping_zones SET enabled = :enabled WHERE id = :id");
        $stmt->execute([':enabled' => $z['enabled'] ? 1 : 0, ':id' => intval($z['id'])]);
    }

    // Replace rates completely
    $pdo->exec("DELETE FROM shipping_rates");
    $stmt = $pdo->prepare("INSERT INTO shipping_rates (zone_id, range_id, price) VALUES (:zone_id, :range_id, :price)");
    foreach ($rates as $r) {
        if (floatval($r['price']) > 0) {
            $stmt->execute([
                ':zone_id'  => intval($r['zone_id']),
                ':range_id' => intval($r['range_id']),
                ':price'    => floatval($r['price']),
            ]);
        }
    }

    $pdo->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
