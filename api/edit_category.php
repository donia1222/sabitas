<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit();
}

try {
    $pdo = getDBConnection();

    $id          = intval($_POST['id'] ?? 0);
    $name        = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $is_haupt    = !empty($_POST['is_haupt']) && $_POST['is_haupt'] != '0' ? 1 : 0;
    // Una Hauptkategorie es siempre nivel superior (sin padre)
    $parent_id   = $is_haupt ? null : (isset($_POST['parent_id']) && intval($_POST['parent_id']) > 0 ? intval($_POST['parent_id']) : null);

    if ($id <= 0) throw new Exception('ID de categoría requerido');
    if (empty($name)) throw new Exception('El nombre es requerido');
    if ($parent_id !== null && $parent_id === $id) throw new Exception('Una categoría no puede ser su propio padre');

    // Verificar que existe
    $stmt = $pdo->prepare("SELECT id, slug FROM categories WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $existing = $stmt->fetch();
    if (!$existing) throw new Exception('Kategorie nicht gefunden');

    // Imagen opcional: solo se actualiza si se sube una nueva
    $image_name = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = 'upload/';
        if (!is_dir($upload_dir)) mkdir($upload_dir, 0755, true);
        $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array($ext, $allowed)) throw new Exception('Bildformat nicht erlaubt. Erlaubt: ' . implode(', ', $allowed));
        if ($_FILES['image']['size'] > 5 * 1024 * 1024) throw new Exception('Bild zu groß. Maximal 5MB');
        $image_name = uniqid() . '_' . time() . '.' . $ext;
        if (!move_uploaded_file($_FILES['image']['tmp_name'], $upload_dir . $image_name)) throw new Exception('Fehler beim Hochladen des Bildes');
    }

    // Actualizar (el slug no cambia para no romper productos); la imagen solo si se subió una nueva
    $imageSql = $image_name ? ", image = :image" : "";
    $stmt = $pdo->prepare("UPDATE categories SET name = :name, description = :description, parent_id = :parent_id, is_haupt = :is_haupt $imageSql WHERE id = :id");
    $params = [':name' => $name, ':description' => $description, ':parent_id' => $parent_id, ':is_haupt' => $is_haupt, ':id' => $id];
    if ($image_name) $params[':image'] = $image_name;
    $stmt->execute($params);

    echo json_encode([
        'success' => true,
        'message' => 'Kategorie erfolgreich aktualisiert',
        'category' => ['id' => $id, 'parent_id' => $parent_id, 'is_haupt' => $is_haupt, 'slug' => $existing['slug'], 'name' => $name, 'description' => $description]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Datenbankfehler: ' . $e->getMessage()]);
}
?>
