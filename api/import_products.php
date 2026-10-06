<?php
require_once 'config.php';

setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

// Dar más tiempo al PHP en el hosting compartido
@set_time_limit(120);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit();
}

try {
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE || !isset($data['products']) || !is_array($data['products'])) {
        throw new Exception('JSON inválido o falta el campo "products"');
    }

    $products = $data['products'];

    if (count($products) === 0) {
        throw new Exception('La lista de productos está vacía');
    }

    $pdo = getDBConnection();
    $pdo->beginTransaction();

    $skipped  = 0;
    $deleted  = 0;
    $errors   = [];

    // Desduplicar por ID: si el mismo ID aparece en varias hojas del Excel, quedarse con la última
    $seen = [];
    $deduped = [];
    foreach ($products as $p) {
        $id = isset($p['id']) ? intval($p['id']) : 0;
        if ($id > 0) $seen[$id] = $p;
    }
    $deduped = array_values($seen);
    $skipped += count($products) - count($deduped);

    // Validar y preparar filas para el bulk INSERT
    $excelIds         = [];
    $valuePlaceholders = [];
    $params           = [];
    $categoriesCreated = [];

    foreach ($deduped as $index => $p) {
        $id   = isset($p['id'])   ? intval($p['id'])   : 0;
        $name = isset($p['name']) ? trim($p['name'])   : '';

        if ($id <= 0 || $name === '') {
            $skipped++;
            $errors[] = "Fila $index: ID o nombre vacío, omitido.";
            continue;
        }

        $articleNumber = isset($p['article_number']) ? trim($p['article_number']) : '';
        $description   = isset($p['description'])    ? trim($p['description'])    : '';
        $price         = isset($p['price'])    ? floatval($p['price'])    : 0.0;
        $stock         = isset($p['stock'])    ? intval($p['stock'])      : 0;
        $supplier      = isset($p['supplier']) ? trim($p['supplier'])     : '';
        $origin        = isset($p['origin'])   ? trim($p['origin'])       : '';
        $category      = isset($p['category']) ? trim($p['category'])     : '';
        $categoryName  = isset($p['category_name']) ? trim($p['category_name']) : $category;
        $image_url     = isset($p['image_url']) && $p['image_url'] !== '' ? trim($p['image_url']) : null;
        $weight_kg     = isset($p['weight_kg']) && $p['weight_kg'] > 0   ? floatval($p['weight_kg']) : 0.500;

        $excelIds[] = $id;

        // Auto-crear categoría si no existe (pocas por import, coste mínimo)
        if ($category !== '' && !isset($categoriesCreated[$category])) {
            $stmtCat = $pdo->prepare("SELECT id FROM categories WHERE slug = :slug");
            $stmtCat->execute([':slug' => $category]);
            if (!$stmtCat->fetch()) {
                $stmtInsertCat = $pdo->prepare("INSERT INTO categories (slug, name) VALUES (:slug, :name)");
                $stmtInsertCat->execute([':slug' => $category, ':name' => $categoryName]);
            }
            $categoriesCreated[$category] = true;
        }

        $valuePlaceholders[] = "(?,?,?,?,?,?,?,?,?,1,0.0,'',?,?)";
        array_push($params,
            $id,
            $articleNumber !== '' ? $articleNumber : null,
            $name,
            $description,
            $price,
            $stock,
            $supplier,
            $origin,
            $category,
            $image_url,
            $weight_kg
        );
    }

    $inserted = 0;
    $updated  = 0;

    if (!empty($valuePlaceholders)) {
        // 1 query: saber cuáles IDs ya existen (para contar inserted vs updated)
        $checkPH  = implode(',', array_fill(0, count($excelIds), '?'));
        $stmtChk  = $pdo->prepare("SELECT id FROM products WHERE id IN ($checkPH)");
        $stmtChk->execute($excelIds);
        $existingCount = $stmtChk->rowCount();
        $updated  = $existingCount;
        $inserted = count($excelIds) - $existingCount;

        // 1 query: bulk INSERT … ON DUPLICATE KEY UPDATE (todos los productos a la vez)
        $sql = "INSERT INTO products
                    (id, article_number, name, description, price, stock, supplier, origin, category,
                     heat_level, rating, badge, image_url, weight_kg)
                VALUES " . implode(',', $valuePlaceholders) . "
                ON DUPLICATE KEY UPDATE
                    article_number = VALUES(article_number),
                    name           = VALUES(name),
                    description    = VALUES(description),
                    price          = VALUES(price),
                    stock          = VALUES(stock),
                    supplier       = VALUES(supplier),
                    origin         = VALUES(origin),
                    category       = VALUES(category),
                    image_url      = IF(image_url IS NULL OR image_url = '', VALUES(image_url), image_url),
                    weight_kg      = VALUES(weight_kg),
                    updated_at     = CURRENT_TIMESTAMP";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    // 1 query: borrar productos del Excel que ya no están (solo los que tienen supplier)
    if (!empty($excelIds)) {
        $delPH   = implode(',', array_fill(0, count($excelIds), '?'));
        $stmtDel = $pdo->prepare(
            "DELETE FROM products WHERE id NOT IN ($delPH) AND (supplier IS NOT NULL AND supplier != '')"
        );
        $stmtDel->execute($excelIds);
        $deleted = $stmtDel->rowCount();
    }

    $pdo->commit();

    echo json_encode([
        'success'  => true,
        'inserted' => $inserted,
        'updated'  => $updated,
        'skipped'  => $skipped,
        'deleted'  => $deleted,
        'total'    => count($products),
        'errors'   => $errors,
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
}
?>
