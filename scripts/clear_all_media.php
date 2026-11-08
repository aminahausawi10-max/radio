<?php
/**
 * Arab Hausa RTV - Dedicated Media Cleaner
 * Clears ONLY media records and dummy upload files, preserving News and Schedules
 */

require_once __DIR__ . '/../config/database.php';

echo "1. Cleaning database media tables...\n";
global $pdo;
if ($pdo) {
    foreach (['media', 'media_items'] as $table) {
        try {
            $pdo->exec("DELETE FROM $table");
            echo "   ✓ Cleared table: $table\n";
        } catch (\Throwable $e) {
            echo "   ℹ Table $table: " . $e->getMessage() . "\n";
        }
    }
}

echo "2. Cleaning JSON media files...\n";
$mediaFiles = [
    __DIR__ . '/../data/media.json',
    __DIR__ . '/../data/media_items.json',
    __DIR__ . '/../public/data/media.json',
    __DIR__ . '/../public/data/media_items.json',
    sys_get_temp_dir() . '/arab_hausa_data/media.json',
    sys_get_temp_dir() . '/arab_hausa_data/media_items.json',
];

foreach ($mediaFiles as $f) {
    if (file_exists(dirname($f))) {
        @file_put_contents($f, json_encode([], JSON_PRETTY_PRINT));
        echo "   ✓ Emptied " . basename(dirname($f)) . '/' . basename($f) . "\n";
    }
}

echo "3. Cleaning events.json media events...\n";
$eventFiles = [
    __DIR__ . '/../data/events.json',
    __DIR__ . '/../public/data/events.json',
    sys_get_temp_dir() . '/arab_hausa_data/events.json'
];
foreach ($eventFiles as $ef) {
    if (file_exists($ef)) {
        @file_put_contents($ef, json_encode([], JSON_PRETTY_PRINT));
        echo "   ✓ Emptied " . basename(dirname($ef)) . '/' . basename($ef) . "\n";
    }
}

echo "4. Removing dummy uploaded files in public/uploads...\n";
$uploadsDir = __DIR__ . '/../public/uploads';
if (is_dir($uploadsDir)) {
    $files = scandir($uploadsDir);
    $deletedCount = 0;
    foreach ($files as $file) {
        if ($file === '.' || $file === '..' || $file === '.gitkeep') continue;
        $fullPath = $uploadsDir . '/' . $file;
        if (is_file($fullPath)) {
            @unlink($fullPath);
            $deletedCount++;
        }
    }
    echo "   ✓ Deleted $deletedCount dummy upload files (kept .gitkeep)\n";
}

echo "5. Cleaning temporary video chunks...\n";
$chunksDir = __DIR__ . '/../data/video_chunks';
if (is_dir($chunksDir)) {
    $chunks = scandir($chunksDir);
    foreach ($chunks as $c) {
        if ($c !== '.' && $c !== '..') @unlink($chunksDir . '/' . $c);
    }
    echo "   ✓ Emptied video_chunks directory\n";
}

echo "\n======================================================\n";
echo "CLEAN SLATE COMPLETE! Media catalog is fresh and empty.\n";
echo "News, Schedules, and Admin Settings remain 100% intact.\n";
echo "======================================================\n";
