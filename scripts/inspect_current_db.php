<?php
require_once __DIR__ . '/../config/database.php';
global $pdo;
echo "PDO Driver: " . ($pdo ? $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) : 'NONE') . "\n";
if ($pdo) {
    $rows = $pdo->query("SELECT * FROM media ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
    echo "Media rows in DB (" . count($rows) . "):\n";
    foreach ($rows as $r) {
        echo " - ID: {$r['id']}, Type: {$r['type']}, Name: {$r['name']}, URL: {$r['url']}\n";
    }

    $items = $pdo->query("SELECT * FROM media_items ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
    echo "Media_items rows in DB (" . count($items) . "):\n";
    foreach ($items as $r) {
        echo " - ID: {$r['id']}, Type: {$r['media_type']}, Title: {$r['title']}, URL: {$r['url']}\n";
    }
}
