<?php
/**
 * Arab Hausa RTV - Clean Slate Reset Tool
 * Completely clears Media, News, and Schedule so the administrator can upload fresh content
 */

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-cache, no-store, must-revalidate");

require_once __DIR__ . '/../config/database.php';

// 1. Wipe database tables
global $pdo;
$dbWiped = [];
if ($pdo) {
    $tables = ['media', 'media_items', 'news', 'schedule', 'posts'];
    foreach ($tables as $t) {
        try {
            $pdo->exec("DELETE FROM $t");
            $dbWiped[] = $t;
        } catch (\Throwable $e) {}
    }
}

// 2. Wipe JSON data files
$jsonFiles = [
    __DIR__ . '/../data/media.json',
    __DIR__ . '/../data/media_items.json',
    __DIR__ . '/../data/news.json',
    __DIR__ . '/../data/schedule.json',
    __DIR__ . '/../data/posts.json',
    __DIR__ . '/../public/data/media.json',
    __DIR__ . '/../public/data/news.json',
    __DIR__ . '/../public/data/schedule.json'
];

$clearedFiles = [];
foreach ($jsonFiles as $f) {
    if (file_exists(dirname($f))) {
        @file_put_contents($f, json_encode([], JSON_PRETTY_PRINT));
        $clearedFiles[] = basename($f);
    }
}

echo json_encode([
    'success' => true,
    'message' => 'Clean slate complete! All media, news, and schedule items have been cleared. You can now publish your fresh content.',
    'db_tables_cleared' => $dbWiped,
    'json_files_cleared' => array_unique($clearedFiles),
    'timestamp' => date('c')
]);
