<?php
require_once 'config.php';

/**
 * Genera candidates de imagen probando extensiones comunes
 * y la variante con el nombre de archivo en MAYÚSCULAS,
 * para cubrir servidores Linux case-sensitive.
 */
function buildImageCandidates(?string $base_url): array {
    if (!$base_url) return [];

    $dir  = substr($base_url, 0, strrpos($base_url, '/') + 1);
    $file = substr($base_url, strrpos($base_url, '/') + 1);

    // Si ya tiene extensión: devolver original + lower + upper
    if (preg_match('/\.(jpg|JPG|jpeg|JPEG|png|PNG)$/i', $file)) {
        return array_values(array_unique([
            $base_url,
            $dir . strtolower($file),
            $dir . strtoupper($file),
        ]));
    }

    // Sin extensión: probar lower.jpg, UPPER.jpg, lower.JPG, lower.png
    $lower = strtolower($file);
    $upper = strtoupper($file);
    return array_values(array_unique([
        $dir . $lower . '.jpg',
        $dir . $upper . '.jpg',
        $dir . $file  . '.jpg',
        $dir . $lower . '.JPG',
        $dir . $lower . '.png',
        $dir . $upper . '.png',
    ]));
}

// Configurar CORS
setCORSHeaders();
header('Content-Type: application/json; charset=utf-8');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit();
}

try {
    // Obtener conexión a la base de datos
    $pdo = getDBConnection();
    
    // Obtener un producto específico por ID
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        
        if ($id <= 0) {
            throw new Exception('ID de producto inválido');
        }
        
        $sql = "SELECT * FROM products WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':id' => $id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no encontrado']);
            exit();
        }
        
        // Agregar URLs completas de las imágenes
        $db_image_url = $product['image_url'] ?? null; // URL guardada desde el Excel
        $image_urls = [];
        $image_fields = ['image', 'image2', 'image3', 'image4'];

        foreach ($image_fields as $field) {
            if (!empty($product[$field])) {
                $image_urls[] = getUploadBaseUrl() . $product[$field];
            } else {
                $image_urls[] = null;
            }
        }

        $product['image_urls'] = $image_urls;
        $base_url = $image_urls[0] ?? $db_image_url;
        $product['image_url'] = $base_url;

        $product['image_url_candidates'] = buildImageCandidates($base_url);

        // Convertir tipos de datos
        $product['id'] = intval($product['id']);
        $product['price'] = floatval($product['price']);
        $product['stock'] = intval($product['stock'] ?? 0);
        $product['heat_level'] = intval($product['heat_level']);
        $product['rating'] = floatval($product['rating']);
        $product['weight_kg'] = floatval($product['weight_kg'] ?? 0.5);
        $product['shipping_on_request'] = intval($product['shipping_on_request'] ?? 0);

        echo json_encode([
            'success' => true,
            'product' => $product
        ]);
        
    } else {
        // Obtener parámetros de filtro
        $search = $_GET['search'] ?? '';
        $category = $_GET['category'] ?? '';
        $stock_status = $_GET['stock_status'] ?? ''; // Filtro por estado de stock
        $supplier = $_GET['supplier'] ?? ''; // Filtro por fabricante (origin)
        $sort     = $_GET['sort'] ?? '';     // Orden opcional

        // Paginación
        $hasLimit = isset($_GET['limit']);
        $limit  = $hasLimit ? max(1, min(500, intval($_GET['limit']))) : 0;
        $offset = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;

        // Caché de archivo para la llamada sin filtros (la del shop)
        $isNoFilter = !$hasLimit && empty($search) && empty($category)
                   && empty($supplier) && empty($stock_status) && empty($sort);
        $isBust     = isset($_GET['_']); // admin bust: ?_=timestamp
        // El nombre lleva un hash del directorio de instalación: si hay varias
        // tiendas en el mismo servidor, cada una usa su propio archivo y no se
        // sirven el catálogo entre ellas.
        $cacheFile  = sys_get_temp_dir() . '/fk_products_all_' . substr(md5(__DIR__), 0, 12) . '.json';
        $cacheTTL   = 300; // segundos

        if ($isNoFilter && !$isBust && file_exists($cacheFile)
            && (time() - filemtime($cacheFile)) < $cacheTTL) {
            echo file_get_contents($cacheFile);
            exit();
        }

        // Construir WHERE común
        $where = " WHERE 1=1";
        $params = [];

        if (!empty($search)) {
            $where .= " AND (name LIKE :search
                     OR description LIKE :search
                     OR badge LIKE :search
                     OR origin LIKE :search
                     OR article_number LIKE :search)";
            $params[':search'] = '%' . trim($search) . '%';
        }

        if (!empty($category)) {
            $where .= " AND category = :category";
            $params[':category'] = $category;
        }

        if (!empty($supplier)) {
            $where .= " AND origin = :supplier";
            $params[':supplier'] = $supplier;
        }

        if (!empty($stock_status)) {
            if ($stock_status === 'in_stock') {
                $where .= " AND stock > 0";
            } elseif ($stock_status === 'out_of_stock') {
                $where .= " AND stock = 0";
            } elseif ($stock_status === 'low_stock') {
                $where .= " AND stock > 0 AND stock <= 10";
            }
        }

        // Total de productos que coinciden con los filtros (sin paginación)
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM products" . $where);
        $countStmt->execute($params);
        $totalMatched = intval($countStmt->fetchColumn());

        // Lista de marcas (origins) disponibles para el filtro "Hersteller".
        // Ignora el propio filtro de supplier para que el usuario siga viendo
        // todas las marcas de la categoría aunque tenga una seleccionada.
        $originsWhere = " WHERE 1=1";
        $originsParams = [];
        if (!empty($search)) {
            $originsWhere .= " AND (name LIKE :search OR description LIKE :search OR badge LIKE :search OR origin LIKE :search OR article_number LIKE :search)";
            $originsParams[':search'] = '%' . trim($search) . '%';
        }
        if (!empty($category)) {
            $originsWhere .= " AND category = :category";
            $originsParams[':category'] = $category;
        }
        if (!empty($stock_status)) {
            if ($stock_status === 'in_stock')      $originsWhere .= " AND stock > 0";
            elseif ($stock_status === 'out_of_stock') $originsWhere .= " AND stock = 0";
            elseif ($stock_status === 'low_stock')    $originsWhere .= " AND stock > 0 AND stock <= 10";
        }
        $originsStmt = $pdo->prepare("SELECT DISTINCT origin FROM products" . $originsWhere . " AND origin IS NOT NULL AND origin <> '' ORDER BY origin ASC");
        $originsStmt->execute($originsParams);
        $allOrigins = array_map(function($r) { return $r['origin']; }, $originsStmt->fetchAll(PDO::FETCH_ASSOC));

        // Orden: in-stock primero, luego según parámetro
        switch ($sort) {
            case 'name_asc':   $orderBy = "ORDER BY (stock = 0) ASC, name ASC"; break;
            case 'name_desc':  $orderBy = "ORDER BY (stock = 0) ASC, name DESC"; break;
            case 'price_asc':  $orderBy = "ORDER BY (stock = 0) ASC, price ASC"; break;
            case 'price_desc': $orderBy = "ORDER BY (stock = 0) ASC, price DESC"; break;
            default:           $orderBy = "ORDER BY (stock = 0) ASC, category, created_at DESC";
        }

        // Query principal
        $sql = "SELECT * FROM products" . $where . " " . $orderBy;
        if ($hasLimit) {
            $sql .= " LIMIT :limit OFFSET :offset";
        }

        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        if ($hasLimit) {
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        }
        $stmt->execute();
        $products = $stmt->fetchAll();
        
        // Procesar cada producto
        foreach ($products as &$product) {
            // Agregar URLs completas de las imágenes
            $db_image_url = $product['image_url'] ?? null; // URL guardada desde el Excel
            $image_urls = [];
            $image_fields = ['image', 'image2', 'image3', 'image4'];

            foreach ($image_fields as $field) {
                if (!empty($product[$field])) {
                    $image_urls[] = getUploadBaseUrl() . $product[$field];
                } else {
                    $image_urls[] = null;
                }
            }

            $product['image_urls'] = $image_urls;
            // Prioridad: imagen subida manualmente → URL del Excel → null
            $base_url = $image_urls[0] ?? $db_image_url;
            $product['image_url'] = $base_url;

            // Generar variantes de extensión para que el frontend pruebe en orden
            $product['image_url_candidates'] = buildImageCandidates($base_url);
            
            // Convertir tipos de datos
            $product['id'] = intval($product['id']);
            $product['price'] = floatval($product['price']);
            $product['stock'] = intval($product['stock'] ?? 0);
            $product['heat_level'] = intval($product['heat_level']);
            $product['rating'] = floatval($product['rating']);
            $product['weight_kg'] = floatval($product['weight_kg'] ?? 0.5);
            $product['shipping_on_request'] = intval($product['shipping_on_request'] ?? 0);

            // Asegurar que category no sea null
            if (empty($product['category'])) {
                $product['category'] = 'hot-sauce';
            }
            
            // Añadir estado de stock
            if ($product['stock'] == 0) {
                $product['stock_status'] = 'out_of_stock';
            } elseif ($product['stock'] <= 10) {
                $product['stock_status'] = 'low_stock';
            } else {
                $product['stock_status'] = 'in_stock';
            }
        }
        
        // Estadísticas GLOBALES (sobre todos los productos que coinciden con los filtros,
        // no solo la página actual). Si no hay paginación, reutilizamos el array cargado.
        if ($hasLimit) {
            $statsStmt = $pdo->prepare("
                SELECT
                    COUNT(*) AS total_products,
                    SUM(CASE WHEN category = 'hot-sauce' OR category IS NULL OR category = '' THEN 1 ELSE 0 END) AS hot_sauces,
                    SUM(CASE WHEN category = 'bbq-sauce' THEN 1 ELSE 0 END) AS bbq_sauces,
                    COALESCE(SUM(stock), 0) AS total_stock,
                    SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock,
                    SUM(CASE WHEN stock > 0 AND stock <= 10 THEN 1 ELSE 0 END) AS low_stock,
                    SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) AS in_stock
                FROM products" . $where);
            $statsStmt->execute($params);
            $s = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: [];
            $stats = [
                'total_products' => intval($s['total_products'] ?? 0),
                'hot_sauces'     => intval($s['hot_sauces'] ?? 0),
                'bbq_sauces'     => intval($s['bbq_sauces'] ?? 0),
                'total_stock'    => intval($s['total_stock'] ?? 0),
                'out_of_stock'   => intval($s['out_of_stock'] ?? 0),
                'low_stock'      => intval($s['low_stock'] ?? 0),
                'in_stock'       => intval($s['in_stock'] ?? 0),
            ];
        } else {
            $hot_sauces = array_filter($products, function($p) {
                return $p['category'] === 'hot-sauce' || empty($p['category']);
            });
            $bbq_sauces = array_filter($products, function($p) {
                return $p['category'] === 'bbq-sauce';
            });
            $total_stock = array_sum(array_column($products, 'stock'));
            $out_of_stock_count = count(array_filter($products, function($p) {
                return $p['stock'] == 0;
            }));
            $low_stock_count = count(array_filter($products, function($p) {
                return $p['stock'] > 0 && $p['stock'] <= 10;
            }));
            $stats = [
                'total_products' => count($products),
                'hot_sauces'     => count($hot_sauces),
                'bbq_sauces'     => count($bbq_sauces),
                'total_stock'    => $total_stock,
                'out_of_stock'   => $out_of_stock_count,
                'low_stock'      => $low_stock_count,
                'in_stock'       => count($products) - $out_of_stock_count,
            ];
        }

        $json = json_encode([
            'success'     => true,
            'products'    => $products,
            'total'       => $totalMatched,
            'count'       => count($products),
            'offset'      => $offset,
            'limit'       => $hasLimit ? $limit : null,
            'has_more'    => $hasLimit ? (($offset + count($products)) < $totalMatched) : false,
            'all_origins' => $allOrigins,
            'stats'       => $stats,
        ]);
        // Guardar en caché si es la llamada sin filtros (incluye bust para actualizar)
        if ($isNoFilter) {
            @file_put_contents($cacheFile, $json, LOCK_EX);
        }
        echo $json;
    }
    
} catch (Exception $e) {
    http_response_code(500);
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