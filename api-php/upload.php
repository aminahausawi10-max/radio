<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$dataFile = __DIR__ . '/../data/media.json';
$publicDataFile = __DIR__ . '/../public/data/media.json';

function getLocalMedia($file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $json = json_decode($content, true);
        if (is_array($json)) return $json;
    }
    return [];
}

function saveLocalMedia($file, $pubFile, $items) {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    file_put_contents($file, json_encode($items, JSON_PRETTY_PRINT));

    $pubDir = dirname($pubFile);
    if (!is_dir($pubDir)) mkdir($pubDir, 0777, true);
    file_put_contents($pubFile, json_encode($items, JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $type = $_GET['type'] ?? '';
    $media = [];

    // Attempt Neon query
    try {
        require_once __DIR__ . '/db.php';
        $db = NeonDB::getInstance();
        $query = "SELECT id, type, name, category, url, size, created_at FROM media";
        $params = [];
        if (!empty($type) && $type !== 'all') {
            $query .= " WHERE type = $1";
            $params[] = $type;
        }
        $query .= " ORDER BY id DESC LIMIT 60";
        $res = $db->query($query, $params);
        if (is_array($res) && !isset($res['error']) && count($res) > 0) {
            $media = $res;
        }
    } catch (Exception $e) {}

    if (empty($media)) {
        $media = getLocalMedia($dataFile);
        if (!empty($type) && $type !== 'all') {
            $media = array_values(array_filter($media, function($m) use ($type) {
                return ($m['type'] ?? '') === $type;
            }));
        }
    }

    echo json_encode(['success' => true, 'media' => $media]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $type = strtolower($input['type'] ?? 'photo');
    $name = $input['name'] ?? 'Uploaded Media';
    $category = $input['category'] ?? ($type === 'video' ? 'TV Broadcast' : 'TV Studio');
    $dataUrl = $input['dataUrl'] ?? '';
    $url = $input['url'] ?? '';

    $finalUrl = !empty($url) ? $url : $dataUrl;

    if (empty($finalUrl)) {
        echo json_encode(['success' => false, 'message' => 'File data or URL is required']);
        exit;
    }

    $size = $input['size'] ?? (!empty($dataUrl) ? round(strlen($dataUrl) * 0.75 / 1024, 1) . ' KB' : 'Direct Stream');

    $newItem = [
        'id' => round(microtime(true) * 1000),
        'type' => $type,
        'name' => $name,
        'category' => $category,
        'url' => $finalUrl,
        'size' => $size,
        'created_at' => date('c')
    ];

    $items = getLocalMedia($dataFile);
    array_unshift($items, $newItem);
    saveLocalMedia($dataFile, $publicDataFile, $items);

    try {
        require_once __DIR__ . '/db.php';
        $db = NeonDB::getInstance();
        $db->query("INSERT INTO media (type, name, category, url, size) VALUES ($1, $2, $3, $4, $5)",
            [$type, $name, $category, $finalUrl, $size]
        );
    } catch (Exception $e) {}

    echo json_encode([
        'success' => true,
        'message' => 'Media uploaded successfully! It is now active on TV and media feeds.',
        'media' => $newItem
    ]);
    exit;
}

if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid ID']);
        exit;
    }

    $items = getLocalMedia($dataFile);
    $filtered = array_values(array_filter($items, function($m) use ($id) {
        return ($m['id'] ?? 0) != $id;
    }));
    saveLocalMedia($dataFile, $publicDataFile, $filtered);

    try {
        require_once __DIR__ . '/db.php';
        $db = NeonDB::getInstance();
        $db->query("DELETE FROM media WHERE id = $1", [$id]);
    } catch (Exception $e) {}

    echo json_encode(['success' => true, 'message' => 'Media deleted successfully']);
    exit;
}

echo json_encode(['error' => 'Method not allowed']);
