<?php
require_once 'config.php';
require_once 'features.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Paquete 3: apagado. Ver api/features.php
requireFeature('cuentas');

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

try {
    $pdo = getDBConnection();

    $sql = "SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
                   u.address, u.city, u.postal_code, u.canton, u.notes, u.created_at,
                   MAX(s.last_accessed) AS last_access
            FROM users u
            LEFT JOIN user_sessions s ON s.user_id = u.id
            GROUP BY u.id
            ORDER BY u.created_at DESC";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $users = array_map(function ($r) {
        return [
            'id'         => (int)$r['id'],
            'email'      => $r['email'] ?? '',
            'firstName'  => $r['first_name'] ?? '',
            'lastName'   => $r['last_name'] ?? '',
            'phone'      => $r['phone'] ?? '',
            'address'    => $r['address'] ?? '',
            'city'       => $r['city'] ?? '',
            'postalCode' => $r['postal_code'] ?? '',
            'canton'     => $r['canton'] ?? '',
            'notes'      => $r['notes'] ?? '',
            'createdAt'  => $r['created_at'] ?? '',
            'lastAccess' => $r['last_access'] ?? '',
        ];
    }, $rows);

    echo json_encode([
        'success' => true,
        'count'   => count($users),
        'users'   => $users,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
