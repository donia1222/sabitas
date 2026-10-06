<?php
require_once 'config.php';
setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit(); }

try {
    $pdo  = getDBConnection();
    $body = json_decode(file_get_contents('php://input'), true);

    // SEGURIDAD: token servidor-a-servidor. Lo añade la ruta Next.js
    // (app/api/payment-settings) desde el servidor; el navegador NUNCA lo ve.
    // Sin token válido → 403 (impide que un tercero cambie el IBAN/PayPal/Twint).
    $__almacen  = @require __DIR__ . '/../../../secure_config/almacen.php';
    $__expected = is_array($__almacen) ? ($__almacen['shop_admin_token'] ?? null) : null;
    $__sent     = is_array($body) ? (string)($body['admin_token'] ?? '') : '';
    if ($__expected === null || $__sent === '' || !hash_equals((string)$__expected, $__sent)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Forbidden']);
        exit;
    }

    // El GET ya no expone la clave secreta, así que el form de admin la carga
    // vacía. Si llega vacía al guardar, CONSERVAR la existente (no borrarla).
    $incomingSecret = trim($body['stripe_secret_key'] ?? '');
    if ($incomingSecret === '') {
        try {
            $cur = $pdo->query("SELECT stripe_secret_key FROM payment_settings WHERE id = 1")->fetchColumn();
            if ($cur !== false && $cur !== null) { $incomingSecret = $cur; }
        } catch (Exception $e) { /* si no existe aún, se queda vacía */ }
    }

    $stmt = $pdo->prepare("INSERT INTO payment_settings
        (id, paypal_email, stripe_publishable_key, stripe_secret_key, stripe_pmc_id, twint_phone,
         bank_iban, bank_holder, bank_name,
         enable_paypal, enable_stripe, enable_twint, enable_invoice, enable_pickup)
        VALUES (1, :paypal_email, :stripe_publishable_key, :stripe_secret_key, :stripe_pmc_id, :twint_phone,
                :bank_iban, :bank_holder, :bank_name,
                :enable_paypal, :enable_stripe, :enable_twint, :enable_invoice, :enable_pickup)
        ON DUPLICATE KEY UPDATE
            paypal_email           = VALUES(paypal_email),
            stripe_publishable_key = VALUES(stripe_publishable_key),
            stripe_secret_key      = VALUES(stripe_secret_key),
            stripe_pmc_id          = VALUES(stripe_pmc_id),
            twint_phone            = VALUES(twint_phone),
            bank_iban              = VALUES(bank_iban),
            bank_holder            = VALUES(bank_holder),
            bank_name              = VALUES(bank_name),
            enable_paypal          = VALUES(enable_paypal),
            enable_stripe          = VALUES(enable_stripe),
            enable_twint           = VALUES(enable_twint),
            enable_invoice         = VALUES(enable_invoice),
            enable_pickup          = VALUES(enable_pickup)");

    $stmt->execute([
        ':paypal_email'           => trim($body['paypal_email'] ?? ''),
        ':stripe_publishable_key' => trim($body['stripe_publishable_key'] ?? ''),
        ':stripe_secret_key'      => $incomingSecret,
        ':stripe_pmc_id'          => trim($body['stripe_pmc_id'] ?? ''),
        ':twint_phone'            => trim($body['twint_phone'] ?? ''),
        ':bank_iban'              => trim($body['bank_iban'] ?? ''),
        ':bank_holder'            => trim($body['bank_holder'] ?? ''),
        ':bank_name'              => trim($body['bank_name'] ?? ''),
        ':enable_paypal'          => (int)(bool)($body['enable_paypal']  ?? false),
        ':enable_stripe'          => (int)(bool)($body['enable_stripe']  ?? false),
        ':enable_twint'           => (int)(bool)($body['enable_twint']   ?? false),
        ':enable_invoice'         => (int)(bool)($body['enable_invoice'] ?? true),
        ':enable_pickup'          => (int)(bool)($body['enable_pickup']  ?? false),
    ]);

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
