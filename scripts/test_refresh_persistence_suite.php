<?php
/**
 * Arab Hausa RTV - Media Refresh Persistence QA Test Suite
 * Verifies that media NEVER disappears after browser refresh or page reload.
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

function httpReq($url, $method = 'GET', $body = null, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $allHeaders = array_merge([
        'Cache-Control: no-cache, no-store, must-revalidate',
        'Pragma: no-cache'
    ], $headers);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $res, 'json' => json_decode($res, true)];
}

echo "============================================================\n";
echo "ARAB HAUSA RTV - MEDIA REFRESH PERSISTENCE TEST SUITE\n";
echo "============================================================\n\n";

// 1. Upload an Image and verify persistence across multiple refreshes
$photoPayload = json_encode([
    'type' => 'photo',
    'title' => 'Permanent Refresh Test Photo ' . uniqid(),
    'category' => 'TV Studio',
    'dataUrl' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
]);
$uploadPhotoRes = httpReq("$baseUrl/api/upload", 'POST', $photoPayload, [
    'Content-Type: application/json',
    "X-Admin-Password: $adminPass"
]);

check("1. Photo upload succeeds", $uploadPhotoRes['code'] === 200 && !empty($uploadPhotoRes['json']['success']));
$uploadedPhotoUrl = $uploadPhotoRes['json']['url'] ?? '';
$uploadedPhotoId = $uploadPhotoRes['json']['media']['id'] ?? '';
check("2. Photo URL is permanent /uploads/ path", strpos($uploadedPhotoUrl, '/uploads/') === 0, "URL: $uploadedPhotoUrl");

// Simulate 3 consecutive page refreshes (GET /api/upload with cache busters)
$photoPersistsAcrossRefreshes = true;
for ($r = 1; $r <= 3; $r++) {
    $refreshRes = httpReq("$baseUrl/api/upload?t=" . microtime(true));
    $catalog = $refreshRes['json']['media'] ?? [];
    $found = false;
    foreach ($catalog as $item) {
        if ($item['url'] === $uploadedPhotoUrl && $item['type'] === 'photo') {
            $found = true;
            break;
        }
    }
    if (!$found) {
        $photoPersistsAcrossRefreshes = false;
        break;
    }
}
check("3. Photo persists across 3 consecutive page refreshes", $photoPersistsAcrossRefreshes);

// 2. Upload a Video and verify persistence across page refreshes
$videoPayload = json_encode([
    'type' => 'video',
    'title' => 'Permanent Refresh Test Video ' . uniqid(),
    'category' => 'TV Broadcast',
    'dataUrl' => 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAA'
]);
$uploadVideoRes = httpReq("$baseUrl/api/upload", 'POST', $videoPayload, [
    'Content-Type: application/json',
    "X-Admin-Password: $adminPass"
]);

check("4. Video upload succeeds", $uploadVideoRes['code'] === 200 && !empty($uploadVideoRes['json']['success']));
$uploadedVideoUrl = $uploadVideoRes['json']['url'] ?? '';
check("5. Video URL is permanent storage path", strpos($uploadedVideoUrl, '/uploads/') === 0, "URL: $uploadedVideoUrl");

$videoPersistsAcrossRefreshes = true;
for ($r = 1; $r <= 3; $r++) {
    $refreshRes = httpReq("$baseUrl/api/upload?t=" . microtime(true));
    $catalog = $refreshRes['json']['media'] ?? [];
    $found = false;
    foreach ($catalog as $item) {
        if ($item['url'] === $uploadedVideoUrl && $item['type'] === 'video') {
            $found = true;
            break;
        }
    }
    if (!$found) {
        $videoPersistsAcrossRefreshes = false;
        break;
    }
}
check("6. Video persists across 3 consecutive page refreshes", $videoPersistsAcrossRefreshes);

// 3. Upload a Voice Note and verify persistence across page refreshes
$voicePayload = json_encode([
    'type' => 'voicenote',
    'title' => 'Permanent Refresh Test Voice Note ' . uniqid(),
    'category' => 'Voice Note Dispatch',
    'dataUrl' => 'data:audio/webm;codecs=opus;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAAAAEUAAAAAAAAAAAB'
]);
$uploadVoiceRes = httpReq("$baseUrl/api/upload", 'POST', $voicePayload, [
    'Content-Type: application/json',
    "X-Admin-Password: $adminPass"
]);

check("7. Voice Note upload succeeds", $uploadVoiceRes['code'] === 200 && !empty($uploadVoiceRes['json']['success']));
$uploadedVoiceUrl = $uploadVoiceRes['json']['url'] ?? '';
check("8. Voice Note URL is permanent /uploads/voice_ path", strpos($uploadedVoiceUrl, '/uploads/voice_') === 0, "URL: $uploadedVoiceUrl");

$voicePersistsAcrossRefreshes = true;
for ($r = 1; $r <= 3; $r++) {
    $refreshRes = httpReq("$baseUrl/api/upload?t=" . microtime(true));
    $catalog = $refreshRes['json']['media'] ?? [];
    $found = false;
    foreach ($catalog as $item) {
        if ($item['url'] === $uploadedVoiceUrl && $item['type'] === 'voicenote') {
            $found = true;
            break;
        }
    }
    if (!$found) {
        $voicePersistsAcrossRefreshes = false;
        break;
    }
}
check("9. Voice Note persists across 3 consecutive page refreshes", $voicePersistsAcrossRefreshes);

// 4. Verification that index.html contains ZERO hardcoded dummy media cards
$indexHtml = file_get_contents(__DIR__ . '/../public/index.html');
$hasDummyHomeCard = strpos($indexHtml, 'test-streams.mux.dev') !== false;
check("10. Public index.html has NO hardcoded mux dummy cards", !$hasDummyHomeCard);

// 5. Verification of Service Worker rules
$swJs = file_get_contents(__DIR__ . '/../public/sw.js');
$swBypassesUploads = strpos($swJs, "url.includes('/uploads/')") !== false;
check("11. Service Worker strictly bypasses /uploads/ directory", $swBypassesUploads);

$swNetworkFirstScripts = strpos($swJs, "fetch(event.request)") !== false && strpos($swJs, "caches.open(CACHE_NAME)") !== false;
check("12. Service Worker scripts strategy is network-first with cache fallback", $swNetworkFirstScripts);

// 6. Verify News and Schedules intact
$newsRes = httpReq("$baseUrl/api/posts");
check("13. News API intact and returning posts", $newsRes['code'] === 200 && is_array($newsRes['json']), "Posts count: " . count($newsRes['json'] ?? []));

$scheduleRes = httpReq("$baseUrl/api/schedule");
check("14. Schedule API intact and returning schedule", $scheduleRes['code'] === 200 && is_array($scheduleRes['json']['schedule'] ?? null));

echo "\n============================================================\n";
echo "SUMMARY: $passed PASSED, $failed FAILED\n";
echo "============================================================\n";

if ($failed > 0) exit(1);
exit(0);
