<?php
/**
 * Arab Hausa Radio TV - High Performance Video Streaming Engine (PHP)
 * Supports HTTP 206 Partial Content byte-ranges for seeking and smooth playback
 */

$id = preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['id'] ?? '');
if (empty($id)) {
    http_response_code(400);
    exit('Video ID required');
}

$baseDir = dirname(__DIR__);
$filePath = $baseDir . '/public/uploads/' . $id . '.mp4';

if (!file_exists($filePath)) {
    // Check if filename was passed directly
    $filePath = $baseDir . '/public/uploads/' . $id;
    if (!file_exists($filePath)) {
        http_response_code(404);
        exit('Video not found');
    }
}

$fileSize = filesize($filePath);
$mimeType = 'video/mp4';

header('Content-Type: ' . $mimeType);
header('Accept-Ranges: bytes');
header('Cache-Control: public, max-age=86400, stale-while-revalidate=604800');

$start = 0;
$end = $fileSize - 1;

if (isset($_SERVER['HTTP_RANGE'])) {
    $range = $_SERVER['HTTP_RANGE'];
    if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
        $start = (int)$matches[1];
        if (!empty($matches[2])) {
            $end = (int)$matches[2];
        }
    }

    if ($start > $end || $start >= $fileSize) {
        http_response_code(416);
        header("Content-Range: bytes */$fileSize");
        exit;
    }

    $length = $end - $start + 1;
    http_response_code(206);
    header("Content-Range: bytes $start-$end/$fileSize");
    header("Content-Length: " . $length);
} else {
    header("Content-Length: " . $fileSize);
}

$fp = fopen($filePath, 'rb');
if ($fp) {
    fseek($fp, $start);
    $bytesRemaining = $end - $start + 1;
    $bufferSize = 64 * 1024; // 64KB buffer

    while (!feof($fp) && $bytesRemaining > 0) {
        $readBytes = min($bufferSize, $bytesRemaining);
        $data = fread($fp, $readBytes);
        echo $data;
        flush();
        $bytesRemaining -= strlen($data);
    }
    fclose($fp);
}
exit;
