<?php
// Test 1: Status
$_GET['action'] = 'status';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['HTTP_HOST'] = '127.0.0.1:8099';
ob_start();
require __DIR__ . '/../api/tiktok.php';
$out = ob_get_clean();
$statusJson = json_decode($out, true);
echo "1. Status check: success=" . ($statusJson['success'] ? 'true' : 'false') . "\n";

// Test 2: Save Settings with admin authorization
$masterAdminPass = 'YourSuperSecureAdminPassword2026';
$_SERVER['HTTP_X_ADMIN_PASSWORD'] = $masterAdminPass;
$_GET['action'] = 'save_settings';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST = [
    'client_key' => 'aw1234567890test',
    'client_secret' => 'secret_test_abcdef123456',
    'redirect_uri' => 'https://www.arab-hausa-rtv.com.ng/api/tiktok?action=callback'
];

ob_start();
require __DIR__ . '/../api/tiktok.php';
$saveOut = ob_get_clean();
$saveJson = json_decode($saveOut, true);
echo "2. Save Settings: success=" . ($saveJson['success'] ? 'true' : 'false') . ", configured=" . ($saveJson['app_configured'] ? 'true' : 'false') . "\n";

// Test 3: Generate Auth URL
$_GET['action'] = 'auth_url';
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require __DIR__ . '/../api/tiktok.php';
$authOut = ob_get_clean();
$authJson = json_decode($authOut, true);
echo "3. Auth URL: success=" . ($authJson['success'] ? 'true' : 'false') . "\n";
echo "   URL: " . ($authJson['auth_url'] ?? 'none') . "\n";
