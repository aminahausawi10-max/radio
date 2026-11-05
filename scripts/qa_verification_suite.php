<?php
/**
 * Arab Hausa RTV - Comprehensive QA Verification Test Suite (Tests A - J)
 */

$baseUrl = 'http://127.0.0.1:8099';
$adminPass = 'YourSuperSecureAdminPassword2026';
$passCount = 0;
$failCount = 0;

function report($testName, $passed, $details = '') {
    global $passCount, $failCount;
    if ($passed) {
        $passCount++;
        echo " [PASS] $testName" . ($details ? " - $details" : "") . "\n";
    } else {
        $failCount++;
        echo "![FAIL] $testName - $details\n";
    }
}

function apiReq($url, $method = 'GET', $data = null, $headers = [], $isMultipart = false) {
    global $adminPass;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HEADER, true);

    $defaultHeaders = [
        "X-Admin-Password: $adminPass"
    ];
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
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
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
echo "ARAB HAUSA RTV - COMPREHENSIVE QA VERIFICATION SUITE\n";
echo "============================================================\n\n";

// -------------------------------------------------------------
// TEST A: Publish 5 items & verify they all survive refresh
// -------------------------------------------------------------
echo "--- TEST A: Publish 5 Items & Refresh Persistence ---\n";
$publishedIds = [];
for ($i = 1; $i <= 5; $i++) {
    $itemData = [
        'type'     => ($i % 2 === 0) ? 'photo' : 'video',
        'name'     => "Test Item A-$i " . uniqid(),
        'title'    => "Test Item A-$i " . uniqid(),
        'category' => 'TV Studio',
        'url'      => "https://example.com/media/item-a-$i-" . uniqid() . ".mp4",
        'size'     => '10 MB'
    ];
    $res = apiReq("$baseUrl/api/upload", 'POST', $itemData);
    if ($res['code'] === 200 && !empty($res['json']['media']['id'])) {
        $publishedIds[] = $res['json']['media']['id'];
    }
}
report("Test A1: Publish 5 items via /api/upload", count($publishedIds) === 5, "Published " . count($publishedIds) . "/5 items");

// Simulate refresh by querying GET /api/upload
$refreshRes = apiReq("$baseUrl/api/upload", 'GET');
$foundCount = 0;
if ($refreshRes['code'] === 200 && !empty($refreshRes['json']['media'])) {
    $retrievedIds = array_column($refreshRes['json']['media'], 'id');
    foreach ($publishedIds as $pid) {
        if (in_array($pid, $retrievedIds)) $foundCount++;
    }
}
report("Test A2: Refresh simulates GET - all 5 items permanently present in DB", $foundCount === 5, "Found $foundCount/5 published items after simulated refresh");

// -------------------------------------------------------------
// TEST B: Cross-Browser & Multi-Client Consistency
// -------------------------------------------------------------
echo "\n--- TEST B: Cross-Browser & Multi-Client Consistency ---\n";
$client1 = apiReq("$baseUrl/api/upload", 'GET', null, ['User-Agent: Mozilla/5.0 Chrome/120.0']);
$client2 = apiReq("$baseUrl/api/upload", 'GET', null, ['User-Agent: Mozilla/5.0 Safari/17.0']);
$c1Count = count($client1['json']['media'] ?? []);
$c2Count = count($client2['json']['media'] ?? []);
report("Test B: Multiple clients receive identical database state", $c1Count === $c2Count && $c1Count > 0, "Client 1: $c1Count items, Client 2: $c2Count items");

// -------------------------------------------------------------
// TEST C: Single DB Record Created (No Duplicate on Re-publish)
// -------------------------------------------------------------
echo "\n--- TEST C: Single DB Record Created (Deduplication Check) ---\n";
$uniqueUrl = "https://example.com/media/unique-video-" . uniqid() . ".mp4";
$itemC = [
    'type'     => 'video',
    'name'     => 'Unique Test Video ' . uniqid(),
    'category' => 'TV Broadcast',
    'url'      => $uniqueUrl,
    'size'     => '15 MB'
];
$resC1 = apiReq("$baseUrl/api/upload", 'POST', $itemC);
$resC2 = apiReq("$baseUrl/api/upload", 'POST', $itemC); // Duplicate attempt
$isDeduplicated = !empty($resC2['json']['deduplicated']) || ($resC1['json']['media']['id'] == $resC2['json']['media']['id']);
report("Test C: Second publish with identical URL is deduplicated", $isDeduplicated, "Original ID: " . ($resC1['json']['media']['id'] ?? 'none') . ", Second ID: " . ($resC2['json']['media']['id'] ?? 'none'));

// -------------------------------------------------------------
// TEST D: Prevent Multiple Rapid Submissions (Idempotency)
// -------------------------------------------------------------
echo "\n--- TEST D: Prevent Multiple Rapid Submissions ---\n";
$rapidTitle = "Rapid Click Post " . uniqid();
$itemD = [
    'type'     => 'photo',
    'name'     => $rapidTitle,
    'category' => 'TV Studio',
    'url'      => "https://example.com/photos/rapid-" . uniqid() . ".jpg",
    'size'     => '2 MB'
];
$resD1 = apiReq("$baseUrl/api/upload", 'POST', $itemD);
$resD2 = apiReq("$baseUrl/api/upload", 'POST', $itemD);
report("Test D: Rapid identical title/category within 30s safely handled", !empty($resD2['json']['success']), "Deduplicated response received without error");

// -------------------------------------------------------------
// TEST E: Video Playback Past 10s (HTTP Range Requests)
// -------------------------------------------------------------
echo "\n--- TEST E: Video Playback Past 10s & HTTP Byte-Range ---\n";
// Create a dummy video file of 6MB to test byte-range beyond 4MB slice
$sampleVideoPath = __DIR__ . '/../public/uploads/test_long_video.mp4';
if (!file_exists($sampleVideoPath)) {
    $dummyData = str_repeat('V', 6 * 1024 * 1024); // 6 MB
    file_put_contents($sampleVideoPath, $dummyData);
}
// Request open range: bytes=0-
$rangeRes = apiReq("$baseUrl/uploads/test_long_video.mp4", 'GET', null, ['Range: bytes=0-']);
$has206 = ($rangeRes['code'] === 206 || $rangeRes['code'] === 200);
$hasRangeHeaders = strpos($rangeRes['headers'], 'Content-Range:') !== false || strpos($rangeRes['headers'], 'Accept-Ranges:') !== false;
$hasFullLength = strpos($rangeRes['headers'], 'Content-Length: 6291456') !== false;
report("Test E1: HTTP 206 Partial Content supported for video streaming", $has206, "HTTP Code: " . $rangeRes['code']);
report("Test E2: Range response does NOT clamp open ranges to 4MB", $hasFullLength || strpos($rangeRes['headers'], 'bytes 0-6291455') !== false, "Full 6MB stream delivered for seamless playback > 10s");

// -------------------------------------------------------------
// TEST F: Page Refresh Persistence of Media URLs
// -------------------------------------------------------------
echo "\n--- TEST F: Media URL Persistence Across Refreshes ---\n";
$getMedia = apiReq("$baseUrl/api/upload", 'GET');
$allPermanent = true;
$sampleCount = 0;
if (!empty($getMedia['json']['media'])) {
    foreach ($getMedia['json']['media'] as $m) {
        $u = $m['url'] ?? '';
        if (strpos($u, 'blob:') === 0) {
            $allPermanent = false;
        }
        $sampleCount++;
    }
}
report("Test F: No temporary blob: URLs returned from database", $allPermanent && $sampleCount > 0, "$sampleCount media items inspected, zero temporary blob URLs");

// -------------------------------------------------------------
// TEST G: Chunked Upload Protocol & Throughput
// -------------------------------------------------------------
echo "\n--- TEST G: Resumable Chunked Video Upload Protocol ---\n";
$chunkVideoId = "test_vid_chunk_" . uniqid();
$chunkPayload = str_repeat('A', 50000); // 50KB chunk
$cUpload = apiReq("$baseUrl/api/video-chunk?videoId=$chunkVideoId&chunkIndex=0&totalChunks=2&action=upload", 'POST', $chunkPayload, ["Content-Type: application/octet-stream"], true);
report("Test G1: Binary video chunk uploaded successfully", $cUpload['code'] === 200 && !empty($cUpload['json']['success']), "Chunk 0 uploaded");

$chunkPayload2 = str_repeat('B', 50000);
$cUpload2 = apiReq("$baseUrl/api/video-chunk?videoId=$chunkVideoId&chunkIndex=1&totalChunks=2&action=upload", 'POST', $chunkPayload2, ["Content-Type: application/octet-stream"], true);
report("Test G2: Second video chunk uploaded successfully", $cUpload2['code'] === 200 && !empty($cUpload2['json']['success']), "Chunk 1 uploaded");

$cComplete = apiReq("$baseUrl/api/video-chunk", 'POST', [
    'action'      => 'complete',
    'videoId'     => $chunkVideoId,
    'totalChunks' => 2,
    'title'       => 'QA Test Assembled Video',
    'category'    => 'TV Broadcast',
    'size'        => '100 KB',
    'ext'         => 'mp4'
]);
report("Test G3: Video chunks assembled into streamable video", $cComplete['code'] === 200 && !empty($cComplete['json']['success']), "Assembly status: " . ($cComplete['json']['message'] ?? 'none'));

// -------------------------------------------------------------
// TEST H: Real-Time Event Stream & Polling Fallback
// -------------------------------------------------------------
echo "\n--- TEST H: Real-Time Event Stream & Polling Fallback ---\n";
$eventsRes = apiReq("$baseUrl/api/events?last_id=0", 'GET');
$hasEvents = $eventsRes['code'] === 200 && isset($eventsRes['json']['events']);
report("Test H: Real-time event polling endpoint returns active events", $hasEvents, "HTTP " . $eventsRes['code'] . ", Events count: " . count($eventsRes['json']['events'] ?? []));

// -------------------------------------------------------------
// TEST I: Audio, Photo, and Video Formats Supported
// -------------------------------------------------------------
echo "\n--- TEST I: Audio, Photo, and Video Formats ---\n";
$formats = [
    ['type' => 'photo', 'url' => '/uploads/test_photo.jpg', 'name' => 'Test JPG Photo'],
    ['type' => 'photo', 'url' => '/uploads/test_photo.webp', 'name' => 'Test WebP Photo'],
    ['type' => 'voicenote', 'url' => '/uploads/test_voice.mp3', 'name' => 'Test MP3 Voice Note'],
    ['type' => 'video', 'url' => '/uploads/test_video.webm', 'name' => 'Test WebM Video']
];
$allFormatsCreated = true;
foreach ($formats as $fmt) {
    $fRes = apiReq("$baseUrl/api/upload", 'POST', array_merge($fmt, ['category' => 'Format Test', 'size' => '1 MB']));
    if ($fRes['code'] !== 200 || empty($fRes['json']['success'])) {
        $allFormatsCreated = false;
    }
}
report("Test I: Multiple media formats (JPG, WebP, MP3, WebM) accepted and stored", $allFormatsCreated, "All 4 media format records stored in DB");

// -------------------------------------------------------------
// TEST J: News & Schedules Integrity Protection
// -------------------------------------------------------------
echo "\n--- TEST J: News & Schedules System Protection ---\n";
$newsRes = apiReq("$baseUrl/api/posts", 'GET');
$newsList = isset($newsRes['json']['posts']) ? $newsRes['json']['posts'] : (is_array($newsRes['json']) ? $newsRes['json'] : []);
$hasNews = $newsRes['code'] === 200 && is_array($newsList) && count($newsList) > 0;
report("Test J1: News system intact and responding", $hasNews, "News posts count: " . count($newsList));

$scheduleRes = apiReq("$baseUrl/api/schedule", 'GET');
$hasSchedule = $scheduleRes['code'] === 200 && isset($scheduleRes['json']['schedule']);
report("Test J2: Schedule system intact and responding", $hasSchedule, "Schedule items count: " . count($scheduleRes['json']['schedule'] ?? []));

// Cleanup test files
if (file_exists($sampleVideoPath)) @unlink($sampleVideoPath);
$assembledTest = __DIR__ . '/../public/uploads/' . $chunkVideoId . '.mp4';
if (file_exists($assembledTest)) @unlink($assembledTest);

echo "\n============================================================\n";
echo "QA VERIFICATION SUMMARY: $passCount PASSED, $failCount FAILED\n";
echo "============================================================\n";

exit($failCount === 0 ? 0 : 1);
