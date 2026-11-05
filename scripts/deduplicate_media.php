<?php
require_once __DIR__ . '/../config/database.php';

global $pdo;

echo "--- CHECKING DATABASE FOR DUPLICATES ---\n";
if ($pdo) {
    $rows = $pdo->query("SELECT id, type, name, category, url, created_at FROM media ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
    echo "Total media records: " . count($rows) . "\n";
    $seen = [];
    $duplicates = [];
    foreach ($rows as $r) {
        $key = trim($r['url']);
        if (isset($seen[$key])) {
            $duplicates[] = $r['id'];
        } else {
            $seen[$key] = $r['id'];
        }
    }
    echo "Duplicate media IDs: " . (empty($duplicates) ? "None" : implode(', ', $duplicates)) . "\n";
    if (!empty($duplicates)) {
        $inClause = implode(',', array_map('intval', $duplicates));
        $deleted = $pdo->exec("DELETE FROM media WHERE id IN ($inClause)");
        echo "Cleaned up $deleted duplicate rows from 'media' table.\n";
    }

    $itemRows = $pdo->query("SELECT id, title, media_type, url FROM media_items ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
    echo "Total media_items records: " . count($itemRows) . "\n";
    $seenItems = [];
    $dupItems = [];
    foreach ($itemRows as $r) {
        $key = trim($r['url']);
        if (isset($seenItems[$key])) {
            $dupItems[] = $r['id'];
        } else {
            $seenItems[$key] = $r['id'];
        }
    }
    echo "Duplicate media_items IDs: " . (empty($dupItems) ? "None" : implode(', ', $dupItems)) . "\n";
    if (!empty($dupItems)) {
        $inClause = implode(',', array_map('intval', $dupItems));
        $deleted = $pdo->exec("DELETE FROM media_items WHERE id IN ($inClause)");
        echo "Cleaned up $deleted duplicate rows from 'media_items' table.\n";
    }
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
        $unique = [];
        $seen = [];
        foreach ($data as $item) {
            $u = trim($item['url'] ?? ($item['stream_url'] ?? ''));
            if ($u !== '' && !isset($seen[$u])) {
                $seen[$u] = true;
                $unique[] = $item;
            }
        }
        if (count($unique) !== count($data)) {
            echo "Cleaned " . (count($data) - count($unique)) . " duplicates from " . basename($file) . "\n";
            file_put_contents($file, json_encode($unique, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            echo "No duplicates in " . basename($file) . " (" . count($data) . " items)\n";
        }
    }
}

echo "Deduplication check completed successfully.\n";
