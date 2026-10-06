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

    if (!$orderId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Order ID required']);
        exit();
    }

    $pdo = getDBConnection();

    // Obtener datos del pedido
    $stmt = $pdo->prepare("SELECT o.*, GROUP_CONCAT(
        CONCAT(oi.product_name, '|', oi.quantity, '|', oi.price)
        ORDER BY oi.id SEPARATOR ';;'
    ) as items_raw
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = ?
    GROUP BY o.id");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit();
    }

    // Parsear items
    $items = [];
    if (!empty($order['items_raw'])) {
        foreach (explode(';;', $order['items_raw']) as $itemStr) {
            $parts = explode('|', $itemStr);
            if (count($parts) >= 3) {
                $items[] = [
                    'name'     => $parts[0],
                    'quantity' => $parts[1],
                    'price'    => $parts[2],
                ];
            }
        }
    }

    $fromEmail    = 'info@lichtbild.ch';
    $toCustomer   = $order['customer_email'];
    $orderNumber  = $order['order_number'];
    $firstName    = $order['customer_first_name'];
    $lastName     = $order['customer_last_name'];
    $total        = number_format((float)$order['total_amount'], 2, '.', "'");

    // Construir lista de productos
    $itemsHtml = '';
    foreach ($items as $item) {
        $itemsHtml .= "
        <div style='border-bottom:1px solid #eee;padding:8px 0;'>
            <p style='margin:0;'><strong>{$item['name']}</strong></p>
            <p style='margin:2px 0;color:#555;font-size:14px;'>Menge: {$item['quantity']} × {$item['price']} CHF</p>
        </div>";
    }

    $emailHtml = "
    <!DOCTYPE html>
    <html>
    <head><meta charset='UTF-8'></head>
    <body style='font-family:Arial,sans-serif;line-height:1.6;color:#1a1a1a;background-color:#f4f4f4;margin:0;padding:0;'>

        <div style='background-color:#ffffff;padding:24px 20px;text-align:center;border-bottom:3px solid #2C5F2E;'>
            <img src='https://web.lweb.ch/templettedhopnew/logo.png' alt='Lichtbild' style='width:120px;height:120px;object-fit:contain;margin-bottom:10px;' />
            <h1 style='margin:0;font-size:22px;color:#1a1a1a;'>📦 Ihre Bestellung ist unterwegs!</h1>
            <p style='margin:4px 0 0;color:#555;font-size:14px;'>Lichtbild</p>
        </div>

        <div style='padding:24px;max-width:600px;margin:0 auto;'>

            <div style='background-color:#eef4f0;padding:20px;margin:15px 0;border-radius:6px;border:1px solid #c5d9c8;text-align:center;'>
                <h2 style='margin:0 0 8px;color:#2C5F2E;'>🚚 Ihre Bestellung wurde versandt!</h2>
                <p style='margin:0;font-size:16px;'>Hallo <strong>{$firstName} {$lastName}</strong>,</p>
                <p style='margin:8px 0 0;color:#555;'>Ihre Bestellung <strong>{$orderNumber}</strong> ist auf dem Weg zu Ihnen.<br>Sie können in Kürze mit der Lieferung rechnen.</p>
            </div>

            <div style='background-color:#ffffff;padding:15px;margin:15px 0;border-radius:6px;border:1px solid #ddd;'>
                <h3 style='margin:0 0 12px;color:#1a1a1a;'>🛒 Ihre Bestellung</h3>
                {$itemsHtml}
                <div style='margin-top:15px;padding-top:10px;border-top:2px solid #2C5F2E;'>
                    <p style='margin:0;font-weight:bold;font-size:16px;color:#2C5F2E;'>Gesamt: {$total} CHF</p>
                </div>
            </div>

            <div style='background-color:#e8f4fd;padding:15px;margin:15px 0;border-radius:6px;border-left:4px solid #2a6496;'>
                <h3 style='margin:0 0 8px;'>📮 Lieferadresse</h3>
                <p style='margin:0;'>{$firstName} {$lastName}<br>
                {$order['customer_address']}<br>
                {$order['customer_postal_code']} {$order['customer_city']}<br>
                Kanton: {$order['customer_canton']}</p>
            </div>

            <div style='background-color:#fff8e7;padding:15px;margin:15px 0;border-radius:6px;border-left:4px solid #c8861a;'>
                <p style='margin:0;'>Bei Fragen zu Ihrer Bestellung können Sie uns jederzeit unter <strong>info@lichtbild.ch</strong> oder <strong>+41 00 000 00 00</strong> erreichen.</p>
            </div>

            <div style='text-align:center;margin-top:24px;padding:16px;background-color:#ffffff;color:#555;font-size:13px;border-radius:6px;border-top:3px solid #2C5F2E;'>
                <p style='margin:0;'><strong>Lichtbild</strong></p>
                <p style='margin:4px 0 0;'>Musterstrasse 1, 8000 Musterstadt · info@lichtbild.ch · +41 00 000 00 00</p>
            </div>

        </div>
    </body>
    </html>";

    $subject = '📦 Ihre Bestellung ' . $orderNumber . ' wurde versandt – Lichtbild';
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: {$fromEmail}\r\n";
    $headers .= "Reply-To: {$fromEmail}\r\n";

    $sent = mail($toCustomer, $subject, $emailHtml, $headers);

    if ($sent) {
        // Actualizar estado del pedido a "processing"
        $updateStmt = $pdo->prepare("UPDATE orders SET status = 'processing', updated_at = NOW() WHERE id = ?");
        $updateStmt->execute([$orderId]);

        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Email konnte nicht gesendet werden']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
