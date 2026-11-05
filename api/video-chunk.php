<?php
/**
 * Arab Hausa Radio TV - High Performance Resumable Video Chunk Engine (PHP)
 * Supports:
 * 1. Native binary multipart chunk upload (FormData) for line speed
 * 2. Instant pre-flight handshake (check existing chunks) for resumability across drops
 * 3. Multi-format support: MP4, MOV, MKV, WEBM with zero quality loss
 * 4. Kernel-level stream assembly with zero memory spike (stream_copy_to_stream)
 * 5. Handles long videos (15m, 30m, 1h+) with 3600s execution limits
 * 6. Dual-Table Database Synchronization (media & media_items) and Real-Time Event Dispatch
 */

@set_time_limit(3600);
@ini_set('memory_limit', '1024M');
@ini_set('upload_max_filesize', '2048M');
@ini_set('post_max_size', '2048M');
@ini_set('max_execution_time', '3600');
@ini_set('max_input_time', '3600');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With, Range, X-Admin-Password');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';

$baseDir = dirname(__DIR__);
$uploadsDir = $baseDir . '/public/uploads';
$allChunksBaseDir = $baseDir . '/data/video_chunks';

if (!is_dir($uploadsDir)) @mkdir($uploadsDir, 0777, true);
if (!is_dir($allChunksBaseDir)) @mkdir($allChunksBaseDir, 0777, true);

// -------------------------------------------------------------
// ACTION 1: RESUME HANDSHAKE (GET or action=check)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET' || (isset($_REQUEST['action']) && $_REQUEST['action'] === 'check')) {
    $videoId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $_GET['videoId'] ?? ($_POST['videoId'] ?? ''));
    $totalChunks = isset($_GET['totalChunks']) ? (int)$_GET['totalChunks'] : (int)($_POST['totalChunks'] ?? 0);

    if (empty($videoId)) {
        echo json_encode(['success' => false, 'message' => 'videoId parameter is required']);
        exit;
    }

    // Check if the video has already been fully assembled previously
    $supportedExts = ['mp4', 'webm', 'mov', 'mkv'];
    foreach ($supportedExts as $ext) {
        $candidateFile = $uploadsDir . '/' . $videoId . '.' . $ext;
        if (file_exists($candidateFile) && filesize($candidateFile) > 0) {
            echo json_encode([
                'success' => true,
                'alreadyCompleted' => true,
                'videoId' => $videoId,
                'url' => '/uploads/' . $videoId . '.' . $ext,
                'stream_url' => '/api/video-stream?id=' . urlencode($videoId),
                'message' => 'Video already uploaded and completed'
            ]);
            exit;
        }
    }

    $chunksDir = $allChunksBaseDir . '/' . $videoId;
    $uploadedChunks = [];

    if (is_dir($chunksDir)) {
        clearstatcache();
        $files = scandir($chunksDir);
        foreach ($files as $f) {
            if (preg_match('/^(\d+)\.dat$/', $f, $m)) {
                $idx = (int)$m[1];
                $fullPath = $chunksDir . '/' . $f;
                if ($totalChunks <= 0 || $idx < $totalChunks) {
                    if (filesize($fullPath) > 0) {
                        $uploadedChunks[] = $idx;
                    }
                }
            }
        }
        sort($uploadedChunks, SORT_NUMERIC);
    }

    echo json_encode([
        'success' => true,
        'alreadyCompleted' => false,
        'videoId' => $videoId,
        'uploadedChunks' => $uploadedChunks,
        'uploadedCount' => count($uploadedChunks),
        'totalChunks' => $totalChunks
    ]);
    exit;
}

// -------------------------------------------------------------
// POST REQUEST PROCESSING (Binary chunk upload or assembly)
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$rawInput = '';
$input = $_POST;
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';

if (strpos($contentType, 'application/json') !== false) {
    $rawInput = file_get_contents('php://input');
    $json = json_decode($rawInput, true);
    if (is_array($json)) {
        $input = $json;
    }
}

$action = $input['action'] ?? ($_GET['action'] ?? 'upload');
$videoId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['videoId'] ?? ($_GET['videoId'] ?? ''));
$chunkIndex = isset($input['chunkIndex']) ? (int)$input['chunkIndex'] : (isset($_GET['chunkIndex']) ? (int)$_GET['chunkIndex'] : null);
$totalChunks = isset($input['totalChunks']) ? (int)$input['totalChunks'] : (isset($_GET['totalChunks']) ? (int)$_GET['totalChunks'] : null);
$isFinal = !empty($input['isFinal']) && ($input['isFinal'] === true || $input['isFinal'] === '1' || $input['isFinal'] === 1 || $input['isFinal'] === 'true');

if (empty($videoId)) {
    echo json_encode(['success' => false, 'message' => 'Missing videoId']);
    exit;
}

$chunksDir = $allChunksBaseDir . '/' . $videoId;
if (!is_dir($chunksDir)) {
    @mkdir($chunksDir, 0777, true);
}

// -------------------------------------------------------------
// ACTION 2: COMPLETE / ASSEMBLE VIDEO (Once all chunks uploaded)
// -------------------------------------------------------------
if ($action === 'complete' || $isFinal) {
    if (empty($totalChunks) || $totalChunks <= 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid totalChunks for assembly']);
        exit;
    }

    $title = trim($input['title'] ?? ($input['metadata']['title'] ?? 'Arab Hausa Video Broadcast'));
    $category = trim($input['category'] ?? ($input['metadata']['category'] ?? 'TV Broadcast'));
    $size = trim($input['size'] ?? ($input['metadata']['size'] ?? 'HD Video'));
    $posterUrl = trim($input['posterUrl'] ?? ($input['metadata']['posterUrl'] ?? ''));

    // Save client-captured video frame thumbnail to disk
    if (!empty($posterUrl) && strpos($posterUrl, 'data:image') === 0 && preg_match('/^data:([^;]+);base64,(.+)$/', $posterUrl, $pMatches)) {
        $thumbName = 'thumb_' . $videoId . '.jpg';
        $thumbPath = $uploadsDir . '/' . $thumbName;
        @file_put_contents($thumbPath, base64_decode($pMatches[2]));
        $posterUrl = '/uploads/' . $thumbName;
    }

    // Format extension: support mp4, mov, mkv, webm
    $rawExt = strtolower(trim($input['ext'] ?? ($input['metadata']['ext'] ?? 'mp4')));
    $rawExt = preg_replace('/[^a-z0-9]/', '', $rawExt);
    $validExts = ['mp4', 'mov', 'mkv', 'webm'];
    $ext = in_array($rawExt, $validExts) ? $rawExt : 'mp4';

    // Verify all chunks from 0 to totalChunks - 1 exist
    clearstatcache(true);
    $missingChunks = [];
    for ($i = 0; $i < $totalChunks; $i++) {
        $cTest = $chunksDir . '/' . $i . '.dat';
        if (!file_exists($cTest) || filesize($cTest) === 0) {
            $missingChunks[] = $i;
        }
    }

    if (!empty($missingChunks)) {
        echo json_encode([
            'success' => false,
            'message' => 'Cannot assemble video: ' . count($missingChunks) . ' chunks are missing',
            'missingChunks' => $missingChunks,
            'totalChunks' => $totalChunks
        ]);
        exit;
    }

    $videoFileName = $videoId . '.' . $ext;
    $fullVideoPath = $uploadsDir . '/' . $videoFileName;

    // High-speed stream assembly: zero memory overhead using stream_copy_to_stream
    $outHandle = fopen($fullVideoPath, 'wb');
    if (!$outHandle) {
        echo json_encode(['success' => false, 'message' => 'Unable to create destination video file on server']);
        exit;
    }

    for ($i = 0; $i < $totalChunks; $i++) {
        $cFile = $chunksDir . '/' . $i . '.dat';
        $inHandle = fopen($cFile, 'rb');
        if ($inHandle) {
            stream_copy_to_stream($inHandle, $outHandle);
            fclose($inHandle);
        }
        @unlink($cFile);
    }
    fclose($outHandle);
    @rmdir($chunksDir);

    $finalFileSize = file_exists($fullVideoPath) ? filesize($fullVideoPath) : 0;
    if ($finalFileSize === 0) {
        echo json_encode(['success' => false, 'message' => 'Assembly failed: output file is empty']);
        exit;
    }

    $directUrl = '/uploads/' . $videoFileName;
    $streamUrl = '/api/video-stream?id=' . urlencode($videoId);
    $newId = round(microtime(true) * 1000);

    $mediaItem = [
        'id'         => $newId,
        'type'       => 'video',
        'media_type' => 'Video',
        'name'       => $title,
        'title'      => $title,
        'category'   => $category,
        'caption'    => $category,
        'url'        => $directUrl,
        'stream_url' => $directUrl,
        'size'       => $size,
        'poster_url' => $posterUrl,
        'created_at' => date('c')
    ];

    // Dual-save to persistent JSON media catalogs
    $items1 = getLocalJsonStore('media.json');
    $items2 = getLocalJsonStore('media_items.json');

    $items1 = array_values(array_filter($items1, function($m) use ($title, $directUrl) {
        return ($m['url'] ?? '') !== $directUrl && ($m['name'] ?? '') !== $title;
    }));
    array_unshift($items1, $mediaItem);
    saveLocalJsonStore('media.json', $items1);

    $items2 = array_values(array_filter($items2, function($m) use ($title, $directUrl) {
        return ($m['url'] ?? '') !== $directUrl && ($m['title'] ?? '') !== $title;
    }));
    array_unshift($items2, $mediaItem);
    saveLocalJsonStore('media_items.json', $items2);

    // Save to Database (Universal PDO handles SQLite, MySQL, or PostgreSQL)
    global $pdo;
    if ($pdo) {
        try {
            $dupStmt = $pdo->prepare("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, created_at FROM media WHERE url = ? LIMIT 1");
            $dupStmt->execute([$directUrl]);
            $existing = $dupStmt->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                echo json_encode([
                    'success'      => true,
                    'message'      => 'Video already registered (deduplicated)',
                    'isFinal'      => true,
                    'media'        => $existing,
                    'url'          => $directUrl,
                    'stream_url'   => $directUrl,
                    'deduplicated' => true
                ]);
                exit;
            }
        } catch (\Throwable $e) {}

        try {
            $stmt = $pdo->prepare("
                INSERT INTO media (type, name, category, url, stream_url, poster_url, size)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute(['video', $title, $category, $directUrl, $directUrl, $posterUrl, $size]);
            $dbId = (int)$pdo->lastInsertId();
            if ($dbId > 0) $mediaItem['id'] = $dbId;
        } catch (\Throwable $e) {}

        try {
            $stmt2 = $pdo->prepare("
                INSERT INTO media_items (title, media_type, url, caption)
                VALUES (?, ?, ?, ?)
            ");
            $stmt2->execute([$title, 'Video', $directUrl, $category]);
        } catch (\Throwable $e) {}
    }

    // Broadcast live event so all public users see the video immediately without refreshing
    recordSystemEvent('media_uploaded', $mediaItem);

    echo json_encode([
        'success'    => true,
        'message'    => 'Video uploaded and published successfully!',
        'isFinal'    => true,
        'media'      => $mediaItem,
        'url'        => $directUrl,
        'stream_url' => $directUrl
    ]);
    exit;
}

// -------------------------------------------------------------
// ACTION 3: CHUNK UPLOAD
// -------------------------------------------------------------
if ($chunkIndex === null || empty($totalChunks)) {
    echo json_encode(['success' => false, 'message' => 'Missing chunkIndex or totalChunks']);
    exit;
}

$chunkFile = $chunksDir . '/' . $chunkIndex . '.dat';

// A. Multipart file upload via FormData (Direct disk write)
if (isset($_FILES['chunk']) && $_FILES['chunk']['error'] === UPLOAD_ERR_OK) {
    $tmpUploaded = $_FILES['chunk']['tmp_name'];
    if (@move_uploaded_file($tmpUploaded, $chunkFile) || @copy($tmpUploaded, $chunkFile)) {
        @unlink($tmpUploaded);
        echo json_encode([
            'success'    => true,
            'chunkIndex' => $chunkIndex,
            'videoId'    => $videoId,
            'message'    => "Binary chunk {$chunkIndex} stored successfully"
        ]);
        exit;
    }
}

// B. Raw binary stream (Content-Type: application/octet-stream)
if (strpos($contentType, 'application/octet-stream') !== false) {
    $rawBinary = file_get_contents('php://input');
    if ($rawBinary !== false && strlen($rawBinary) > 0) {
        $fp = fopen($chunkFile, 'wb');
        if ($fp) {
            fwrite($fp, $rawBinary);
            fflush($fp);
            fclose($fp);
            clearstatcache(true, $chunkFile);
            echo json_encode([
                'success'    => true,
                'chunkIndex' => $chunkIndex,
                'videoId'    => $videoId,
                'bytes'      => strlen($rawBinary),
                'message'    => "Raw binary chunk {$chunkIndex} stored successfully"
            ]);
            exit;
        }
    }
}

// C. Base64 JSON fallback
$base64Data = $input['data'] ?? '';
if (!empty($base64Data)) {
    $binaryChunk = base64_decode($base64Data);
    if ($binaryChunk !== false) {
        file_put_contents($chunkFile, $binaryChunk);
        echo json_encode([
            'success'    => true,
            'chunkIndex' => $chunkIndex,
            'videoId'    => $videoId,
            'message'    => "Chunk {$chunkIndex} stored via base64"
        ]);
        exit;
    }
}

echo json_encode([
    'success' => false,
    'message' => "Failed to receive chunk {$chunkIndex}. No valid payload detected."
]);
exit;
