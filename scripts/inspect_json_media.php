<?php
$f1 = __DIR__ . '/../data/media.json';
$f2 = __DIR__ . '/../public/data/media.json';
echo "data/media.json exists: " . (file_exists($f1) ? 'yes' : 'no') . "\n";
if (file_exists($f1)) {
    $j1 = json_decode(file_get_contents($f1), true) ?: [];
    echo "data/media.json count: " . count($j1) . "\n";
    foreach ($j1 as $item) {
        echo " - ID: " . ($item['id'] ?? '') . ", Name: " . ($item['name'] ?? ($item['title'] ?? '')) . ", URL: " . ($item['url'] ?? '') . "\n";
    }
}
echo "public/data/media.json exists: " . (file_exists($f2) ? 'yes' : 'no') . "\n";
if (file_exists($f2)) {
    $j2 = json_decode(file_get_contents($f2), true) ?: [];
    echo "public/data/media.json count: " . count($j2) . "\n";
    foreach ($j2 as $item) {
        echo " - ID: " . ($item['id'] ?? '') . ", Name: " . ($item['name'] ?? ($item['title'] ?? '')) . ", URL: " . ($item['url'] ?? '') . "\n";
    }
}
