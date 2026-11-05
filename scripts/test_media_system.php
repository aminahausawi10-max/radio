<?php
/**
 * Arab Hausa RTV - Comprehensive End-to-End Media System Test Suite
 */

$baseUrl = 'http://127.0.0.1:8099';
$adminPass = 'YourSuperSecureAdminPassword2026';

function httpReq($method, $path, $body = null, $headers = []) {
    global $baseUrl;
    $ch = curl_init($baseUrl . $path);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $reqHeaders = [];
    foreach ($headers as $k => $v) {
        $reqHeaders[] = "$k: $v";
    }

    if ($body !== null) {
        if (is_array($body)) {
            $body = json_encode($body);
            $reqHeaders[] = "Content-Type: application/json";
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);

    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headerStr = substr($raw, 0, $headerSize);
    $bodyStr = substr($raw, $headerSize);
    curl_close($ch);

    return [
        'status' => $status,
        'headers' => $headerStr,
        'body' => $bodyStr,
        'json' => json_decode($bodyStr, true)
    ];
}

$results = [];

function recordTest($name, $passed, $details = '') {
    global $results;
    $results[] = [
        'name' => $name,
        'passed' => $passed,
        'details' => $details
    ];
    $icon = $passed ? "✅" : "❌";
    echo "$icon $name: " . ($passed ? "PASSED" : "FAILED") . ($details ? " ($details)" : "") . "\n";
}

echo "========================================================\n";
echo "ARAB HAUSA RTV - COMPREHENSIVE MEDIA SYSTEM VERIFICATION\n";
echo "========================================================\n\n";

// 1. Homepage & Static Assets Check
$homeRes = httpReq('GET', '/');
recordTest('Homepage Load', $homeRes['status'] === 200 && strpos($homeRes['body'], 'Arab Hausa') !== false, "Status: {$homeRes['status']}");

// 2. News API Verification (Must remain intact)
$newsRes = httpReq('GET', '/api/news');
recordTest('News API Intact', $newsRes['status'] === 200 && isset($newsRes['json']['news']), "Articles: " . count($newsRes['json']['news'] ?? []));

// 3. Schedules API Verification (Must remain intact)
$schedRes = httpReq('GET', '/api/schedule');
$schedCount = count($schedRes['json']['schedule'] ?? ($schedRes['json']['schedules'] ?? []));
recordTest('Schedule API Intact', $schedRes['status'] === 200 && $schedCount > 0, "Schedules: $schedCount");

// 4. Initial Media Catalog GET
$getMediaRes = httpReq('GET', '/api/upload');
recordTest('Media Catalog GET', $getMediaRes['status'] === 200 && isset($getMediaRes['json']['media']), "Items found: " . count($getMediaRes['json']['media'] ?? []));

// 5. Photo Upload Test (JPG/PNG Base64)
$tinyPngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
$photoPayload = [
    'type' => 'photo',
    'title' => 'QA Live Test Photo',
    'category' => 'TV Studio',
    'dataUrl' => $tinyPngBase64,
    'size' => '1.5 KB'
];
$uploadPhotoRes = httpReq('POST', '/api/upload', $photoPayload, [
    'X-Admin-Password' => $adminPass
]);
$photoUploaded = $uploadPhotoRes['status'] === 200 && ($uploadPhotoRes['json']['success'] ?? false);
$photoId = $uploadPhotoRes['json']['media']['id'] ?? null;
$photoUrl = $uploadPhotoRes['json']['url'] ?? null;
recordTest('Photo Upload', $photoUploaded, "Photo ID: $photoId, URL: $photoUrl");

// 6. Voice Note Upload Test (Audio Base64)
$dummyAudioBase64 = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
$voicePayload = [
    'type' => 'voicenote',
    'title' => 'QA Live Test Voice Note',
    'category' => 'Voice Note Dispatch',
    'dataUrl' => $dummyAudioBase64,
    'size' => '2.1 KB'
];
$uploadVoiceRes = httpReq('POST', '/api/upload', $voicePayload, [
    'X-Admin-Password' => $adminPass
]);
$voiceUploaded = $uploadVoiceRes['status'] === 200 && ($uploadVoiceRes['json']['success'] ?? false);
$voiceId = $uploadVoiceRes['json']['media']['id'] ?? null;
$voiceUrl = $uploadVoiceRes['json']['url'] ?? null;
recordTest('Voice Note Upload', $voiceUploaded, "Voice Note ID: $voiceId, URL: $voiceUrl");

// 7. Video Upload: Resumable Chunked Pipeline Test
$testVideoId = 'qa_test_vid_' . time();
$totalChunks = 3;

// 7a. Handshake Check
$checkRes = httpReq('GET', "/api/video-chunk?action=check&videoId={$testVideoId}&totalChunks={$totalChunks}");
recordTest('Video Handshake Check', $checkRes['status'] === 200 && ($checkRes['json']['success'] ?? false), "Handshake verified");

// 7b. Chunk Uploads (3 binary chunks)
$dummyChunkData = str_repeat("V", 64 * 1024); // 64 KB per chunk
$allChunksUploaded = true;
for ($c = 0; $c < $totalChunks; $c++) {
    $cRes = httpReq('POST', "/api/video-chunk?videoId={$testVideoId}&chunkIndex={$c}&totalChunks={$totalChunks}&action=upload", $dummyChunkData, [
        'Content-Type' => 'application/octet-stream'
    ]);
    if ($cRes['status'] !== 200 || !($cRes['json']['success'] ?? false)) {
        $allChunksUploaded = false;
    }
}
recordTest('Video 3-Chunk Upload', $allChunksUploaded, "Uploaded $totalChunks chunks");

// 7c. Assemble Video
$assemblePayload = [
    'action' => 'complete',
    'videoId' => $testVideoId,
    'totalChunks' => $totalChunks,
    'isFinal' => true,
    'title' => 'QA Broadcast Test Video HD',
    'category' => 'TV Broadcast',
    'size' => '192 KB',
    'ext' => 'mp4',
    'posterUrl' => $tinyPngBase64
];
$assembleRes = httpReq('POST', "/api/video-chunk", $assemblePayload);
$videoAssembled = $assembleRes['status'] === 200 && ($assembleRes['json']['success'] ?? false);
$videoId = $assembleRes['json']['media']['id'] ?? null;
$videoUrl = $assembleRes['json']['url'] ?? null;
recordTest('Video Stream Assembly', $videoAssembled, "Video ID: $videoId, URL: $videoUrl");

// 8. HTTP 206 Partial Content Byte-Range Video Streaming Test
$rangeRes = httpReq('GET', $videoUrl, null, [
    'Range' => 'bytes=0-1023'
]);
$isByteRange = ($rangeRes['status'] === 206) && (strpos($rangeRes['headers'], 'Content-Range:') !== false);
recordTest('Video Byte-Range (HTTP 206) Streaming', $isByteRange, "Status: {$rangeRes['status']}, Content-Range verified");

// 9. HTTP 206 Partial Content Byte-Range Audio Streaming Test
$audioRangeRes = httpReq('GET', $voiceUrl, null, [
    'Range' => 'bytes=0-15'
]);
$isAudioRange = ($audioRangeRes['status'] === 206 || $audioRangeRes['status'] === 200);
recordTest('Audio/Voice Note Stream Response', $isAudioRange, "Status: {$audioRangeRes['status']}");

// 10. Real-Time Events API Test (JSON mode)
$eventsRes = httpReq('GET', '/api/events?last_id=0');
$hasEvents = $eventsRes['status'] === 200 && ($eventsRes['json']['success'] ?? false) && count($eventsRes['json']['events'] ?? []) > 0;
recordTest('Real-Time Events JSON Feed', $hasEvents, "Events in feed: " . count($eventsRes['json']['events'] ?? []));

// 11. Public Media Feed Contains Newly Published Video, Photo & Voice Note
$finalMediaRes = httpReq('GET', '/api/upload');
$mediaList = $finalMediaRes['json']['media'] ?? [];
$foundVideo = false;
$foundPhoto = false;
$foundVoice = false;
foreach ($mediaList as $m) {
    if ($m['url'] === $videoUrl) $foundVideo = true;
    if ($m['url'] === $photoUrl) $foundPhoto = true;
    if ($m['url'] === $voiceUrl) $foundVoice = true;
}
recordTest('Public Feed Instant Availability', $foundVideo && $foundPhoto && $foundVoice, "Video: " . ($foundVideo ? "Yes" : "No") . ", Photo: " . ($foundPhoto ? "Yes" : "No") . ", Voice: " . ($foundVoice ? "Yes" : "No"));

// 12. Deletion API Test (DELETE /api/upload?id=...)
if ($photoId) {
    $delPhotoRes = httpReq('DELETE', "/api/upload?id={$photoId}", null, [
        'X-Admin-Password' => $adminPass
    ]);
    recordTest('Photo Deletion', $delPhotoRes['status'] === 200 && ($delPhotoRes['json']['success'] ?? false), "Photo $photoId deleted");
}

if ($voiceId) {
    $delVoiceRes = httpReq('DELETE', "/api/upload?id={$voiceId}", null, [
        'X-Admin-Password' => $adminPass
    ]);
    recordTest('Voice Note Deletion', $delVoiceRes['status'] === 200 && ($delVoiceRes['json']['success'] ?? false), "Voice Note $voiceId deleted");
}

if ($videoId) {
    $delVideoRes = httpReq('DELETE', "/api/upload?id={$videoId}", null, [
        'X-Admin-Password' => $adminPass
    ]);
    recordTest('Video Deletion', $delVideoRes['status'] === 200 && ($delVideoRes['json']['success'] ?? false), "Video $videoId deleted");
}

// Summary
echo "\n========================================================\n";
$allPassed = true;
foreach ($results as $r) {
    if (!$r['passed']) $allPassed = false;
}
if ($allPassed) {
    echo "🎉 ALL " . count($results) . " TESTS PASSED WITH 100% SUCCESS!\n";
} else {
    echo "⚠️ SOME TESTS FAILED.\n";
}
echo "========================================================\n";
