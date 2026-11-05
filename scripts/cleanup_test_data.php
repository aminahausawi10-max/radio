<?php
require_once __DIR__ . '/../config/database.php';
global $pdo;

if ($pdo) {
    $deleted = $pdo->exec("DELETE FROM media WHERE name LIKE 'Test Item%' OR name LIKE 'Unique Test%' OR name LIKE 'Rapid Click%' OR name LIKE 'QA Test%' OR name LIKE 'Test JPG%' OR name LIKE 'Test WebP%' OR name LIKE 'Test MP3%' OR name LIKE 'Test WebM%'");
    echo "Removed $deleted test rows from 'media' table.\n";

    $deletedItems = $pdo->exec("DELETE FROM media_items WHERE title LIKE 'Test Item%' OR title LIKE 'Unique Test%' OR title LIKE 'Rapid Click%' OR title LIKE 'QA Test%' OR title LIKE 'Test JPG%' OR title LIKE 'Test WebP%' OR title LIKE 'Test MP3%' OR title LIKE 'Test WebM%'");
    echo "Removed $deletedItems test rows from 'media_items' table.\n";
}

// Clean JSON files
$jsonFiles = [
    __DIR__ . '/../data/media.json',
    __DIR__ . '/../data/media_items.json',
    __DIR__ . '/../public/data/media.json',
    __DIR__ . '/../public/data/media_items.json'
];

foreach ($jsonFiles as $file) {
    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true) ?: [];
        $clean = array_values(array_filter($data, function($item) {
            $n = $item['name'] ?? ($item['title'] ?? '');
            return !(strpos($n, 'Test Item') === 0 || strpos($n, 'Unique Test') === 0 || strpos($n, 'Rapid Click') === 0 || strpos($n, 'QA Test') === 0 || strpos($n, 'Test JPG') === 0 || strpos($n, 'Test WebP') === 0 || strpos($n, 'Test MP3') === 0 || strpos($n, 'Test WebM') === 0);
        }));
        file_put_contents($file, json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        echo "Cleaned test items from " . basename($file) . " (remaining: " . count($clean) . ")\n";
    }
}

echo "Cleanup finished.\n";
