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
    $pdo  = getDBConnection();
    $body = json_decode(file_get_contents('php://input'), true);

    $country    = strtoupper(trim($body['country'] ?? 'CH'));
    $weight_kg  = floatval($body['weight_kg'] ?? 0.5);

    // Load only enabled zones
    $zones = $pdo->query("SELECT id, name, countries FROM shipping_zones WHERE enabled = 1 ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);

    // Detect zone: exact match first, then wildcard
    $matched_zone = null;
    $wildcard_zone = null;

    foreach ($zones as $z) {
        if ($z['countries'] === '*') {
            $wildcard_zone = $z;
            continue;
        }
        $list = array_map('trim', explode(',', $z['countries']));
        if (in_array($country, $list) || ($country === 'OTHER' && false)) {
            $matched_zone = $z;
            break;
        }
    }

    // "OTHER" maps to wildcard/international
    if ($country === 'OTHER') {
        $matched_zone = $wildcard_zone;
    }

    if (!$matched_zone) {
        $matched_zone = $wildcard_zone;
    }

    if (!$matched_zone) {
        echo json_encode(['success' => false, 'error' => 'No active zone found for country: ' . $country]);
        exit();
    }

    // Find weight range
    $stmt = $pdo->prepare("SELECT id, label FROM shipping_weight_ranges WHERE min_kg <= :w AND max_kg > :w ORDER BY min_kg LIMIT 1");
    $stmt->execute([':w' => $weight_kg]);
    $range = $stmt->fetch(PDO::FETCH_ASSOC);

    // Fallback: use largest range (Sperrgut)
    if (!$range) {
        $range = $pdo->query("SELECT id, label FROM shipping_weight_ranges ORDER BY max_kg DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    }

    if (!$range) {
        echo json_encode(['success' => false, 'error' => 'No weight range found']);
        exit();
    }

    // Find rate
    $stmt = $pdo->prepare("SELECT price FROM shipping_rates WHERE zone_id = :zone_id AND range_id = :range_id LIMIT 1");
    $stmt->execute([':zone_id' => intval($matched_zone['id']), ':range_id' => intval($range['id'])]);
    $rate = $stmt->fetch(PDO::FETCH_ASSOC);

    $price = $rate ? floatval($rate['price']) : 0;

    echo json_encode([
        'success' => true,
        'price'   => $price,
        'zone'    => $matched_zone['name'],
        'range'   => $range['label'],
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
