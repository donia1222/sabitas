<?php
require_once 'config.php';
setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

try {
    $pdo = getDBConnection();

    // Create tables if not exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS shipping_zones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        countries TEXT NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS shipping_weight_ranges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        min_kg DECIMAL(8,3) NOT NULL,
        max_kg DECIMAL(8,3) NOT NULL,
        label VARCHAR(120) NOT NULL
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS shipping_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        zone_id INT NOT NULL,
        range_id INT NOT NULL,
        price DECIMAL(8,2) NOT NULL DEFAULT 0,
        UNIQUE KEY zone_range (zone_id, range_id)
    )");

    // Safe migrations
    try { $pdo->exec("ALTER TABLE shipping_zones ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE products ADD COLUMN weight_kg DECIMAL(5,3) NOT NULL DEFAULT 0.500"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE shipping_weight_ranges MODIFY label VARCHAR(120) NOT NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE shipping_weight_ranges MODIFY max_kg DECIMAL(8,3) NOT NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE shipping_weight_ranges MODIFY min_kg DECIMAL(8,3) NOT NULL"); } catch (Exception $e) {}

    // Seed zones if empty
    if ($pdo->query("SELECT COUNT(*) FROM shipping_zones")->fetchColumn() == 0) {
        $pdo->exec("INSERT INTO shipping_zones (name, countries, enabled) VALUES
            ('Schweiz + Liechtenstein', 'CH,LI', 1),
            ('Europa', 'DE,FR,IT,AT,ES,NL,BE,PL,PT,CZ,DK,SE,FI,NO,HU,RO,HR,SK,SI,LU', 0),
            ('International', '*', 0)");
    }

    // Migrations: zones
    try { $pdo->exec("UPDATE shipping_zones SET enabled = 0 WHERE name IN ('Europa', 'International')"); } catch (Exception $e) {}
    try { $pdo->exec("UPDATE shipping_zones SET countries = 'CH,LI', name = 'Schweiz + Liechtenstein' WHERE countries = 'CH' OR (name = 'Schweiz' AND countries NOT LIKE '%LI%')"); } catch (Exception $e) {}
    try { $pdo->exec("UPDATE shipping_zones SET countries = REPLACE(REPLACE(countries, ',LI', ''), 'LI,', '') WHERE name IN ('Europa', 'International')"); } catch (Exception $e) {}

    // Migration: replace old weight ranges with new 4 package categories
    $rangeCount = intval($pdo->query("SELECT COUNT(*) FROM shipping_weight_ranges")->fetchColumn());
    if ($rangeCount !== 4) {
        try {
            $pdo->exec("DELETE FROM shipping_rates");
            $pdo->exec("DELETE FROM shipping_weight_ranges");
            $pdo->exec("INSERT INTO shipping_weight_ranges (min_kg, max_kg, label) VALUES
                (0,   2,   'PostPac Economy bis 2 kg'),
                (2,   10,  'PostPac Priority bis 10 kg'),
                (10,  30,  'PostPac bis 30 kg'),
                (30,  999, 'Sperrgut ab 30 kg')");

            $chZone = $pdo->query("SELECT id FROM shipping_zones WHERE countries LIKE '%CH%' AND enabled = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
            if ($chZone) {
                $newRanges = $pdo->query("SELECT id FROM shipping_weight_ranges ORDER BY min_kg")->fetchAll(PDO::FETCH_ASSOC);
                $defaultPrices = [9, 12, 21, 31];
                $ins = $pdo->prepare("INSERT IGNORE INTO shipping_rates (zone_id, range_id, price) VALUES (?, ?, ?)");
                foreach ($newRanges as $idx => $r) {
                    $ins->execute([$chZone['id'], $r['id'], $defaultPrices[$idx]]);
                }
            }
        } catch (Exception $e) {}
    }

    $zones = $pdo->query("SELECT id, name, countries, enabled FROM shipping_zones ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($zones as &$z) { $z['id'] = intval($z['id']); $z['enabled'] = (bool)$z['enabled']; }

    $ranges = $pdo->query("SELECT id, min_kg, max_kg, label FROM shipping_weight_ranges ORDER BY min_kg")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($ranges as &$r) { $r['id'] = intval($r['id']); $r['min_kg'] = floatval($r['min_kg']); $r['max_kg'] = floatval($r['max_kg']); }

    $rates = $pdo->query("SELECT zone_id, range_id, price FROM shipping_rates")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rates as &$rt) { $rt['zone_id'] = intval($rt['zone_id']); $rt['range_id'] = intval($rt['range_id']); $rt['price'] = floatval($rt['price']); }

    echo json_encode(['success' => true, 'zones' => $zones, 'ranges' => $ranges, 'rates' => $rates]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
