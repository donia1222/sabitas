<?php
require_once 'config.php';

// Configurar CORS
setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Permitir PUT y DELETE
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'PUT') {
    parse_str(file_get_contents("php://input"), $_PUT);
} elseif ($method === 'DELETE') {
    parse_str(file_get_contents("php://input"), $_DELETE);
}

try {
    // Obtener conexión a la base de datos
    $pdo = getDBConnection();
    
    // ELIMINAR PRODUCTO
    if ($method === 'DELETE') {
        $id = $_DELETE['id'] ?? $_GET['id'] ?? null;
        
        if (!$id || intval($id) <= 0) {
            throw new Exception('ID del producto requerido y válido');
        }
        
        $id = intval($id);
        
        // Obtener información del producto para eliminar imágenes
        $sql = "SELECT image, image2, image3, image4 FROM products WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            throw new Exception('Producto no encontrado');
        }
        
        // Eliminar producto de la base de datos
        $sql = "DELETE FROM products WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([':id' => $id]);
        
        if (!$result) {
            throw new Exception('Error al eliminar producto de la base de datos');
        }
        
        // Eliminar todas las imágenes del servidor si existen
        $image_fields = ['image', 'image2', 'image3', 'image4'];
        foreach ($image_fields as $field) {
            if ($product[$field] && file_exists('upload/' . $product[$field])) {
                unlink('upload/' . $product[$field]);
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Producto eliminado exitosamente'
        ]);
    }
    
    // EDITAR PRODUCTO
    elseif ($method === 'POST' || $method === 'PUT') {
        $id = $_POST['id'] ?? $_PUT['id'] ?? null;
        
        if (!$id || intval($id) <= 0) {
            throw new Exception('ID del producto requerido y válido');
        }
        
        $id = intval($id);
        
        // Verificar que el producto existe
        $sql = "SELECT * FROM products WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $existing_product = $stmt->fetch();
        
        if (!$existing_product) {
            throw new Exception('Producto no encontrado');
        }
        
        // Obtener datos del formulario (usar valores existentes como fallback)
        $name = $_POST['name'] ?? $existing_product['name'];
        $description = $_POST['description'] ?? $existing_product['description'];
        $price = $_POST['price'] ?? $existing_product['price'];
        $stock = $_POST['stock'] ?? $existing_product['stock'] ?? 0; // Nuevo campo stock
        $heat_level = $_POST['heat_level'] ?? $existing_product['heat_level'];
        $rating = $_POST['rating'] ?? $existing_product['rating'];
        $badge = $_POST['badge'] ?? $existing_product['badge'];
        $origin = $_POST['origin'] ?? $existing_product['origin'];
        $supplier = $_POST['supplier'] ?? $existing_product['supplier'] ?? '';
        $category = $_POST['category'] ?? $existing_product['category'] ?? 'hot-sauce';
        $weight_kg = $_POST['weight_kg'] ?? $existing_product['weight_kg'] ?? 0.500;
        $shipping_on_request = isset($_POST['shipping_on_request'])
            ? (!empty($_POST['shipping_on_request']) && $_POST['shipping_on_request'] != '0' ? 1 : 0)
            : intval($existing_product['shipping_on_request'] ?? 0);
        $article_number = isset($_POST['article_number']) ? trim($_POST['article_number']) : ($existing_product['article_number'] ?? '');

        
        // Validar datos requeridos
        if (empty(trim($name))) {
            throw new Exception('El nombre del producto es requerido');
        }
        
        // Validar stock
        if (!is_numeric($stock) || intval($stock) < 0) {
            throw new Exception('El stock debe ser un número igual o mayor a 0');
        }
        
        // Mantener imágenes actuales por defecto
        $image_names = [
            $existing_product['image'],
            $existing_product['image2'],
            $existing_product['image3'],
            $existing_product['image4']
        ];
        
        $upload_dir = 'upload/';
        
        // Crear directorio si no existe
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }
        
        // Procesar hasta 4 imágenes nuevas
        for ($i = 0; $i < 4; $i++) {
            $file_key = $i === 0 ? 'image_0' : "image_$i";
            $remove_key = "remove_image_$i";
            $keep_key = "keep_image_$i";
            
            // Si hay nueva imagen subida
            if (isset($_FILES[$file_key]) && $_FILES[$file_key]['error'] === UPLOAD_ERR_OK) {
                $file_extension = pathinfo($_FILES[$file_key]['name'], PATHINFO_EXTENSION);
                $new_image_name = uniqid() . '_' . time() . '_' . $i . '.' . $file_extension;
                $upload_path = $upload_dir . $new_image_name;
                
                // Validar tipo de archivo
                $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                if (!in_array(strtolower($file_extension), $allowed_types)) {
                    throw new Exception("Tipo de archivo no permitido para imagen " . ($i + 1) . ". Permitidos: " . implode(', ', $allowed_types));
                }
                
                // Validar tamaño (máximo 5MB)
                if ($_FILES[$file_key]['size'] > 5 * 1024 * 1024) {
                    throw new Exception("Archivo demasiado grande para imagen " . ($i + 1) . ". Máximo 5MB");
                }
                
                // Mover nuevo archivo
                if (move_uploaded_file($_FILES[$file_key]['tmp_name'], $upload_path)) {
                    // Eliminar imagen anterior si existe
                    if ($image_names[$i] && file_exists($upload_dir . $image_names[$i])) {
                        unlink($upload_dir . $image_names[$i]);
                    }
                    $image_names[$i] = $new_image_name;
                } else {
                    throw new Exception("Error al subir la imagen " . ($i + 1));
                }
            }
            // Si se indica eliminar la imagen
            else if (isset($_POST[$remove_key]) && $_POST[$remove_key] === 'true') {
                // Eliminar imagen del servidor si existe
                if ($image_names[$i] && file_exists($upload_dir . $image_names[$i])) {
                    unlink($upload_dir . $image_names[$i]);
                }
                $image_names[$i] = "";
            }
            // Si se indica mantener la imagen, no hacer nada (ya está en $image_names[$i])
            // Si no se especifica nada, mantener la imagen existente por defecto
        }
        
        // Actualizar producto en la base de datos
        $sql = "UPDATE products SET
                name = :name,
                description = :description,
                price = :price,
                stock = :stock,
                image = :image,
                image2 = :image2,
                image3 = :image3,
                image4 = :image4,
                heat_level = :heat_level,
                rating = :rating,
                badge = :badge,
                origin = :origin,
                supplier = :supplier,
                category = :category,
                weight_kg = :weight_kg,
                shipping_on_request = :shipping_on_request,
                article_number = :article_number,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = :id";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            ':id' => $id,
            ':name' => trim($name),
            ':description' => trim($description),
            ':price' => floatval($price),
            ':stock' => intval($stock),
            ':image' => $image_names[0],
            ':image2' => $image_names[1],
            ':image3' => $image_names[2],
            ':image4' => $image_names[3],
            ':heat_level' => intval($heat_level),
            ':rating' => floatval($rating),
            ':badge' => trim($badge),
            ':origin' => trim($origin),
            ':supplier' => trim($supplier),
            ':category' => $category,
            ':weight_kg' => floatval($weight_kg),
            ':shipping_on_request' => $shipping_on_request,
            ':article_number' => $article_number !== '' ? $article_number : null,
        ]);
        
        if (!$result) {
            throw new Exception('Error al actualizar producto en la base de datos');
        }
        
        // Construir URLs de imágenes
        $image_urls = [];
        for ($i = 0; $i < 4; $i++) {
            $image_urls[] = $image_names[$i] ? getUploadBaseUrl() . $image_names[$i] : null;
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Producto actualizado exitosamente',
            'category' => $category,
            'stock' => intval($stock),
            'image_urls' => $image_urls,
            'image_url' => $image_urls[0] // Mantener compatibilidad con imagen principal
        ]);
    }
    
    else {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error de base de datos: ' . $e->getMessage()
    ]);
}
?>