<?php
require_once __DIR__ . '/../config/database.php';
$rows = $pdo->query("SELECT id, type, name, url, created_at FROM media")->fetchAll(PDO::FETCH_ASSOC);
echo "Total rows in media table: " . count($rows) . "\n";
print_r($rows);
$rows2 = $pdo->query("SELECT id, media_type, title, url FROM media_items")->fetchAll(PDO::FETCH_ASSOC);
echo "Total rows in media_items table: " . count($rows2) . "\n";
print_r($rows2);
