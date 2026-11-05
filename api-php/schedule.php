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
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$dataFile = __DIR__ . '/../data/schedule.json';
$pubDataFile = __DIR__ . '/../public/data/schedule.json';

function getLocalSchedule($file) {
    $tmpFile = sys_get_temp_dir() . '/arab_hausa_data/' . basename($file);
    if (file_exists($tmpFile)) {
        $content = @file_get_contents($tmpFile);
        $json = json_decode($content, true);
        if (is_array($json) && !empty($json)) return $json;
    }
    if (file_exists($file)) {
        $content = @file_get_contents($file);
        $json = json_decode($content, true);
        if (is_array($json)) return $json;
    }
    return [];
}

function saveLocalSchedule($file, $pubFile, $items) {
    $json = json_encode(array_values($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $tmpDir = sys_get_temp_dir() . '/arab_hausa_data';
    if (!is_dir($tmpDir)) @mkdir($tmpDir, 0777, true);
    @file_put_contents($tmpDir . '/schedule.json', $json);

    $dir = dirname($file);
    if (@is_dir($dir) || @mkdir($dir, 0777, true)) {
        @file_put_contents($file, $json);
    }
    $pubDir = dirname($pubFile);
    if (@is_dir($pubDir) || @mkdir($pubDir, 0777, true)) {
        @file_put_contents($pubFile, $json);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $type = $_GET['type'] ?? '';

    // Fast 1ms Local File Feed
    $schedule = getLocalSchedule($dataFile);
    if (empty($schedule)) {
        $schedule = getLocalSchedule($pubDataFile);
    }

    if (empty($schedule)) {
        // Attempt Neon if local store is empty
        try {
            require_once __DIR__ . '/db.php';
            $db = getDB();
            $sql = "SELECT id, title, host, time_slot, broadcast_type, description, is_live FROM schedules";
            $params = [];

            if (!empty($type)) {
                $sql .= " WHERE broadcast_type ILIKE $1";
                $params[] = $type;
            }

            $sql .= " ORDER BY id ASC";
            $rows = $db->query($sql, $params);
            if (is_array($rows) && !isset($rows['error']) && count($rows) > 0) {
                $schedule = $rows;
            }
        } catch (\Throwable $e) {}
    } else {
        if (!empty($type)) {
            $t = strtolower($type);
            $schedule = array_values(array_filter($schedule, function($item) use ($t) {
                return strtolower($item['broadcast_type'] ?? '') === $t;
            }));
        }
    }

    echo json_encode(['success' => true, 'schedule' => $schedule ?: []]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $title = trim($input['title'] ?? '');
    $host = trim($input['host'] ?? '');
    $time_slot = trim($input['time_slot'] ?? '');
    $type = trim($input['broadcast_type'] ?? 'Radio');
    $desc = trim($input['description'] ?? '');
    $is_live = !empty($input['is_live']) ? true : false;

    if (empty($title) || empty($time_slot)) {
        echo json_encode(['success' => false, 'message' => 'Title and time slot are required']);
        exit;
    }

    $newItem = [
        'id' => round(microtime(true) * 1000),
        'title' => $title,
        'host' => $host,
        'time_slot' => $time_slot,
        'broadcast_type' => $type,
        'description' => $desc,
        'is_live' => $is_live
    ];

    $items = getLocalSchedule($dataFile);
    $items[] = $newItem;
    saveLocalSchedule($dataFile, $pubDataFile, $items);

    // Broadcast Real-Time Schedule Update to all visitors
    try {
        require_once __DIR__ . '/../config/database.php';
        if (function_exists('recordSystemEvent')) {
            recordSystemEvent('schedule_updated', $newItem);
        }
    } catch (\Throwable $e) {}

    // Also attempt Neon insert
    try {
        require_once __DIR__ . '/db.php';
        $db = getDB();
        $db->query("
            INSERT INTO schedules (title, host, time_slot, broadcast_type, description, is_live)
            VALUES ($1, $2, $3, $4, $5, $6)
        ", [$title, $host, $time_slot, $type, $desc, $is_live ? 1 : 0]);
    } catch (\Throwable $e) {}

    echo json_encode(['success' => true, 'message' => 'Program added to schedule']);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id > 0) {
        $items = getLocalSchedule($dataFile);
        $items = array_values(array_filter($items, function($item) use ($id) {
            return (int)($item['id'] ?? 0) !== $id;
        }));
        saveLocalSchedule($dataFile, $pubDataFile, $items);

        // Broadcast Real-Time Schedule Update to all visitors
        try {
            require_once __DIR__ . '/../config/database.php';
            if (function_exists('recordSystemEvent')) {
                recordSystemEvent('schedule_updated', ['deleted_id' => $id]);
            }
        } catch (\Throwable $e) {}

        try {
            require_once __DIR__ . '/db.php';
            $db = getDB();
            $db->query("DELETE FROM schedules WHERE id = $1", [$id]);
        } catch (\Throwable $e) {}

        echo json_encode(['success' => true, 'message' => 'Program deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid program ID']);
    }
    exit;
}

echo json_encode(['error' => 'Method not allowed']);
