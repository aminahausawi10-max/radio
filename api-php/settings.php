<?php
if (isset($_COOKIE[session_name()])) {
    @session_start();
    @session_write_close();
}
header('Content-Type: application/json');
header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$dataFile = __DIR__ . '/../data/settings.json';
$pubDataFile = __DIR__ . '/../public/data/settings.json';

function getLocalSettings($file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $json = json_decode($content, true);
        if (is_array($json)) return $json;
    }
    return [];
}

function saveLocalSettings($file, $pubFile, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));

    $pubDir = dirname($pubFile);
    if (!is_dir($pubDir)) mkdir($pubDir, 0777, true);
    file_put_contents($pubFile, json_encode($data, JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Fast 1ms Local File Feed
    $settings = getLocalSettings($dataFile);
    if (empty($settings)) {
        $settings = getLocalSettings($pubDataFile);
    }

    if (empty($settings)) {
        // Attempt Neon if configured
        try {
            require_once __DIR__ . '/db.php';
            $db = getDB();
            $rows = $db->query("SELECT setting_key, setting_value FROM settings");
            if (is_array($rows) && !isset($rows['error']) && count($rows) > 0) {
                foreach ($rows as $row) {
                    $settings[$row['setting_key']] = $row['setting_value'];
                }
            }
        } catch (\Throwable $e) {}
    }

    echo json_encode(['success' => true, 'settings' => $settings]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

    // Load existing settings and merge
    $currentSettings = getLocalSettings($dataFile);
    foreach ($input as $key => $val) {
        if ($key === 'action') continue;
        $currentSettings[$key] = (string)$val;
    }
    saveLocalSettings($dataFile, $pubDataFile, $currentSettings);

    // Also attempt Neon update if available
    try {
        require_once __DIR__ . '/db.php';
        $db = getDB();
        foreach ($input as $key => $val) {
            if ($key === 'action') continue;
            $db->query("
                INSERT INTO settings (setting_key, setting_value, updated_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
            ", [$key, (string)$val]);
        }
    } catch (\Throwable $e) {}

    echo json_encode(['success' => true, 'message' => 'Settings updated successfully']);
    exit;
}
