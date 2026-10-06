<?php
require_once 'config.php';
require_once 'features.php';
setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// Paquete 3: apagado. Ver api/features.php
requireFeature('vales');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success' => false, 'error' => 'Method not allowed']); exit(); }

try {
    $pdo  = getDBConnection();
    $name = trim($_POST['name'] ?? '');
    $desc = trim($_POST['description'] ?? '');
    $amount = floatval($_POST['amount'] ?? 0);
    $is_active = intval($_POST['is_active'] ?? 1);

    if ($name === '' || $amount <= 0) {
        throw new Exception('Name und Betrag sind erforderlich');
    }

    $stmt = $pdo->prepare(
        "INSERT INTO gift_cards (name, description, amount, is_active) VALUES (:name, :desc, :amount, :active)"
    );
    $stmt->execute([':name' => $name, ':desc' => $desc, ':amount' => $amount, ':active' => $is_active]);

    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB error: ' . $e->getMessage()]);
}
?>
