<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $type = $_GET['type'] ?? '';
    $sql = "SELECT id, title, host, time_slot, broadcast_type, description, is_live FROM schedules";
    $params = [];

    if (!empty($type)) {
        $sql .= " WHERE broadcast_type ILIKE $1";
        $params[] = $type;
    }

    $sql .= " ORDER BY id ASC";
    $rows = $db->query($sql, $params);
    echo json_encode(['success' => true, 'schedule' => $rows ?: []]);
    exit;
}

if ($method === 'POST') {
    if (empty($_SESSION['admin_logged_in'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $title = trim($input['title'] ?? '');
    $host = trim($input['host'] ?? '');
    $time_slot = trim($input['time_slot'] ?? '');
    $type = trim($input['broadcast_type'] ?? 'Radio');
    $desc = trim($input['description'] ?? '');
    $is_live = !empty($input['is_live']) ? 1 : 0;

    if (empty($title) || empty($time_slot)) {
        echo json_encode(['success' => false, 'message' => 'Title and time slot are required']);
        exit;
    }

    $db->query("
        INSERT INTO schedules (title, host, time_slot, broadcast_type, description, is_live)
        VALUES ($1, $2, $3, $4, $5, $6)
    ", [$title, $host, $time_slot, $type, $desc, $is_live]);

    echo json_encode(['success' => true, 'message' => 'Program added to schedule']);
    exit;
}

if ($method === 'DELETE') {
    if (empty($_SESSION['admin_logged_in'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    $id = intval($_GET['id'] ?? 0);
    if ($id > 0) {
        $db->query("DELETE FROM schedules WHERE id = $1", [$id]);
        echo json_encode(['success' => true, 'message' => 'Program removed']);
        exit;
    }
    echo json_encode(['success' => false, 'message' => 'Invalid ID']);
    exit;
}
