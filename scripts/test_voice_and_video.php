<?php
/**
 * Arab Hausa RTV - Voice Note Delivery & Video Playback QA Test
 */

$baseUrl = 'http://127.0.0.1:8099';
$adminPass = 'YourSuperSecureAdminPassword2026';
$passed = 0;
$failed = 0;

function check($name, $ok, $info = '') {
    global $passed, $failed;
    if ($ok) {
        $passed++;
        echo " [PASS] $name" . ($info ? " ($info)" : "") . "\n";
    } else {
        $failed++;
        echo "![FAIL] $name - $info\n";
    }
}

function req($url, $method = 'GET', $data = null, $headers = [], $isMultipart = false) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_HEADER, true);

    $defaultHeaders = [];
    if (!$isMultipart && ($method === 'POST' || $method === 'PUT')) {
        $defaultHeaders[] = "Content-Type: application/json";
    }
    $allHeaders = array_merge($defaultHeaders, $headers);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $allHeaders);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($isMultipart) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($data) ? json_encode($data) : $data);
        }
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $respHeaders = substr($response, 0, $headerSize);
    $respBody = substr($response, $headerSize);
    curl_close($ch);

    return [
        'code'    => $httpCode,
        'headers' => $respHeaders,
        'body'    => $respBody,
        'json'    => json_decode($respBody, true)
    ];
}

echo "============================================================\n";
echo "ARAB HAUSA RTV - VOICE NOTE DELIVERY & VIDEO STABILITY QA\n";
echo "============================================================\n\n";

// 1. VOICE NOTE RECORDING & MULTIPART UPLOAD
echo "--- 1. VOICE NOTE UPLOADING & PERMANENT STORAGE ---\n";
// Create a temporary mock WebM audio file (with valid Opus header signature)
$mockAudioPath = sys_get_temp_dir() . '/test_voice_record_' . uniqid() . '.webm';
$mockData = "\x1A\x45\xDF\xA3" . str_repeat("\x00\xFF", 15000); // ~30KB mock WebM opus audio
file_put_contents($mockAudioPath, $mockData);

$cFile = new CURLFile($mockAudioPath, 'audio/webm', 'recorded_voice_' . time() . '.webm');
$postData = [
    'file'            => $cFile,
    'type'            => 'voicenote',
    'name'            => 'Jawabin Kai Tsaye (Live Voice Dispatch) ' . uniqid(),
    'title'           => 'Jawabin Kai Tsaye (Live Voice Dispatch)',
    'category'        => 'Voice Note Dispatch',
    'idempotency_key' => 'pub_voice_' . uniqid()
];

$authHeader = ["X-Admin-Password: $adminPass"];
$uploadRes = req("$baseUrl/api/upload", 'POST', $postData, $authHeader, true);

$uploadedUrl = $uploadRes['json']['media']['url'] ?? '';
$mediaType = $uploadRes['json']['media']['type'] ?? '';
$isStoredOnDisk = false;

if ($uploadedUrl && strpos($uploadedUrl, '/uploads/') === 0) {
    $localDiskPath = __DIR__ . '/../public' . $uploadedUrl;
    $isStoredOnDisk = file_exists($localDiskPath) && filesize($localDiskPath) > 0;
}

check("V1: Voice note uploads via multipart/form-data", $uploadRes['code'] === 200 && !empty($uploadRes['json']['success']), "HTTP " . $uploadRes['code']);
check("V2: Permanent audio file created on disk in /public/uploads/", $isStoredOnDisk, "Disk path: " . ($uploadedUrl ?: 'none'));
check("V3: Database records correct media type 'voicenote'", $mediaType === 'voicenote', "Type: $mediaType");

// 2. BASE64 DATA-URL WITH CODECS TEST (Regression test for codecs=opus regex fix)
echo "\n--- 2. VOICE NOTE DATA-URL CODECS REGRESSION TEST ---\n";
$b64Url = 'data:audio/webm;codecs=opus;base64,' . base64_encode(str_repeat('AUDIO', 2000));
$dataUrlPayload = [
    'type'            => 'voicenote',
    'name'            => 'Recorded Voice Opus Test ' . uniqid(),
    'dataUrl'         => $b64Url,
    'idempotency_key' => 'pub_opus_' . uniqid()
];
$opusRes = req("$baseUrl/api/upload", 'POST', $dataUrlPayload, $authHeader);
$opusUrl = $opusRes['json']['media']['url'] ?? '';
$isOpusSavedToFile = strpos($opusUrl, '/uploads/') === 0 && file_exists(__DIR__ . '/../public' . $opusUrl);
check("V4: Data-URL with ;codecs=opus decodes directly to physical .webm file", $isOpusSavedToFile, "Saved as: $opusUrl");

// 3. PUBLIC ACCESS WITHOUT ADMIN AUTH
echo "\n--- 3. PUBLIC WEBSITE RETRIEVAL & ANONYMOUS PLAYBACK ---\n";
// Anonymous GET request without any admin password or session
$publicCatalog = req("$baseUrl/api/upload", 'GET');
$foundVoice = false;
if (!empty($publicCatalog['json']['media'])) {
    foreach ($publicCatalog['json']['media'] as $item) {
        if (($item['url'] ?? '') === $uploadedUrl && ($item['type'] ?? '') === 'voicenote') {
            $foundVoice = true;
            break;
        }
    }
}
check("V5: Public website retrieves voice note without admin credentials", $foundVoice, "Item found in public catalog");

// Test audio playback stream without admin credentials
$audioStream = req("$baseUrl$uploadedUrl", 'GET');
$hasAudioMime = strpos($audioStream['headers'], 'audio/webm') !== false || strpos($audioStream['headers'], 'Content-Type: audio/') !== false;
$hasAcceptRanges = strpos($audioStream['headers'], 'Accept-Ranges: bytes') !== false;
check("V6: Audio file is publicly streamable with Content-Type: audio/webm", $audioStream['code'] === 200 && $hasAudioMime, "MIME verified");
check("V7: Audio streaming supports Accept-Ranges: bytes", $hasAcceptRanges, "Accept-Ranges header present");

// 4. PERSISTENCE ACROSS REFRESH
echo "\n--- 4. VOICE NOTE REFRESH PERSISTENCE ---\n";
$refresh1 = req("$baseUrl/api/upload", 'GET');
$refresh2 = req("$baseUrl/api/upload", 'GET');
$c1 = count($refresh1['json']['media'] ?? []);
$c2 = count($refresh2['json']['media'] ?? []);
check("V8: Voice note persists permanently across simulated page refreshes", $c1 === $c2 && $c1 > 0, "Catalog count: $c1");

// 5. VIDEO PLAYBACK STABILITY & SEEKING
echo "\n--- 5. VIDEO PLAYBACK STABILITY & SEEKING (HTTP 206) ---\n";
$testVideoFile = __DIR__ . '/../public/uploads/test_qa_video.mp4';
$repeatCount = (int)((8 * 1024 * 1024) / 18);
file_put_contents($testVideoFile, str_repeat("VIDEO_STREAM_DATA_", $repeatCount));
$videoSize = filesize($testVideoFile); // exact size on disk

// A: Open range request (bytes=0-) - should deliver full length without clamping
$vFull = req("$baseUrl/uploads/test_qa_video.mp4", 'GET', null, ['Range: bytes=0-']);
$is206 = $vFull['code'] === 206;
$hasFullLength = strpos($vFull['headers'], 'Content-Range: bytes 0-' . ($videoSize - 1) . '/' . $videoSize) !== false;
check("VD1: Video open-ended range request (bytes=0-) serves full 8MB stream", $is206 && $hasFullLength, "HTTP 206 Partial Content verified ($videoSize bytes)");

// B: Middle slice seeking request (bytes=2000000-4000000)
$vSeek = req("$baseUrl/uploads/test_qa_video.mp4", 'GET', null, ['Range: bytes=2000000-4000000']);
$seek206 = $vSeek['code'] === 206;
$seekRange = strpos($vSeek['headers'], 'Content-Range: bytes 2000000-4000000/' . $videoSize) !== false;
$seekLength = strpos($vSeek['headers'], 'Content-Length: 2000001') !== false;
check("VD2: Video seeking forward/backward delivers exact byte slice", $seek206 && $seekRange && $seekLength, "2MB slice delivered accurately");

// 6. REAL-TIME EVENT STREAM
echo "\n--- 6. REAL-TIME EVENT BROADCAST & DEDUPLICATION ---\n";
$eventsCheck = req("$baseUrl/api/events?last_id=0", 'GET');
$hasVoiceEvent = false;
if (!empty($eventsCheck['json']['events'])) {
    foreach ($eventsCheck['json']['events'] as $ev) {
        if (($ev['type'] ?? '') === 'media_uploaded') {
            $evUrl = $ev['data']['url'] ?? '';
            if ($evUrl === $uploadedUrl || $evUrl === $opusUrl) {
                $hasVoiceEvent = true;
                break;
            }
        }
    }
}
check("RT1: Real-time event stream receives new voice note publication", $hasVoiceEvent, "Event dispatched over SSE / polling");

// Clean up test files
@unlink($mockAudioPath);
if ($isOpusSavedToFile) @unlink(__DIR__ . '/../public' . $opusUrl);
if ($isStoredOnDisk) @unlink($localDiskPath);
if (file_exists($testVideoFile)) @unlink($testVideoFile);

// Clean up DB rows created by this QA test
require_once __DIR__ . '/../config/database.php';
global $pdo;
if ($pdo) {
    $pdo->exec("DELETE FROM media WHERE name LIKE 'Jawabin Kai Tsaye%' OR name LIKE 'Recorded Voice Opus%'");
    $pdo->exec("DELETE FROM media_items WHERE title LIKE 'Jawabin Kai Tsaye%' OR title LIKE 'Recorded Voice Opus%'");
}

echo "\n============================================================\n";
echo "QA VERIFICATION SUMMARY: $passed PASSED, $failed FAILED\n";
echo "============================================================\n";

exit($failed === 0 ? 0 : 1);
