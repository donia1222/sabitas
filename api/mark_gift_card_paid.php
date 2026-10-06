<?php
require_once 'config.php';
require_once 'features.php';
require_once 'gift_card_functions.php';
setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// Paquete 3: apagado. Ver api/features.php
requireFeature('vales');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success' => false, 'error' => 'Method not allowed']); exit(); }

try {
    $body = json_decode(file_get_contents('php://input'), true);
    $purchaseId = intval($body['id'] ?? 0);
    if ($purchaseId <= 0) throw new Exception('ID erforderlich');

    $pdo = getDBConnection();
    $pdo->beginTransaction();

    // Obtener la compra
    $stmt = $pdo->prepare("SELECT * FROM gift_card_purchases WHERE id = :id");
    $stmt->execute([':id' => $purchaseId]);
    $purchase = $stmt->fetch();

    if (!$purchase) throw new Exception('Kauf nicht gefunden');
    if ($purchase['status'] === 'aktiv') throw new Exception('Bereits bezahlt');

    $date = date('d.m.Y');

    // Obtener order_number del pedido
    $stmtOrd = $pdo->prepare("SELECT order_number FROM orders WHERE id = :id");
    $stmtOrd->execute([':id' => $purchase['order_id']]);
    $orderNumber = (string)($stmtOrd->fetchColumn() ?: $purchase['order_id']);

    // Guardar order_number como código y activar
    $upd = $pdo->prepare(
        "UPDATE gift_card_purchases SET code = :code, status = 'aktiv', paid_at = NOW() WHERE id = :id"
    );
    $upd->execute([':code' => $orderNumber, ':id' => $purchaseId]);
    $code = $orderNumber;

    // Actualizar también el pedido como pagado
    $updOrder = $pdo->prepare(
        "UPDATE orders SET payment_status = 'completed' WHERE id = :order_id"
    );
    $updOrder->execute([':order_id' => $purchase['order_id']]);

    $pdo->commit();

    $buyerName  = $purchase['buyer_name']  ?? 'Kunde';
    $buyerEmail = $purchase['buyer_email'] ?? '';
    $amount     = (float)$purchase['amount'];

    // Email 1: al comprador con el gutschein + PDF
    if (!empty($buyerEmail)) {
        sendGiftCardEmail($buyerEmail, $buyerName, $code, $amount, $date);
    }

    // Email 2: al vendedor — confirmación de envío
    sendGiftCardSellerNotification($code, $amount, $buyerName, $buyerEmail, $date, true);

    echo json_encode([
        'success' => true,
        'code'    => $code,
        'message' => 'Gutschein wurde als bezahlt markiert und E-Mails wurden versendet'
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB error: ' . $e->getMessage()]);
}
?>
