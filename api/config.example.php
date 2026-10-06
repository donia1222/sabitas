<?php
// Configuración de la base de datos
define('DB_HOST', 'TU_DB_HOST_AQUI');
define('DB_NAME', 'TU_DB_NAME_AQUI');
define('DB_USER', 'TU_DB_USER_AQUI');
define('DB_PASS', 'TU_DB_PASS_AQUI'); // ⚠️ FALTA COMPLETAR
define('DB_CHARSET', 'utf8mb4');

// Configuración de CORS
define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:3001',
       'http://localhost:3002',
    'http://localhost:3003',
       'http://localhost:3004',
    'http://localhost:3005',
    'https://hot-sauce-store-pink.vercel.app',
]);

// Función para conectar a la base de datos
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception("Database connection failed: " . $e->getMessage());
    }
}

// URL base dinámica para uploads (funciona en cualquier servidor sin cambios)
function getUploadBaseUrl() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $dir  = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    return $protocol . '://' . $host . $dir . '/upload/';
}

// Función para configurar headers CORS
function setCORSHeaders() {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, ALLOWED_ORIGINS)) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
    header('Access-Control-Allow-Credentials: false');
    header('Access-Control-Max-Age: 86400');
}
?>

