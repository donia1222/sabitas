<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit();
}

parse_str(file_get_contents("php://input"), $input);
$id = intval($input['id'] ?? $_POST['id'] ?? $_GET['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID de categoría requerido']);
    exit();
}

try {
    $pdo = getDBConnection();

    // Verificar que la categoría existe
    $stmt = $pdo->prepare("SELECT slug FROM categories WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $category = $stmt->fetch();

    if (!$category) {
        throw new Exception('Kategoría no encontrada');
    }

    // Verificar si hay productos usando esta categoría
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM products WHERE category = :slug");
    $stmt->execute([':slug' => $category['slug']]);
    $count = $stmt->fetch();

    if ($count['total'] > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'Diese Kategorie hat noch ' . $count['total'] . ' Produkt(e). Bitte zuerst die Produkte löschen oder einer anderen Kategorie zuweisen.',
            'products_count' => intval($count['total'])
        ]);
        exit();
    }

    // Eliminar la categoría
    $stmt = $pdo->prepare("DELETE FROM categories WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode(['success' => true, 'message' => 'Kategorie erfolgreich gelöscht']);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Datenbankfehler: ' . $e->getMessage()]);
}
?>
