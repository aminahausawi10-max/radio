<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $db->query("SELECT setting_key, setting_value FROM settings");
    if (isset($rows['error'])) {
        echo json_encode(['success' => false, 'error' => $rows['error']]);
        exit;
    }
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    echo json_encode(['success' => true, 'settings' => $settings]);
    exit;
}

if ($method === 'POST') {
    // Only logged in admin can update settings
    if (empty($_SESSION['admin_logged_in'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    foreach ($input as $key => $val) {
        if ($key === 'action') continue;
        $db->query("
            INSERT INTO settings (setting_key, setting_value, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
        ", [$key, (string)$val]);
    }

    echo json_encode(['success' => true, 'message' => 'Settings updated successfully']);
    exit;
}
