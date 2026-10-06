<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Obtener datos del POST
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos']);
    exit;
}

// Extraer información del pedido
$payerID = $data['payerID'] ?? '';
$customerInfo = $data['customerInfo'] ?? [];
$cart = $data['cart'] ?? [];
$total = $data['total'] ?? 0;
$timestamp = $data['timestamp'] ?? date('Y-m-d H:i:s');

// Validar datos requeridos
if (empty($payerID) || empty($customerInfo) || empty($cart)) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan datos requeridos']);
    exit;
}

// Configuración de emails
$toStore = 'info@lichtbild.ch';
$toCustomer = $customerInfo['email'] ?? '';
$fromEmail = 'info@cantinatexmex.ch';

if (empty($toCustomer)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email del cliente requerido']);
    exit;
}

// ===== EMAIL PARA LA TIENDA (en alemán) =====
$storeSubject = '🌶️ NEUE BESTELLUNG - Lichtbild - PayPal ID: ' . $payerID;
$storeEmailContent = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .urgent { background-color: #fff3cd; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .order-details { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .customer-info { background-color: #e7f3ff; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
        .total { font-weight: bold; font-size: 18px; color: #dc3545; }
        .next-steps { background-color: #d4edda; padding: 15px; margin: 15px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class='header'>
        <h1>🔥 NEUE BESTELLUNG - Lichtbild</h1>
        <p>Zahlung erfolgreich über PayPal verarbeitet!</p>
    </div>
    
    <div class='content'>
        <div class='urgent'>
            <h2>⚡ SOFORTIGE BEARBEITUNG ERFORDERLICH</h2>
            <p><strong>Neue Bestellung eingegangen - Sofort bearbeiten</strong></p>
            <p>PayPal ID: <strong>{$payerID}</strong></p>
        </div>

        <div class='order-details'>
            <h2>💳 Zahlungsdetails</h2>
            <p><strong>PayPal Payer ID:</strong> {$payerID}</p>
            <p><strong>Datum und Zeit:</strong> {$timestamp}</p>
            <p><strong>Status:</strong> ✅ BEZAHLT UND BESTÄTIGT</p>
            <p><strong>Bezahlter Betrag:</strong> <span class='total'>{$total} CHF</span></p>
        </div>

        <div class='customer-info'>
            <h2>👤 Kundeninformationen</h2>
            <p><strong>Name:</strong> {$customerInfo['firstName']} {$customerInfo['lastName']}</p>
            <p><strong>E-Mail:</strong> {$customerInfo['email']}</p>
            <p><strong>Telefon:</strong> {$customerInfo['phone']}</p>
            <h3>📮 Lieferadresse:</h3>
            <p>{$customerInfo['address']}</p>
            <p>{$customerInfo['postalCode']} {$customerInfo['city']}</p>
            <p><strong>Kanton:</strong> {$customerInfo['canton']}</p>";

if (!empty($customerInfo['notes'])) {
    $storeEmailContent .= "<p><strong>⚠️ Besondere Hinweise:</strong> {$customerInfo['notes']}</p>";
}

$storeEmailContent .= "
        </div>

        <div class='order-details'>
            <h2>🛒 Zu versendende Produkte</h2>";

$subtotal = 0;
foreach ($cart as $item) {
    $itemTotal = $item['price'] * $item['quantity'];
    $subtotal += $itemTotal;
    
    $storeEmailContent .= "
            <div class='product-item'>
                <p><strong>{$item['name']}</strong></p>
                <p>Menge: <strong>{$item['quantity']}</strong> x {$item['price']} CHF = <strong>{$itemTotal} CHF</strong></p>
                <p><em>{$item['description']}</em></p>
            </div>";
}

$storeEmailContent .= "
            <div style='margin-top: 20px; padding-top: 15px; border-top: 2px solid #dc3545;'>
                <p><strong>Zwischensumme:</strong> {$subtotal} CHF</p>
                <p><strong>Versand:</strong> Kostenlos</p>
                <p class='total'>GESAMT BEZAHLT: {$total} CHF</p>
            </div>
        </div>

        <div class='next-steps'>
            <h3>📦 Nächste Schritte</h3>
            <p>✅ Zahlung von PayPal bestätigt</p>
            <p>📋 Bestellung bearbeiten und Versand vorbereiten</p>
            <p>📮 Versand in 2-3 Werktagen an:</p>
            <p><strong>{$customerInfo['address']}, {$customerInfo['postalCode']} {$customerInfo['city']}</strong></p>
            <p>📧 Tracking-Nummer an Kunde senden: {$customerInfo['email']}</p>
        </div>
    </div>
</body>
</html>";

// ===== EMAIL PARA EL CLIENTE (en alemán) =====
$customerSubject = '🔥 Bestellbestätigung - Lichtbild';
$customerEmailContent = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .thank-you { background-color: #d4edda; padding: 20px; margin: 15px 0; border-radius: 5px; text-align: center; }
        .order-details { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
        .total { font-weight: bold; font-size: 18px; color: #dc3545; }
        .shipping-info { background-color: #e7f3ff; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; padding: 20px; background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class='header'>
        <h1>🔥 Lichtbild</h1>
        <p>Vielen Dank für Ihre Bestellung!</p>
    </div>
    
    <div class='content'>
        <div class='thank-you'>
            <h2>✅ Bestellung bestätigt!</h2>
            <p>Liebe/r {$customerInfo['firstName']},</p>
            <p>Vielen Dank für Ihre Bestellung bei Lichtbild! Ihre Zahlung wurde erfolgreich verarbeitet.</p>
        </div>

        <div class='order-details'>
            <h2>📋 Ihre Bestelldetails</h2>
            <p><strong>Bestellnummer:</strong> {$payerID}</p>
            <p><strong>Datum:</strong> " . date('d.m.Y H:i', strtotime($timestamp)) . "</p>
            <p><strong>Status:</strong> ✅ Bezahlt</p>
        </div>

        <div class='order-details'>
            <h2>🛒 Bestellte Produkte</h2>";

foreach ($cart as $item) {
    $itemTotal = $item['price'] * $item['quantity'];
    
    $customerEmailContent .= "
            <div class='product-item'>
                <p><strong>{$item['name']}</strong></p>
                <p>Menge: {$item['quantity']} x {$item['price']} CHF = {$itemTotal} CHF</p>
                <p><em>{$item['description']}</em></p>
            </div>";
}

$customerEmailContent .= "
            <div style='margin-top: 20px; padding-top: 15px; border-top: 2px solid #dc3545;'>
                <p><strong>Zwischensumme:</strong> {$subtotal} CHF</p>
                <p><strong>Versand:</strong> Kostenlos</p>
                <p class='total'>GESAMT: {$total} CHF</p>
            </div>
        </div>

        <div class='order-details'>
            <h2>📮 Lieferadresse</h2>
            <p><strong>{$customerInfo['firstName']} {$customerInfo['lastName']}</strong></p>
            <p>{$customerInfo['address']}</p>
            <p>{$customerInfo['postalCode']} {$customerInfo['city']}</p>
            <p>{$customerInfo['canton']}</p>
        </div>

        <div class='shipping-info'>
            <h3>📦 Was passiert als nächstes?</h3>
            <p>✅ Ihre Zahlung wurde bestätigt</p>
            <p>📦 Wir bereiten Ihre Bestellung vor</p>
            <p>🚚 Versand in 2-3 Werktagen</p>
            <p>📧 Sie erhalten eine Tracking-Nummer per E-Mail</p>
            <p>📞 Bei Fragen: info@cantinatexmex.ch</p>
        </div>

        <div class='footer'>
            <p><strong>Vielen Dank für Ihr Vertrauen!</strong></p>
            <p>🔥 Lichtbild Team</p>
            <p>info@cantinatexmex.ch</p>
        </div>
    </div>
</body>
</html>";

// Headers para emails HTML
$storeHeaders = "MIME-Version: 1.0\r\n";
$storeHeaders .= "Content-type: text/html; charset=UTF-8\r\n";
$storeHeaders .= "From: {$fromEmail}\r\n";
$storeHeaders .= "Reply-To: {$customerInfo['email']}\r\n";

$customerHeaders = "MIME-Version: 1.0\r\n";
$customerHeaders .= "Content-type: text/html; charset=UTF-8\r\n";
$customerHeaders .= "From: {$fromEmail}\r\n";
$customerHeaders .= "Reply-To: {$fromEmail}\r\n";

// Enviar emails
$storeEmailSent = mail($toStore, $storeSubject, $storeEmailContent, $storeHeaders);
$customerEmailSent = mail($toCustomer, $customerSubject, $customerEmailContent, $customerHeaders);

// Respuesta
echo json_encode([
    'success' => ($storeEmailSent && $customerEmailSent),
    'message' => 'E-Mails zur Bestellbestätigung gesendet',
    'details' => [
        'payerID' => $payerID,
        'storeEmailSent' => $storeEmailSent,
        'customerEmailSent' => $customerEmailSent,
        'toStore' => $toStore,
        'toCustomer' => $toCustomer,
        'timestamp' => date('Y-m-d H:i:s')
    ]
]);
?>
