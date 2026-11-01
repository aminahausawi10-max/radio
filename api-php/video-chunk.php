<?php
/**
 * Arab Hausa Radio TV - High Speed Video Chunk Engine (PHP)
 * High-performance JSON chunking with immediate binary decoding and C-level stream assembly
 */

@set_time_limit(600);
@ini_set('memory_limit', '512M');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$json = json_decode($rawInput, true);

$input = is_array($json) ? $json : $_POST;

$videoId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['videoId'] ?? '');
$chunkIndex = isset($input['chunkIndex']) ? (int)$input['chunkIndex'] : null;
$totalChunks = isset($input['totalChunks']) ? (int)$input['totalChunks'] : null;
$isFinal = !empty($input['isFinal']) && ($input['isFinal'] === true || $input['isFinal'] === '1' || $input['isFinal'] === 1 || $input['isFinal'] === 'true');

$title = trim($input['title'] ?? ($input['metadata']['title'] ?? 'Arab Hausa Video Broadcast'));
$category = trim($input['category'] ?? ($input['metadata']['category'] ?? 'TV Broadcast'));
$size = trim($input['size'] ?? ($input['metadata']['size'] ?? 'HD Video'));
$posterUrl = trim($input['posterUrl'] ?? ($input['metadata']['posterUrl'] ?? ''));

$base64Data = $input['data'] ?? '';

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

// Immediately decode base64 to binary on arrival (reduces storage & speeds up assembly)
$binaryChunk = base64_decode($base64Data);
if ($binaryChunk === false) {
    echo json_encode(['success' => false, 'message' => 'Invalid chunk encoding']);
    exit;
}

$chunkFile = $chunksDir . '/' . $chunkIndex . '.dat';
file_put_contents($chunkFile, $binaryChunk);

// If final chunk, assemble video using C-level stream copy
if ($isFinal) {
    if (!is_dir($uploadsDir)) {
        @mkdir($uploadsDir, 0777, true);
    }

    $videoFileName = $videoId . '.mp4';
    $fullVideoPath = $uploadsDir . '/' . $videoFileName;

    $outHandle = fopen($fullVideoPath, 'wb');
    if (!$outHandle) {
        echo json_encode(['success' => false, 'message' => 'Unable to create video file on server']);
        exit;
    }

    // High performance stream copy: zero memory copy in kernel
    for ($i = 0; $i < $totalChunks; $i++) {
        $cFile = $chunksDir . '/' . $i . '.dat';
        if (file_exists($cFile)) {
            $inHandle = fopen($cFile, 'rb');
            if ($inHandle) {
                stream_copy_to_stream($inHandle, $outHandle);
                fclose($inHandle);
            }
            @unlink($cFile);
        }
    }
    fclose($outHandle);
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

    function getMediaItems($file) {
        if (file_exists($file)) {
            $c = file_get_contents($file);
            $j = json_decode($c, true);
            if (is_array($j)) return $j;
        }
        return [];
    }

    $items = getMediaItems($dataFile);
    // Deduplicate: replace any existing item with same name or URL
    $items = array_values(array_filter($items, function($m) use ($title, $directUrl) {
        return ($m['url'] ?? '') !== $directUrl && ($m['name'] ?? '') !== $title;
    }));
    array_unshift($items, $mediaItem);

    $jsonStr = json_encode(array_values($items), JSON_PRETTY_PRINT);
    @file_put_contents($dataFile, $jsonStr);
    @file_put_contents($pubDataFile, $jsonStr);

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

echo json_encode([
    'success' => true,
    'message' => "Chunk " . ($chunkIndex + 1) . "/{$totalChunks} received",
    'chunkIndex' => $chunkIndex
]);
