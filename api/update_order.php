<?php
require_once 'config.php';
require_once 'features.php';

header('Content-Type: application/json');
setCORSHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Paquete 3: apagado. Ver api/features.php
requireFeature('pedidos');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $data = json_decode(file_get_contents('php://input'), true);

    $orderId = isset($data['id']) ? intval($data['id']) : null;
    $paymentStatus = isset($data['payment_status']) ? $data['payment_status'] : null;
    $status = isset($data['status']) ? $data['status'] : null;

    if (!$orderId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Order ID required']);
        exit();
    }

    $pdo = getDBConnection();

    $fields = [];
    $params = [];

    if ($paymentStatus && in_array($paymentStatus, ['pending', 'completed', 'failed'])) {
        $fields[] = "payment_status = ?";
        $params[] = $paymentStatus;
    }

    if ($status && in_array($status, ['pending', 'processing', 'completed', 'cancelled'])) {
        $fields[] = "status = ?";
        $params[] = $status;
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No valid fields to update']);
        exit();
    }

    $fields[] = "updated_at = NOW()";
    $params[] = $orderId;

    $sql = "UPDATE orders SET " . implode(', ', $fields) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit();
    }

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
