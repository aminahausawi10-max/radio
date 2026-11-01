<?php
/**
 * Arab Hausa Radio TV - Video Chunk Upload Engine (PHP)
 * Handles chunked video streaming & upload on Apache / cPanel / DirectAdmin
 */

// Disable execution time limit for video chunk processing
@set_time_limit(300);
@ini_set('memory_limit', '512M');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    $input = $_POST;
}

$videoId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['videoId'] ?? '');
$chunkIndex = isset($input['chunkIndex']) ? (int)$input['chunkIndex'] : null;
$totalChunks = isset($input['totalChunks']) ? (int)$input['totalChunks'] : null;
$mimeType = $input['mimeType'] ?? 'video/mp4';
$base64Data = $input['data'] ?? '';
$isFinal = !empty($input['isFinal']);
$metadata = $input['metadata'] ?? [];

if (empty($videoId) || $chunkIndex === null || empty($totalChunks) || empty($base64Data)) {
    echo json_encode(['success' => false, 'message' => 'Missing required chunk parameters']);
    exit;
}

$baseDir = dirname(__DIR__);
$chunksDir = $baseDir . '/data/video_chunks/' . $videoId;
$uploadsDir = $baseDir . '/public/uploads';
$dataFile = $baseDir . '/data/media.json';
$pubDataFile = $baseDir . '/public/data/media.json';

if (!is_dir($chunksDir)) {
    @mkdir($chunksDir, 0777, true);
}

// Save chunk file to disk
$chunkFile = $chunksDir . '/' . $chunkIndex . '.dat';
file_put_contents($chunkFile, $base64Data);

// If this is the final chunk, assemble the full video
if ($isFinal) {
    if (!is_dir($uploadsDir)) {
        @mkdir($uploadsDir, 0777, true);
    }

    $title = !empty($metadata['title']) ? trim($metadata['title']) : 'Arab Hausa Video Broadcast';
    $category = !empty($metadata['category']) ? trim($metadata['category']) : 'TV Broadcast';
    $size = !empty($metadata['size']) ? trim($metadata['size']) : 'HD Video';
    $posterUrl = !empty($metadata['posterUrl']) ? trim($metadata['posterUrl']) : '';

    $videoFileName = $videoId . '.mp4';
    $fullVideoPath = $uploadsDir . '/' . $videoFileName;

    // Concatenate all decoded chunks directly into the final video file
    $outHandle = fopen($fullVideoPath, 'wb');
    if (!$outHandle) {
        echo json_encode(['success' => false, 'message' => 'Unable to create video file on server']);
        exit;
    }

    for ($i = 0; $i < $totalChunks; $i++) {
        $cFile = $chunksDir . '/' . $i . '.dat';
        if (file_exists($cFile)) {
            $b64 = file_get_contents($cFile);
            $binary = base64_decode($b64);
            if ($binary !== false) {
                fwrite($outHandle, $binary);
            }
            @unlink($cFile);
        }
    }
    fclose($outHandle);

    // Clean up chunks folder
    @rmdir($chunksDir);

    $directUrl = '/uploads/' . $videoFileName;
    $streamUrl = '/api/video-stream?id=' . urlencode($videoId);

    $mediaItem = [
        'id' => round(microtime(true) * 1000),
        'type' => 'video',
        'name' => $title,
        'category' => $category,
        'url' => $directUrl,
        'stream_url' => $streamUrl,
        'size' => $size,
        'poster_url' => $posterUrl,
        'created_at' => date('c')
    ];

    // Save to local JSON media feeds
    function getMediaItems($file) {
        if (file_exists($file)) {
            $c = file_get_contents($file);
            $j = json_decode($c, true);
            if (is_array($j)) return $j;
        }
        return [];
    }

    $items = getMediaItems($dataFile);
    array_unshift($items, $mediaItem);

    $jsonStr = json_encode(array_values($items), JSON_PRETTY_PRINT);
    @file_put_contents($dataFile, $jsonStr);
    @file_put_contents($pubDataFile, $jsonStr);

    // Try DB insert if configured
    try {
        require_once __DIR__ . '/db.php';
        $db = getDB();
        $db->query("
            INSERT INTO media (type, name, category, url, size, poster_url)
            VALUES ($1, $2, $3, $4, $5, $6)
        ", ['video', $title, $category, $directUrl, $size, $posterUrl]);
    } catch (\Throwable $e) {}

    echo json_encode([
        'success' => true,
        'message' => 'Video uploaded and published successfully!',
        'isFinal' => true,
        'media' => $mediaItem,
        'url' => $directUrl
    ]);
    exit;
}

// Interim chunk acknowledgement
echo json_encode([
    'success' => true,
    'message' => "Chunk " . ($chunkIndex + 1) . "/{$totalChunks} received",
    'chunkIndex' => $chunkIndex
]);
