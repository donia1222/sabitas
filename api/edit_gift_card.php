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

    // DELETE
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        parse_str(file_get_contents('php://input'), $input);
        $id = intval($input['id'] ?? 0);
        if ($id <= 0) throw new Exception('ID erforderlich');

        $pdo->prepare("DELETE FROM gift_cards WHERE id = :id")->execute([':id' => $id]);
        echo json_encode(['success' => true]);
        exit();
    }

    // POST = editar
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success' => false, 'error' => 'Method not allowed']); exit(); }

    $id        = intval($_POST['id'] ?? 0);
    $name      = trim($_POST['name'] ?? '');
    $desc      = trim($_POST['description'] ?? '');
    $amount    = floatval($_POST['amount'] ?? 0);
    $is_active = intval($_POST['is_active'] ?? 1);

    if ($id <= 0 || $name === '' || $amount <= 0) {
        throw new Exception('ID, Name und Betrag sind erforderlich');
    }

    $stmt = $pdo->prepare(
        "UPDATE gift_cards SET name=:name, description=:desc, amount=:amount, is_active=:active WHERE id=:id"
    );
    $stmt->execute([':name' => $name, ':desc' => $desc, ':amount' => $amount, ':active' => $is_active, ':id' => $id]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB error: ' . $e->getMessage()]);
}
?>
