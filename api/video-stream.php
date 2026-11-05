<?php
/**
 * Arab Hausa Radio TV - High Performance Video & Audio Streaming Engine (PHP)
 * Supports HTTP 206 Partial Content byte-ranges for seeking and instant mobile playback
 */

@set_time_limit(0);
@ini_set('max_execution_time', '0');

$id = preg_replace('/[^a-zA-Z0-9_\-.]/', '', $_GET['id'] ?? '');
if (empty($id)) {
    http_response_code(400);
    exit('Media ID required');
}

$baseDir = dirname(__DIR__);
$uploadsDir = $baseDir . '/public/uploads';
$tempUploadsDir = sys_get_temp_dir() . '/arab_hausa_uploads';

// Check direct file or extension variants
$filePath = null;
$candidates = [
    $uploadsDir . '/' . $id,
    $uploadsDir . '/' . $id . '.mp4',
    $uploadsDir . '/' . $id . '.webm',
    $uploadsDir . '/' . $id . '.mov',
    $uploadsDir . '/' . $id . '.mkv',
    $uploadsDir . '/' . $id . '.mp3',
    $uploadsDir . '/' . $id . '.wav',
    $uploadsDir . '/' . $id . '.m4a',
    $tempUploadsDir . '/' . $id,
    $tempUploadsDir . '/' . $id . '.mp4',
    $tempUploadsDir . '/' . $id . '.webm',
    $tempUploadsDir . '/' . $id . '.mov',
    $tempUploadsDir . '/' . $id . '.mkv',
    $tempUploadsDir . '/' . $id . '.mp3',
    $tempUploadsDir . '/' . $id . '.wav',
    $tempUploadsDir . '/' . $id . '.m4a'
];

foreach ($candidates as $cand) {
    if (file_exists($cand) && !is_dir($cand)) {
        $filePath = $cand;
        break;
    }
}

if (!$filePath) {
    http_response_code(404);
    exit('Media not found');
}

while (ob_get_level()) {
    ob_end_clean();
}

$ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
$mimes = [
    'mp4'  => 'video/mp4',
    'webm' => 'video/webm',
    'mov'  => 'video/quicktime',
    'mkv'  => 'video/x-matroska',
    'mp3'  => 'audio/mpeg',
    'wav'  => 'audio/wav',
    'm4a'  => 'audio/mp4',
    'ogg'  => 'audio/ogg',
    'oga'  => 'audio/ogg',
    'aac'  => 'audio/aac',
    'flac' => 'audio/flac'
];

$mimeType = $mimes[$ext] ?? 'video/mp4';
$fileSize = filesize($filePath);
$start = 0;
$end = $fileSize - 1;

header('Content-Type: ' . $mimeType);
header('Accept-Ranges: bytes');
header('Cache-Control: public, max-age=86400, stale-while-revalidate=604800');
header('X-Content-Type-Options: nosniff');

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

    while (!feof($fp) && $bytesRemaining > 0 && !connection_aborted()) {
        $readBytes = min($bufferSize, $bytesRemaining);
        $data = fread($fp, $readBytes);
        echo $data;
        @ob_flush();
        @flush();
        $bytesRemaining -= strlen($data);
    }
    fclose($fp);
}
exit;
