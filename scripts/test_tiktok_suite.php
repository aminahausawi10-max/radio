<?php
/**
 * Arab Hausa RTV - TikTok Auto-Publishing Integration Verification Suite
 */

$baseUrl = 'http://127.0.0.1:8099';
$adminPass = 'YourSuperSecureAdminPassword2026';
$passed = 0;
$failed = 0;

function check($title, $condition, $details = '') {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo " [PASS] $title" . ($details ? " ($details)" : "") . "\n";
    } else {
        $failed++;
        echo "![FAIL] $title" . ($details ? " - $details" : "") . "\n";
    }
}

function req($url, $method = 'GET', $body = null, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    $allHeaders = array_merge(['Cache-Control: no-cache'], $headers);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($body) ? json_encode($body) : $body);
            $allHeaders[] = 'Content-Type: application/json';
        }
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $res, 'json' => json_decode($res, true)];
}

echo "============================================================\n";
echo "ARAB HAUSA RTV - TIKTOK INTEGRATION VERIFICATION SUITE\n";
echo "============================================================\n\n";

// --- TEST 1: Status endpoint & Token Secrecy ---
$statusRes = req("$baseUrl/api/tiktok?action=status");
check("1. Status endpoint responds with HTTP 200", $statusRes['code'] === 200);
check("2. Status reports target profile @arab_hausa_rtv", ($statusRes['json']['username'] ?? '') === 'arab_hausa_rtv');
check("3. Status profile link points to tiktok.com/@arab_hausa_rtv", strpos($statusRes['json']['profile_url'] ?? '', 'tiktok.com/@arab_hausa_rtv') !== false);
check("4. Secret tokens are NEVER exposed in status API", !isset($statusRes['json']['access_token']) && !isset($statusRes['json']['refresh_token']) && !isset($statusRes['json']['client_secret']));

// --- TEST 2: Admin Authorization for Settings & Saving Credentials ---
$unauthSave = req("$baseUrl/api/tiktok?action=save_settings", 'POST', ['client_key' => 'unauth_key']);
check("5. Unauthorized settings save is rejected (HTTP 401)", $unauthSave['code'] === 401);

$authSave = req("$baseUrl/api/tiktok?action=save_settings", 'POST', [
    'client_key'    => 'aw_arab_hausa_client_key',
    'client_secret' => 'sec_arab_hausa_secret_98765',
    'redirect_uri'  => 'https://www.arab-hausa-rtv.com.ng/api/tiktok?action=callback'
], ["X-Admin-Password: $adminPass"]);

check("6. Authorized settings save succeeds (HTTP 200)", $authSave['code'] === 200 && ($authSave['json']['success'] ?? false) === true);
check("7. Settings confirms app is configured", ($authSave['json']['app_configured'] ?? false) === true);

// --- TEST 3: Official OAuth v2 Auth URL Generation ---
$authUrlRes = req("$baseUrl/api/tiktok?action=auth_url");
check("8. Auth URL endpoint returns HTTP 200", $authUrlRes['code'] === 200);
$authUrl = $authUrlRes['json']['auth_url'] ?? '';
check("9. Auth URL targets official TikTok OAuth endpoint", strpos($authUrl, 'https://www.tiktok.com/v2/auth/authorize/') === 0);
check("10. Auth URL contains required scopes (user.info.basic,video.publish,video.upload)", 
    strpos($authUrl, 'user.info.basic') !== false && 
    strpos($authUrl, 'video.publish') !== false && 
    strpos($authUrl, 'video.upload') !== false
);
check("11. Auth URL contains secure random CSRF state", !empty($authUrlRes['json']['state']) && strlen($authUrlRes['json']['state']) >= 16);

// --- TEST 4: Token Persistence & Server-Side Security ---
$tokenData = [
    'connected'          => true,
    'open_id'            => 'usr_arab_hausa_open_id',
    'union_id'           => 'usr_arab_hausa_union_id',
    'access_token'       => 'act_test_access_token_arab_hausa_secure',
    'expires_at'         => time() + 7200,
    'refresh_token'      => 'rft_test_refresh_token_rotated_secure',
    'refresh_expires_at' => time() + 15552000,
    'scope'              => 'user.info.basic,video.publish,video.upload',
    'username'           => 'arab_hausa_rtv',
    'display_name'       => 'Arab Hausa RTV Official',
    'avatar_url'         => 'https://www.arab-hausa-rtv.com.ng/images/logo-circle.png',
    'creator_limits'     => [
        'max_video_post_duration_sec' => 600,
        'privacy_level_options' => ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
        'comment_disabled' => false,
        'duet_disabled' => false,
        'stitch_disabled' => false
    ],
    'connected_at'       => date('c'),
    'updated_at'         => date('c')
];
file_put_contents(__DIR__ . '/../data/tiktok_token.json', json_encode($tokenData));

$connectedStatus = req("$baseUrl/api/tiktok?action=status");
check("12. Server recognizes active connected TikTok session", ($connectedStatus['json']['connected'] ?? false) === true);
check("13. Connected account display name matches", ($connectedStatus['json']['display_name'] ?? '') === 'Arab Hausa RTV Official');

// --- TEST 5: Video Publishing API Validation & Input Sanitation ---
$unauthPublish = req("$baseUrl/api/tiktok?action=publish", 'POST', ['video_url' => 'https://example.com/test.mp4']);
check("14. Unauthorized publishing attempt rejected (HTTP 401)", $unauthPublish['code'] === 401);

$noUrlPublish = req("$baseUrl/api/tiktok?action=publish", 'POST', ['video_url' => ''], ["X-Admin-Password: $adminPass"]);
check("15. Publishing without video URL rejected (HTTP 400)", $noUrlPublish['code'] === 400);

// --- TEST 6: Publish Status Polling Endpoint ---
$missingPublishId = req("$baseUrl/api/tiktok?action=publish_status");
check("16. Status polling requires publish_id (HTTP 400)", $missingPublishId['code'] === 400);

// --- TEST 7: Account Disconnect & Cleanup ---
$disconnectRes = req("$baseUrl/api/tiktok?action=disconnect", 'POST', [], ["X-Admin-Password: $adminPass"]);
check("17. Account disconnect executes cleanly (HTTP 200)", $disconnectRes['code'] === 200 && ($disconnectRes['json']['success'] ?? false) === true);

$afterDisconnect = req("$baseUrl/api/tiktok?action=status");
check("18. Account status updates to disconnected", ($afterDisconnect['json']['connected'] ?? true) === false);

// --- TEST 8: Verify Existing Website Systems are Unharmed ---
$publicMedia = req("$baseUrl/api/upload");
check("19. Existing Media upload & catalog API intact", $publicMedia['code'] === 200 && is_array($publicMedia['json']['media'] ?? null));

$newsPosts = req("$baseUrl/api/posts");
check("20. Existing News & Articles API intact", $newsPosts['code'] === 200 && is_array($newsPosts['json'] ?? null));

$schedule = req("$baseUrl/api/schedule");
check("21. Existing Schedules API intact", $schedule['code'] === 200 && is_array($schedule['json']['schedule'] ?? null));

echo "\n============================================================\n";
echo "TIKTOK VERIFICATION SUMMARY: $passed PASSED, $failed FAILED\n";
echo "============================================================\n";

if ($failed > 0) exit(1);
exit(0);
