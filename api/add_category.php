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

    $name        = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $is_haupt    = !empty($_POST['is_haupt']) && $_POST['is_haupt'] != '0' ? 1 : 0;
    // Una Hauptkategorie es siempre nivel superior (sin padre)
    $parent_id   = $is_haupt ? null : (isset($_POST['parent_id']) && intval($_POST['parent_id']) > 0 ? intval($_POST['parent_id']) : null);

    if (empty($name)) {
        throw new Exception('El nombre de la categoría es requerido');
    }

    if ($parent_id !== null) {
        $check = $pdo->prepare("SELECT id FROM categories WHERE id = :id");
        $check->execute([':id' => $parent_id]);
        if (!$check->fetch()) throw new Exception('Kategoría padre no existe');
    }

    // Generar slug a partir del nombre: minúsculas, espacios → guión, solo alfanumérico y guiones
    $slug = strtolower($name);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
    $slug = trim($slug, '-');

    if (empty($slug)) {
        throw new Exception('No se pudo generar un slug válido para la categoría');
    }

    // Verificar que el slug no exista ya
    $stmt = $pdo->prepare("SELECT id FROM categories WHERE slug = :slug");
    $stmt->execute([':slug' => $slug]);
    if ($stmt->fetch()) {
        throw new Exception('Ya existe una categoría con ese nombre');
    }

    // Imagen opcional (sobre todo para Hauptkategorien)
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

    $stmt = $pdo->prepare("INSERT INTO categories (parent_id, is_haupt, slug, name, description, image) VALUES (:parent_id, :is_haupt, :slug, :name, :description, :image)");
    $stmt->execute([
        ':parent_id'   => $parent_id,
        ':is_haupt'    => $is_haupt,
        ':slug'        => $slug,
        ':name'        => $name,
        ':description' => $description,
        ':image'       => $image_name
    ]);

    $new_id = intval($pdo->lastInsertId());

    echo json_encode([
        'success'  => true,
        'message'  => 'Categoría creada exitosamente',
        'category' => [
            'id'          => $new_id,
            'parent_id'   => $parent_id,
            'is_haupt'    => $is_haupt,
            'slug'        => $slug,
            'name'        => $name,
            'description' => $description,
            'image'       => $image_name ? getUploadBaseUrl() . $image_name : null
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
}
?>
