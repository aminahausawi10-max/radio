<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$start = microtime(true);
$db = getDB();
$rows = $db->query("SELECT NOW() as current_time, version() as pg_version");

$latency = round((microtime(true) - $start) * 1000, 2);

if (!empty($rows) && !isset($rows['error'])) {
    $stats = $db->query("
        SELECT 
            (SELECT COUNT(*) FROM settings) as settings_count,
            (SELECT COUNT(*) FROM news) as news_count,
            (SELECT COUNT(*) FROM schedules) as schedules_count,
            (SELECT COUNT(*) FROM admin_users) as admin_count
    ");

    echo json_encode([
        'status' => 'ONLINE',
        'provider' => 'Neon Serverless Lakebase Postgres',
        'latency_ms' => $latency,
        'database_time' => $rows[0]['current_time'] ?? null,
        'postgres_version' => $rows[0]['pg_version'] ?? 'PostgreSQL 17 on Neon',
        'tables_data' => $stats[0] ?? []
    ], JSON_PRETTY_PRINT);
} else {
    http_response_code(500);
    echo json_encode([
        'status' => 'OFFLINE',
        'error' => $rows['error'] ?? 'Connection error'
    ], JSON_PRETTY_PRINT);
}
