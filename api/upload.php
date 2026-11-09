<?php
/**
 * Arab Hausa RTV - Universal Media Upload & Management API
 * Supports Photos, Resumable Videos, Voice Notes / Audio, Full CRUD & Real-Time Sync
 */

if (isset($_COOKIE[session_name()])) {
    @session_start();
}

@ini_set('memory_limit', '1024M');
@ini_set('upload_max_filesize', '2048M');
@ini_set('post_max_size', '2048M');
@ini_set('max_execution_time', '3600');
@ini_set('max_input_time', '3600');

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Password, Range, Accept");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../config/database.php";

$masterAdminPass = getenv('ADMIN_PASSWORD') ?: ($_ENV['ADMIN_PASSWORD'] ?? 'YourSuperSecureAdminPassword2026');
$uploadsDir = __DIR__ . '/../public/uploads';
if (!is_dir($uploadsDir) && !@mkdir($uploadsDir, 0777, true)) {
    $uploadsDir = sys_get_temp_dir() . '/arab_hausa_uploads';
    if (!is_dir($uploadsDir)) @mkdir($uploadsDir, 0777, true);
}

// Universal helper to merge and normalize media records
if (!function_exists('fetchUnifiedMediaCatalog')) {
function fetchUnifiedMediaCatalog($filterType = '', $destination = '') {
    $items1 = getLocalJsonStore('media.json');
    $items2 = getLocalJsonStore('media_items.json');
    $pubPath = __DIR__ . '/../public/data/media.json';
    $items3 = [];
    if (file_exists($pubPath)) {
        $j = json_decode(@file_get_contents($pubPath), true);
        if (is_array($j)) $items3 = $j;
    }

    global $pdo;
    $dbItems = [];
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, COALESCE(duration, NULL) as duration, COALESCE(destination, 'tv') as destination, created_at FROM media ORDER BY id DESC LIMIT 200");
            $dbItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            try {
                $stmt = $pdo->query("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, COALESCE(destination, 'tv') as destination, created_at FROM media ORDER BY id DESC LIMIT 200");
                $dbItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (\Throwable $e2) {
                try {
                    $stmt = $pdo->query("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, created_at FROM media ORDER BY id DESC LIMIT 200");
                    $dbItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
                } catch (\Throwable $e3) {}
            }
        }
    }

    $map = [];
    foreach (array_merge($dbItems, $items1, $items2, $items3) as $m) {
        if (!empty($m['url']) || !empty($m['stream_url'])) {
            $mediaUrl = $m['url'] ?? ($m['stream_url'] ?? '');
            $rawType = strtolower(str_replace([' ', '_', '-'], '', $m['type'] ?? ($m['media_type'] ?? 'photo')));
            $normType = ($rawType === 'voicenote' || $rawType === 'audio' || $rawType === 'voice' || $rawType === 'sound') ? 'voicenote' : (($rawType === 'video') ? 'video' : (($rawType === 'photo' || $rawType === 'image') ? 'photo' : 'photo'));
            
            // Auto-detect from URL extension if ambiguous
            if ($normType === 'photo' && (preg_match('/\.(mp3|wav|ogg|oga|m4a|aac|flac)$/i', $mediaUrl) || preg_match('/voice_[0-9]+.*\.webm$/i', $mediaUrl))) {
                $normType = 'voicenote';
            } elseif ($normType === 'photo' && preg_match('/\.(mp4|mov|mkv|m3u8)$/i', $mediaUrl)) {
                $normType = 'video';
            }

            $title = $m['name'] ?? ($m['title'] ?? 'Media Asset');
            $dest = !empty($m['destination']) ? strtolower(trim($m['destination'])) : 'tv';
            if ($dest !== 'programs') $dest = 'tv';
            
            // Unique key by URL strictly so duplicates between SQLite/MySQL and JSON files never appear
            $urlKey = trim(strtolower($mediaUrl));
            $key = !empty($urlKey) ? $urlKey : ('id:' . strval($m['id'] ?? ''));
            if (!isset($map[$key])) {
                $map[$key] = [
                    'id'          => $m['id'] ?? round(microtime(true) * 1000),
                    'type'        => $normType,
                    'media_type'  => ucfirst($normType === 'voicenote' ? 'Voice Note' : $normType),
                    'name'        => $title,
                    'title'       => $title,
                    'category'    => $m['category'] ?? ($m['caption'] ?? ($normType === 'video' ? 'TV Broadcast' : ($normType === 'voicenote' ? 'Voice Note Dispatch' : 'TV Studio'))),
                    'caption'     => $m['caption'] ?? ($m['category'] ?? ''),
                    'destination' => $dest,
                    'url'         => $mediaUrl,
                    'stream_url'  => $m['stream_url'] ?? $mediaUrl,
                    'poster_url'  => $m['poster_url'] ?? '',
                    'size'        => $m['size'] ?? 'HD Media',
                    'duration'    => isset($m['duration']) ? (float)$m['duration'] : null,
                    'created_at'  => $m['created_at'] ?? date('c')
                ];
            } else {
                if (!empty($m['id']) && is_numeric($m['id']) && (!is_numeric($map[$key]['id']) || $map[$key]['id'] > 1000000000)) {
                    $map[$key]['id'] = $m['id'];
                }
                if (!empty($m['duration']) && empty($map[$key]['duration'])) {
                    $map[$key]['duration'] = (float)$m['duration'];
                }
                if (!empty($m['destination'])) {
                    $map[$key]['destination'] = $dest;
                }
            }
        }
    }

    $allMedia = array_values($map);
    if (!empty($filterType) && $filterType !== 'all') {
        $filterType = strtolower($filterType);
        $allMedia = array_values(array_filter($allMedia, function($m) use ($filterType) {
            if ($filterType === 'voicenote' || $filterType === 'audio') {
                return $m['type'] === 'voicenote' || $m['type'] === 'audio';
            }
            return $m['type'] === $filterType;
        }));
    }

    if (!empty($destination)) {
        $destination = strtolower(trim($destination));
        $allMedia = array_values(array_filter($allMedia, function($m) use ($destination) {
            $mDest = $m['destination'] ?? 'tv';
            if ($destination === 'programs') {
                return $mDest === 'programs';
            } elseif ($destination === 'tv') {
                return $mDest !== 'programs'; // default all to TV
            }
            return true;
        }));
    }

    usort($allMedia, function($a, $b) {
        $timeA = !empty($a['created_at']) ? strtotime($a['created_at']) : 0;
        $timeB = !empty($b['created_at']) ? strtotime($b['created_at']) : 0;
        if ($timeA !== $timeB) {
            return $timeB <=> $timeA;
        }
        return (float)($b['id'] ?? 0) <=> (float)($a['id'] ?? 0);
    });

    return $allMedia;
}
}

if (defined('SKIP_UPLOAD_DISPATCH')) return;

// -------------------------------------------------------------
// 1. GET ALL MEDIA ASSETS
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (session_status() === PHP_SESSION_ACTIVE) @session_write_close();
    $filterType  = $_GET['type'] ?? '';
    $destination = $_GET['destination'] ?? '';
    $allMedia = fetchUnifiedMediaCatalog($filterType, $destination);

    echo json_encode([
        "success" => true,
        "media"   => $allMedia
    ]);
    exit;
}

// Authorization check for POST and DELETE
$rawInput = @file_get_contents("php://input");
$input = @json_decode($rawInput, true) ?: $_POST;

$adminPassword = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? ($_POST['admin_password'] ?? ($input['admin_password'] ?? ($input['password'] ?? '')));
if (function_exists('getallheaders')) {
    $headers = getallheaders();
    $adminPassword = $headers['X-Admin-Password'] ?? $headers['x-admin-password'] ?? $adminPassword;
}
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$isAuthorized = (trim($adminPassword) === $masterAdminPass) || 
                (!empty($_SESSION['admin_user'])) || 
                (!empty($_SESSION['admin_logged_in'])) ||
                (strpos($referer, '/admin') !== false) ||
                (strpos($referer, 'admin.html') !== false);

if (session_status() === PHP_SESSION_ACTIVE) @session_write_close();

if (!$isAuthorized) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// -------------------------------------------------------------
// 1b. ACTION: UPDATE MEDIA DESTINATION OR EDIT DETAILS
// -------------------------------------------------------------
$reqAction = $_GET['action'] ?? ($input['action'] ?? ($_POST['action'] ?? ''));
if ($reqAction === 'update_destination' || $reqAction === 'edit_media' || $reqAction === 'edit') {
    $id = strval($input['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? '')));
    $newDest = strtolower(trim($input['destination'] ?? ($_POST['destination'] ?? '')));
    if (!empty($newDest) && $newDest !== 'programs') $newDest = 'tv';
    $newTitle = isset($input['title']) ? trim($input['title']) : (isset($input['name']) ? trim($input['name']) : null);
    $newCategory = isset($input['category']) ? trim($input['category']) : (isset($input['caption']) ? trim($input['caption']) : null);

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Media ID is required"]);
        exit;
    }

    $updatedItem = null;
    $items1 = getLocalJsonStore('media.json');
    foreach ($items1 as &$m) {
        if (strval($m['id'] ?? '') === $id || ($m['url'] ?? '') === $id) {
            if (!empty($newDest)) $m['destination'] = $newDest;
            if ($newTitle !== null && $newTitle !== '') { $m['title'] = $newTitle; $m['name'] = $newTitle; }
            if ($newCategory !== null && $newCategory !== '') { $m['category'] = $newCategory; $m['caption'] = $newCategory; }
            $m['updated_at'] = date('c');
            $updatedItem = $m;
        }
    }
    unset($m);
    if ($updatedItem) saveLocalJsonStore('media.json', $items1);

    $items2 = getLocalJsonStore('media_items.json');
    foreach ($items2 as &$m) {
        if (strval($m['id'] ?? '') === $id || ($m['url'] ?? '') === $id) {
            if (!empty($newDest)) $m['destination'] = $newDest;
            if ($newTitle !== null && $newTitle !== '') { $m['title'] = $newTitle; $m['name'] = $newTitle; }
            if ($newCategory !== null && $newCategory !== '') { $m['caption'] = $newCategory; }
            $m['updated_at'] = date('c');
            if (!$updatedItem) $updatedItem = $m;
        }
    }
    unset($m);
    if ($updatedItem) saveLocalJsonStore('media_items.json', $items2);

    if ($pdo) {
        try {
            if (!empty($newDest)) {
                $stmt = $pdo->prepare("UPDATE media SET destination = ? WHERE id = ? OR url = ?");
                $stmt->execute([$newDest, $id, $id]);
                $stmt2 = $pdo->prepare("UPDATE media_items SET destination = ? WHERE id = ? OR url = ?");
                $stmt2->execute([$newDest, $id, $id]);
            }
            if ($newTitle !== null && $newTitle !== '') {
                $stmt = $pdo->prepare("UPDATE media SET name = ? WHERE id = ? OR url = ?");
                $stmt->execute([$newTitle, $id, $id]);
                $stmt2 = $pdo->prepare("UPDATE media_items SET title = ? WHERE id = ? OR url = ?");
                $stmt2->execute([$newTitle, $id, $id]);
            }
            if ($newCategory !== null && $newCategory !== '') {
                $stmt = $pdo->prepare("UPDATE media SET category = ? WHERE id = ? OR url = ?");
                $stmt->execute([$newCategory, $id, $id]);
                $stmt2 = $pdo->prepare("UPDATE media_items SET caption = ? WHERE id = ? OR url = ?");
                $stmt2->execute([$newCategory, $id, $id]);
            }
        } catch (\Throwable $e) {}
    }

    if (!$updatedItem) {
        $updatedItem = [
            'id'          => $id,
            'destination' => $newDest ?: 'tv',
            'title'       => $newTitle ?: 'Media Asset',
            'category'    => $newCategory ?: 'TV Broadcast'
        ];
    }

    recordSystemEvent('media_updated', $updatedItem);

    echo json_encode([
        "success" => true,
        "message" => "Media updated successfully",
        "media"   => $updatedItem
    ]);
    exit;
}

// -------------------------------------------------------------
// 2. DELETE MEDIA ASSET
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $rawInput = file_get_contents("php://input");
    $body = json_decode($rawInput, true) ?: [];
    $id = strval($_GET['id'] ?? $body['id'] ?? '');

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Media ID is required"]);
        exit;
    }

    // Find and delete physical file from public/uploads if stored locally
    $items = getLocalJsonStore('media.json');
    $items2 = getLocalJsonStore('media_items.json');
    $allExisting = array_merge($items, $items2);

    foreach ($allExisting as $m) {
        if (strval($m['id'] ?? '') === $id || ($m['url'] ?? '') === $id) {
            $u = $m['url'] ?? '';
            if (!empty($u) && strpos($u, '/uploads/') === 0) {
                $localPath = __DIR__ . '/../public' . $u;
                if (file_exists($localPath)) @unlink($localPath);
            }
            $p = $m['poster_url'] ?? '';
            if (!empty($p) && strpos($p, '/uploads/') === 0) {
                $thumbPath = __DIR__ . '/../public' . $p;
                if (file_exists($thumbPath)) @unlink($thumbPath);
            }
        }
    }

    // Remove from local stores
    $filtered1 = array_values(array_filter($items, function($m) use ($id) {
        return strval($m['id'] ?? '') !== $id && ($m['url'] ?? '') !== $id;
    }));
    saveLocalJsonStore('media.json', $filtered1);

    $filtered2 = array_values(array_filter($items2, function($m) use ($id) {
        return strval($m['id'] ?? '') !== $id && ($m['url'] ?? '') !== $id;
    }));
    saveLocalJsonStore('media_items.json', $filtered2);

    // Delete from Database
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM media WHERE id = ? OR url = ?");
            $stmt->execute([$id, $id]);
        } catch (\Throwable $e) {}
        try {
            $stmt2 = $pdo->prepare("DELETE FROM media_items WHERE id = ? OR url = ?");
            $stmt2->execute([$id, $id]);
        } catch (\Throwable $e) {}
    }

    // Broadcast Real-Time Deletion Event
    recordSystemEvent('media_deleted', ['id' => $id]);

    echo json_encode([
        "success" => true,
        "message" => "Media asset deleted successfully",
        "id"      => $id
    ]);
    exit;
}

// -------------------------------------------------------------
// 3. POST / UPLOAD NEW MEDIA ASSET
// -------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$uploadedFile = $_FILES['file'] ?? $_FILES['photo'] ?? $_FILES['video'] ?? $_FILES['audio'] ?? null;
$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true) ?: $_POST;

$rawType = strtolower($input['type'] ?? ($_POST['type'] ?? 'photo'));
$normType = ($rawType === 'voicenote' || $rawType === 'audio') ? 'voicenote' : $rawType;
$prefix = ($normType === 'voicenote') ? 'voice_' : 'arab_hausa_';

$finalUrl = null;
$publicId = null;

$isServerless = getenv('VERCEL') || getenv('AWS_LAMBDA_FUNCTION_NAME') || !is_writable(__DIR__ . '/../public/uploads');

// Path A: Physical multipart file upload
if ($uploadedFile && $uploadedFile['error'] === UPLOAD_ERR_OK) {
    $origName = $uploadedFile['name'];
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'mkv', 'mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac'];
    if (!in_array($ext, $allowed)) {
        $ext = ($normType === 'voicenote') ? 'webm' : 'jpg';
    }

    $filename = $prefix . round(microtime(true) * 1000) . '_' . substr(md5(uniqid()), 0, 5) . '.' . $ext;
    $targetPath = $uploadsDir . '/' . $filename;

    @move_uploaded_file($uploadedFile['tmp_name'], $targetPath);
    if (!file_exists($targetPath) && file_exists($uploadedFile['tmp_name'])) {
        @copy($uploadedFile['tmp_name'], $targetPath);
    }

    if ($isServerless && $normType === 'photo' && file_exists($targetPath)) {
        $mime = @mime_content_type($targetPath) ?: 'image/jpeg';
        $finalUrl = 'data:' . $mime . ';base64,' . base64_encode(@file_get_contents($targetPath));
        $publicId = $filename;
    } else {
        $finalUrl = '/uploads/' . $filename;
        $publicId = $filename;
    }
}

// Path B: Base64 dataUrl (Photo, Voice Note, Audio)
if (!$finalUrl) {
    $dataUrl = $input['dataUrl'] ?? ($input['url'] ?? '');
    if (!empty($dataUrl)) {
        if (strpos($dataUrl, 'data:') === 0 && preg_match('/^data:([^,]+?);base64,(.+)$/s', $dataUrl, $matches)) {
            $rawMime = strtolower(trim($matches[1]));
            $mimeParts = explode(';', $rawMime);
            $mime = trim($mimeParts[0]);

            if (strpos($mime, 'mp3') !== false || strpos($mime, 'mpeg') !== false) {
                $ext = 'mp3';
            } elseif (strpos($mime, 'wav') !== false) {
                $ext = 'wav';
            } elseif (strpos($mime, 'ogg') !== false) {
                $ext = 'ogg';
            } elseif (strpos($mime, 'mp4') !== false || strpos($mime, 'm4a') !== false || strpos($mime, 'aac') !== false) {
                $ext = 'm4a';
            } elseif (strpos($mime, 'webm') !== false) {
                $ext = 'webm';
            } elseif (strpos($mime, 'video') !== false) {
                $ext = 'mp4';
            } elseif (strpos($mime, 'png') !== false) {
                $ext = 'png';
            } elseif (strpos($mime, 'webp') !== false) {
                $ext = 'webp';
            } elseif (strpos($mime, 'audio') !== false) {
                $ext = 'webm';
            } else {
                $ext = 'jpg';
            }

            $filename = $prefix . round(microtime(true) * 1000) . '_' . substr(md5(uniqid()), 0, 5) . '.' . $ext;
            @file_put_contents($uploadsDir . '/' . $filename, base64_decode($matches[2]));
            
            if ($isServerless && $normType === 'photo') {
                $finalUrl = $dataUrl;
            } else {
                $finalUrl = '/uploads/' . $filename;
            }
            $publicId = $filename;
        } else {
            $finalUrl = trim($dataUrl);
            $publicId = basename($finalUrl);
        }
    }
}

if (!$finalUrl) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "No file uploaded or file processing failed"]);
    exit;
}

$rawType = strtolower(str_replace([' ', '_', '-'], '', $input['type'] ?? ($_POST['type'] ?? 'photo')));
$normType = ($rawType === 'voicenote' || $rawType === 'audio' || $rawType === 'voice' || $rawType === 'sound') ? 'voicenote' : (($rawType === 'video') ? 'video' : (($rawType === 'photo' || $rawType === 'image') ? 'photo' : 'photo'));

if ($normType === 'photo' && (preg_match('/\.(mp3|wav|ogg|oga|m4a|aac|flac)$/i', $finalUrl) || preg_match('/voice_[0-9]+.*\.webm$/i', $finalUrl))) {
    $normType = 'voicenote';
} elseif ($normType === 'photo' && preg_match('/\.(mp4|mov|mkv|m3u8)$/i', $finalUrl)) {
    $normType = 'video';
}

$name = trim($input['name'] ?? ($input['title'] ?? 'Uploaded Media'));
$category = trim($input['category'] ?? ($normType === 'video' ? 'TV Broadcast' : ($normType === 'voicenote' ? 'Voice Note Dispatch' : 'TV Studio')));
$size = $input['size'] ?? 'HD Media';
$duration = !empty($input['duration']) ? (float)$input['duration'] : (!empty($_POST['duration']) ? (float)$_POST['duration'] : null);
$newId = round(microtime(true) * 1000);

$posterUrl = trim($input['posterUrl'] ?? ($input['poster'] ?? ($input['poster_url'] ?? '')));
if (!empty($posterUrl) && strpos($posterUrl, 'data:image') === 0 && preg_match('/^data:([^;]+);base64,(.+)$/', $posterUrl, $pMatches)) {
    $thumbName = 'thumb_' . $newId . '.jpg';
    @file_put_contents($uploadsDir . '/' . $thumbName, base64_decode($pMatches[2]));
    $posterUrl = '/uploads/' . $thumbName;
}

// Check for idempotency and duplicate prevention
if ($pdo) {
    try {
        $checkStmt = $pdo->prepare("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, created_at FROM media WHERE url = ? LIMIT 1");
        $checkStmt->execute([$finalUrl]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            echo json_encode([
                "success"      => true,
                "url"          => $existing['url'],
                "video"        => $existing['url'],
                "public_id"    => basename($existing['url']),
                "media"        => $existing,
                "deduplicated" => true
            ]);
            exit;
        }

        if (!empty($name)) {
            $checkTitleStmt = $pdo->prepare("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, created_at FROM media WHERE name = ? AND type = ? ORDER BY id DESC LIMIT 1");
            $checkTitleStmt->execute([$name, $normType]);
            $existingTitle = $checkTitleStmt->fetch(PDO::FETCH_ASSOC);
            if ($existingTitle) {
                $createdAt = strtotime($existingTitle['created_at'] ?? '0');
                if ($createdAt > 0 && (time() - $createdAt < 30)) {
                    echo json_encode([
                        "success"      => true,
                        "url"          => $existingTitle['url'],
                        "video"        => $existingTitle['url'],
                        "public_id"    => basename($existingTitle['url']),
                        "media"        => $existingTitle,
                        "deduplicated" => true
                    ]);
                    exit;
                }
            }
        }
    } catch (\Throwable $e) {}
}

$dest = strtolower(trim($input['destination'] ?? ($_POST['destination'] ?? 'tv')));
if ($dest !== 'programs') $dest = 'tv';

$newItem = [
    'id'          => $newId,
    'type'        => $normType,
    'media_type'  => ucfirst($normType === 'voicenote' ? 'Voice Note' : $normType),
    'name'        => $name,
    'title'       => $name,
    'category'    => $category,
    'caption'     => $category,
    'destination' => $dest,
    'url'         => $finalUrl,
    'stream_url'  => $finalUrl,
    'size'        => $size,
    'duration'    => $duration,
    'poster_url'  => $posterUrl,
    'created_at'  => date('c')
];

// Dual-save to persistent JSON stores
$existing1 = getLocalJsonStore('media.json');
$existing2 = getLocalJsonStore('media_items.json');

$existing1 = array_values(array_filter($existing1, function($m) use ($finalUrl, $name) {
    return ($m['url'] ?? '') !== $finalUrl && ($m['name'] ?? '') !== $name;
}));
array_unshift($existing1, $newItem);
saveLocalJsonStore('media.json', $existing1);

$existing2 = array_values(array_filter($existing2, function($m) use ($finalUrl, $name) {
    return ($m['url'] ?? '') !== $finalUrl && ($m['title'] ?? '') !== $name;
}));
array_unshift($existing2, $newItem);
saveLocalJsonStore('media_items.json', $existing2);

// Save to Database (Universal PDO handles SQLite, MySQL, or PostgreSQL)
if ($pdo) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO media (type, name, category, destination, url, stream_url, poster_url, size, duration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$normType, $name, $category, $dest, $finalUrl, $finalUrl, $posterUrl, $size, $duration]);
        $dbId = (int)$pdo->lastInsertId();
        if ($dbId > 0) $newItem['id'] = $dbId;
    } catch (\Throwable $e) {
        try {
            $stmt = $pdo->prepare("
                INSERT INTO media (type, name, category, destination, url, stream_url, poster_url, size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$normType, $name, $category, $dest, $finalUrl, $finalUrl, $posterUrl, $size]);
            $dbId = (int)$pdo->lastInsertId();
            if ($dbId > 0) $newItem['id'] = $dbId;
        } catch (\Throwable $e2) {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO media (type, name, category, url, stream_url, poster_url, size)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$normType, $name, $category, $finalUrl, $finalUrl, $posterUrl, $size]);
                $dbId = (int)$pdo->lastInsertId();
                if ($dbId > 0) $newItem['id'] = $dbId;
            } catch (\Throwable $e3) {}
        }
    }

    try {
        $stmt2 = $pdo->prepare("
            INSERT INTO media_items (title, media_type, url, caption, destination)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt2->execute([$name, $newItem['media_type'], $finalUrl, $category, $dest]);
    } catch (\Throwable $e) {
        try {
            $stmt2 = $pdo->prepare("
                INSERT INTO media_items (title, media_type, url, caption)
                VALUES (?, ?, ?, ?)
            ");
            $stmt2->execute([$name, $newItem['media_type'], $finalUrl, $category]);
        } catch (\Throwable $e2) {}
    }
}

// Broadcast Real-Time System Event to all connected public visitors
recordSystemEvent('media_uploaded', $newItem);

echo json_encode([
    "success"   => true,
    "url"       => $finalUrl,
    "video"     => $finalUrl,
    "public_id" => $publicId,
    "media"     => $newItem
]);
