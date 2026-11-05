<?php
require_once __DIR__ . '/../config/database.php';
global $pdo;
echo "PDO Driver: " . ($pdo ? $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) : 'None') . "\n";
if ($pdo) {
    $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables: " . implode(', ', $tables) . "\n";
    foreach (['media', 'media_items'] as $tbl) {
        if (in_array($tbl, $tables)) {
            $count = $pdo->query("SELECT COUNT(*) FROM $tbl")->fetchColumn();
            echo " - $tbl rows: $count\n";
            $sample = $pdo->query("SELECT * FROM $tbl ORDER BY id DESC LIMIT 3")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($sample as $r) {
                echo "   Row: " . json_encode($r) . "\n";
            }
        }
    }
}
