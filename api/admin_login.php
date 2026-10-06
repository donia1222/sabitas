<?php
/**
 * Entrada al panel de administracion.
 *
 * El usuario y la contrasena viven en secure_config/almacen.php, fuera de www:
 *
 *   'sabitas_user' => 'admin@sabitas.ch',
 *   'sabitas_pass' => '...',
 *
 * La contrasena puede ir en claro o cifrada con password_hash(); si empieza
 * por $2y$ se comprueba con password_verify.
 *
 * Antes esto se comprobaba en el navegador con NEXT_PUBLIC_ADMIN_PASSWORD, que
 * viaja dentro del javascript: cualquiera podia leerla con ver-codigo-fuente.
 */
require_once __DIR__ . '/config.php';

setCORSHeaders();
// El guardia va DESPUES del preflight: si no, el navegador nunca llega a mandar
// la peticion de verdad.
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

/** Un freno sencillo: cinco intentos por IP cada cuarto de hora. */
function demasiadosIntentos(string $ip): bool {
    $fichero = sys_get_temp_dir() . '/sabitas_login_' . sha1($ip);
    $ahora   = time();
    $intentos = [];
    if (is_file($fichero)) {
        $guardado = @json_decode((string) @file_get_contents($fichero), true);
        if (is_array($guardado)) $intentos = $guardado;
    }
    // Fuera los de hace mas de 15 minutos.
    $intentos = array_values(array_filter($intentos, fn($t) => $ahora - (int) $t < 900));
    if (count($intentos) >= 5) return true;
    $intentos[] = $ahora;
    @file_put_contents($fichero, json_encode($intentos), LOCK_EX);
    return false;
}

$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
if (demasiadosIntentos($ip)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Zu viele Versuche. Bitte später erneut versuchen.']);
    exit;
}

$almacen = @require __DIR__ . '/../../../secure_config/almacen.php';
$usuario = is_array($almacen) ? strtolower(trim((string) ($almacen['sabitas_user'] ?? ''))) : '';
$clave   = is_array($almacen) ? (string) ($almacen['sabitas_pass'] ?? '') : '';

if ($usuario === '' || $clave === '') {
    // Sin credenciales configuradas no se entra: nunca hay acceso por defecto.
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Zugang nicht konfiguriert']);
    exit;
}

$cuerpo = json_decode((string) file_get_contents('php://input'), true);
$email  = strtolower(trim((string) (is_array($cuerpo) ? ($cuerpo['email'] ?? '') : '')));
$pass   = (string) (is_array($cuerpo) ? ($cuerpo['password'] ?? '') : '');

// Las dos comprobaciones se hacen siempre, aunque la primera ya falle: asi el
// tiempo de respuesta no dice si el email existe.
$emailOk = hash_equals($usuario, $email);
$passOk  = (strncmp($clave, '$2y$', 4) === 0 || strncmp($clave, '$argon', 6) === 0)
    ? password_verify($pass, $clave)
    : hash_equals($clave, $pass);

if (!($emailOk && $passOk)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'E-Mail oder Passwort falsch']);
    exit;
}

/**
 * Una marca de sesion que el servidor puede volver a calcular sin guardar nada.
 * Hoy el panel no la pide; esta aqui para cuando se protejan los endpoints.
 */
$token = hash_hmac('sha256', $usuario . '|' . gmdate('Y-m-d'), $clave);

echo json_encode([
    'success' => true,
    'email'   => $usuario,
    'token'   => $token,
]);
