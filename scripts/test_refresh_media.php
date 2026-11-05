<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['HTTP_HOST'] = 'localhost';
ob_start();
require __DIR__ . '/../api/upload.php';
$output = ob_get_clean();
$json = json_decode($output, true);
echo "Success: " . ($json['success'] ? 'true' : 'false') . "\n";
echo "Count: " . (is_array($json['media']) ? count($json['media']) : 0) . "\n";
if (is_array($json['media'])) {
    foreach (array_slice($json['media'], 0, 5) as $m) {
        echo " - [{$m['id']}] {$m['type']} : {$m['name']} ({$m['url']})\n";
    }
}
