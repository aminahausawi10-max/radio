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
$uploadsDir = __DIR__ . '/../public/uploads';

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
    file_put_contents($file, json_encode(array_values($items), JSON_PRETTY_PRINT));

    $pubDir = dirname($pubFile);
    if (!is_dir($pubDir)) mkdir($pubDir, 0777, true);
    file_put_contents($pubFile, json_encode(array_values($items), JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];

// 1. GET MEDIA
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
        $query .= " ORDER BY id DESC LIMIT 100";
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

// 2. POST NEW MEDIA
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: $_POST;

    $type = strtolower($input['type'] ?? 'photo');
    $name = $input['name'] ?? 'Uploaded Media';
    $category = $input['category'] ?? ($type === 'video' ? 'TV Broadcast' : 'TV Studio');
    $dataUrl = $input['dataUrl'] ?? '';
    $url = $input['url'] ?? '';

    $finalUrl = !empty($url) ? $url : $dataUrl;

    // Handle physical file upload from multipart form data
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0777, true);
        $ext = pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION) ?: 'jpg';
        $filename = 'media_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid()), 0, 5) . '.' . $ext;
        $dest = $uploadsDir . '/' . $filename;
        if (move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
            $finalUrl = '/uploads/' . $filename;
        }
    } elseif (!empty($dataUrl) && strpos($dataUrl, 'data:') === 0) {
        // Handle base64 image/video saving to disk
        if (!is_dir($uploadsDir)) mkdir($uploadsDir, 0777, true);
        if (preg_match('/^data:([^;]+);base64,(.+)$/', $dataUrl, $matches)) {
            $mime = $matches[1];
            $base64Data = base64_decode($matches[2]);
            $ext = 'jpg';
            if (strpos($mime, 'png') !== false) $ext = 'png';
            elseif (strpos($mime, 'gif') !== false) $ext = 'gif';
            elseif (strpos($mime, 'webp') !== false) $ext = 'webp';
            elseif (strpos($mime, 'mp4') !== false) $ext = 'mp4';
            elseif (strpos($mime, 'webm') !== false) $ext = 'webm';
            elseif (strpos($mime, 'audio') !== false || strpos($mime, 'mpeg') !== false) $ext = 'mp3';

            $filename = 'media_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid()), 0, 5) . '.' . $ext;
            file_put_contents($uploadsDir . '/' . $filename, $base64Data);
            $finalUrl = '/uploads/' . $filename;
        }
    }

    if (empty($finalUrl)) {
        echo json_encode(['success' => false, 'message' => 'File data or URL is required']);
        exit;
    }

    $size = $input['size'] ?? (!empty($dataUrl) ? round(strlen($dataUrl) * 0.75 / 1024, 1) . ' KB' : 'HD Media');

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

// 3. DELETE MEDIA
if ($method === 'DELETE') {
    $rawInput = file_get_contents('php://input');
    $body = json_decode($rawInput, true) ?: [];
    $id = strval($_GET['id'] ?? $body['id'] ?? '');

    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'Media ID is required']);
        exit;
    }

    $items = getLocalMedia($dataFile);
    $itemToDelete = null;
    foreach ($items as $m) {
        if (strval($m['id'] ?? '') === $id || ($m['url'] ?? '') === $id) {
            $itemToDelete = $m;
            break;
        }
    }

    // Remove physical file from public/uploads if exists
    if ($itemToDelete && !empty($itemToDelete['url']) && strpos($itemToDelete['url'], '/uploads/') === 0) {
        $filePath = __DIR__ . '/../public' . $itemToDelete['url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    $filtered = array_values(array_filter($items, function($m) use ($id) {
        return strval($m['id'] ?? '') !== $id && ($m['url'] ?? '') !== $id;
    }));
    saveLocalMedia($dataFile, $publicDataFile, $filtered);

    try {
        require_once __DIR__ . '/db.php';
        $db = NeonDB::getInstance();
        $intId = intval($id);
        if ($intId > 0) {
            $db->query("DELETE FROM media WHERE id = $1 OR url = $2", [$intId, $id]);
        } else {
            $db->query("DELETE FROM media WHERE url = $1", [$id]);
        }
    } catch (Exception $e) {}

    echo json_encode(['success' => true, 'message' => 'Media deleted successfully']);
    exit;
}

echo json_encode(['error' => 'Method not allowed']);
