<?php
session_start();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
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

    $mediaItem = [
        'id' => round(microtime(true) * 1000),
        'type' => $type,
        'name' => $name,
        'category' => $category,
        'url' => $finalUrl,
        'created_at' => date('Y-m-d H:i:s'),
        'size' => !empty($dataUrl) ? round(strlen($dataUrl) * 0.75 / 1024, 1) . ' KB' : 'External Link'
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Media uploaded successfully',
        'media' => $mediaItem
    ]);
    exit;
}

echo json_encode(['error' => 'Method not allowed']);
