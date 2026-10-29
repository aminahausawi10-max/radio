<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit;
}

$db = NeonDB::getInstance();

if ($method === 'GET') {
    try {
        $type = $_GET['type'] ?? '';
        $query = "SELECT id, type, name, category, url, size, created_at FROM media";
        $params = [];
        if (!empty($type) && $type !== 'all') {
            $query .= " WHERE type = $1";
            $params[] = $type;
        }
        $query .= " ORDER BY id DESC LIMIT 60";
        $media = $db->query($query, $params);
        echo json_encode(['success' => true, 'media' => $media]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $type = $input['type'] ?? 'photo';
    $name = $input['name'] ?? 'Uploaded Media';
    $category = $input['category'] ?? 'General';
    $dataUrl = $input['dataUrl'] ?? '';
    $url = $input['url'] ?? '';

    $finalUrl = !empty($url) ? $url : $dataUrl;

    if (empty($finalUrl)) {
        echo json_encode(['success' => false, 'message' => 'File data or URL is required']);
        exit;
    }

    $size = !empty($input['size']) ? $input['size'] : (!empty($dataUrl) ? round(strlen($dataUrl) * 0.75 / 1024, 1) . ' KB' : 'Standard');

    try {
        $query = "INSERT INTO media (type, name, category, url, size) VALUES ($1, $2, $3, $4, $5) RETURNING *";
        $res = $db->query($query, [$type, $name, $category, $finalUrl, $size]);
        $item = !empty($res[0]) ? $res[0] : [
            'id' => round(microtime(true) * 1000),
            'type' => $type,
            'name' => $name,
            'category' => $category,
            'url' => $finalUrl,
            'size' => $size,
            'created_at' => date('Y-m-d H:i:s')
        ];

        echo json_encode([
            'success' => true,
            'message' => 'Media uploaded successfully',
            'media' => $item
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid media ID']);
        exit;
    }
    try {
        $db->query("DELETE FROM media WHERE id = $1", [$id]);
        echo json_encode(['success' => true, 'message' => 'Media deleted successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['error' => 'Method not allowed']);
