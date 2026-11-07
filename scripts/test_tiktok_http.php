<?php
$baseUrl = 'http://127.0.0.1:8099';
$adminPass = 'YourSuperSecureAdminPassword2026';

function apiCall($endpoint, $method = 'GET', $body = null, $headers = []) {
    global $baseUrl;
    $ch = curl_init("$baseUrl$endpoint");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $reqHeaders = array_merge(['Cache-Control: no-cache'], $headers);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($body) ? json_encode($body) : $body);
            $reqHeaders[] = 'Content-Type: application/json';
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $res, 'json' => json_decode($res, true)];
}

echo "1. Testing GET /api/tiktok?action=status\n";
$s = apiCall('/api/tiktok?action=status');
echo "   Status Code: {$s['code']}, Success: " . ($s['json']['success'] ? 'true' : 'false') . ", Connected: " . ($s['json']['connected'] ? 'true' : 'false') . "\n";

echo "2. Testing POST /api/tiktok?action=save_settings\n";
$save = apiCall('/api/tiktok?action=save_settings', 'POST', [
    'client_key' => 'aw_test_key_12345',
    'client_secret' => 'sec_test_secret_67890',
    'redirect_uri' => 'https://www.arab-hausa-rtv.com.ng/api/tiktok?action=callback'
], ["X-Admin-Password: $adminPass"]);
echo "   Save Code: {$save['code']}, Configured: " . ($save['json']['app_configured'] ? 'true' : 'false') . "\n";

echo "3. Testing GET /api/tiktok?action=auth_url\n";
$auth = apiCall('/api/tiktok?action=auth_url');
echo "   Auth Code: {$auth['code']}, URL: {$auth['json']['auth_url']}\n";

echo "4. Testing GET /api/tiktok?action=status (after config)\n";
$s2 = apiCall('/api/tiktok?action=status');
echo "   App Configured: " . ($s2['json']['app_configured'] ? 'true' : 'false') . ", Client Key Prefix: {$s2['json']['client_key']}\n";
