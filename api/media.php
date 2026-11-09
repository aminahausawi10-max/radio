<?php
/**
 * Arab Hausa RTV - Media Gallery API
 * Fully unified with api/upload.php: GET, POST, DELETE with Dual-Table & JSON Sync
 */

require_once __DIR__ . "/../config/database.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Password, Accept, Range");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$masterAdminPass = getenv('ADMIN_PASSWORD') ?: ($_ENV['ADMIN_PASSWORD'] ?? 'YourSuperSecureAdminPassword2026');

// 1. GET ALL MEDIA
if ($method === 'GET') {
    if (session_status() === PHP_SESSION_ACTIVE) @session_write_close();
    
    $filterType  = $_GET['type'] ?? '';
    $destination = $_GET['destination'] ?? '';

    $items1 = getLocalJsonStore('media_items.json');
    $items2 = getLocalJsonStore('media.json');
    $pubPath = __DIR__ . '/../public/data/media.json';
    $items3 = [];
    if (file_exists($pubPath)) {
        $j = json_decode(@file_get_contents($pubPath), true);
        if (is_array($j)) $items3 = $j;
    }

    $dbItems = [];
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, COALESCE(duration, NULL) as duration, COALESCE(destination, 'tv') as destination, created_at FROM media ORDER BY id DESC LIMIT 200");
            $dbItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            try {
                $stmt = $pdo->query("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, created_at FROM media ORDER BY id DESC LIMIT 200");
                $dbItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (\Throwable $e2) {}
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

            $title = $m['title'] ?? ($m['name'] ?? 'Media Asset');
            $dest  = !empty($m['destination']) ? strtolower(trim($m['destination'])) : 'tv';
            if ($dest !== 'programs') $dest = 'tv';

            $urlKey = trim(strtolower($mediaUrl));
            $key = !empty($urlKey) ? $urlKey : ('id:' . strval($m['id'] ?? ''));
            if (!isset($map[$key])) {
                $map[$key] = [
                    'id'          => $m['id'] ?? round(microtime(true) * 1000),
                    'title'       => $title,
                    'media_type'  => ucfirst($normType === 'voicenote' ? 'Voice Note' : $normType),
                    'type'        => $normType,
                    'name'        => $title,
                    'destination' => $dest,
                    'url'         => $mediaUrl,
                    'stream_url'  => $m['stream_url'] ?? $mediaUrl,
                    'caption'     => $m['caption'] ?? ($m['category'] ?? ''),
                    'category'    => $m['category'] ?? ($m['caption'] ?? ''),
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
        $destFilter = strtolower(trim($destination));
        $allMedia = array_values(array_filter($allMedia, function($m) use ($destFilter) {
            $mDest = $m['destination'] ?? 'tv';
            if ($destFilter === 'programs') {
                return $mDest === 'programs';
            } elseif ($destFilter === 'tv') {
                return $mDest !== 'programs';
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

    if (isset($_GET['wrap']) || isset($_GET['format'])) {
        echo json_encode(["success" => true, "media" => $allMedia]);
    } else {
        echo json_encode($allMedia);
    }
    exit;
}

// Authorization check for POST & DELETE
$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true) ?: $_POST;

$adminPassword = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '';
if (function_exists('getallheaders')) {
    $headers = getallheaders();
    $adminPassword = $headers['X-Admin-Password'] ?? $headers['x-admin-password'] ?? $adminPassword;
}
$adminPassword = $adminPassword ?: ($data['admin_password'] ?? ($_GET['admin_password'] ?? ''));
$referer = $_SERVER['HTTP_REFERER'] ?? '';

$isAuthorized = (trim($adminPassword) === $masterAdminPass) || 
                (isset($_SESSION['admin_user'])) || 
                (isset($_SESSION['admin_logged_in'])) ||
                (strpos($referer, '/admin') !== false);

if (!$isAuthorized) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

// ACTION: Update destination or edit media
$action = $_GET['action'] ?? ($data['action'] ?? '');
if ($action === 'update_destination' || $action === 'edit_media' || $action === 'edit') {
    $id = strval($data['id'] ?? ($_GET['id'] ?? ''));
    $newDest = strtolower(trim($data['destination'] ?? ''));
    if (!empty($newDest) && $newDest !== 'programs') $newDest = 'tv';
    $newTitle = isset($data['title']) ? trim($data['title']) : (isset($data['name']) ? trim($data['name']) : null);
    $newCategory = isset($data['category']) ? trim($data['category']) : (isset($data['caption']) ? trim($data['caption']) : null);

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

// 2. CREATE MEDIA ITEM
if ($method === 'POST') {
    if (!isset($data['title']) && !isset($data['name'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing title/name"]);
        exit;
    }
    if (!isset($data['url']) && !isset($data['dataUrl'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing media URL"]);
        exit;
    }

    $title      = trim($data['title'] ?? ($data['name'] ?? 'Media Asset'));
    $url        = trim($data['url'] ?? ($data['dataUrl'] ?? ''));
    $rawType    = strtolower(str_replace([' ', '_', '-'], '', $data['type'] ?? ($data['media_type'] ?? 'photo')));
    $normType   = ($rawType === 'voicenote' || $rawType === 'audio' || $rawType === 'voice' || $rawType === 'sound') ? 'voicenote' : (($rawType === 'video') ? 'video' : (($rawType === 'photo' || $rawType === 'image') ? 'photo' : 'photo'));

    if ($normType === 'photo' && (preg_match('/\.(mp3|wav|ogg|oga|m4a|aac|flac)$/i', $url) || preg_match('/voice_[0-9]+.*\.webm$/i', $url))) {
        $normType = 'voicenote';
    } elseif ($normType === 'photo' && preg_match('/\.(mp4|mov|mkv|m3u8)$/i', $url)) {
        $normType = 'video';
    }

    $dest = strtolower(trim($data['destination'] ?? 'tv'));
    if ($dest !== 'programs') $dest = 'tv';

    $media_type = ucfirst($normType === 'voicenote' ? 'Voice Note' : $normType);
    $caption    = trim($data['caption'] ?? ($data['category'] ?? 'TV Studio'));
    $posterUrl  = trim($data['poster_url'] ?? ($data['posterUrl'] ?? ''));
    $size       = trim($data['size'] ?? 'HD Media');
    $duration   = !empty($data['duration']) ? (float)$data['duration'] : null;
    $newId      = round(microtime(true) * 1000);

    // Deduplication & idempotency check
    if ($pdo) {
        try {
            $checkStmt = $pdo->prepare("SELECT id, type, name, category, url, COALESCE(stream_url, url) as stream_url, COALESCE(poster_url, '') as poster_url, size, COALESCE(destination, 'tv') as destination, created_at FROM media WHERE url = ? LIMIT 1");
            $checkStmt->execute([$url]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                echo json_encode($existing);
                exit;
            }
        } catch (\Throwable $e) {}
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO media (type, name, category, destination, url, stream_url, poster_url, size, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$normType, $title, $caption, $dest, $url, $url, $posterUrl, $size, $duration]);
            $insertedId = (int)$pdo->lastInsertId();
            if ($insertedId > 0) $newId = $insertedId;
        } catch (\Throwable $e) {
            try {
                $stmt = $pdo->prepare("INSERT INTO media (type, name, category, url, stream_url, poster_url, size) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$normType, $title, $caption, $url, $url, $posterUrl, $size]);
                $insertedId = (int)$pdo->lastInsertId();
                if ($insertedId > 0) $newId = $insertedId;
            } catch (\Exception $e2) {}
        }
        try {
            $stmt2 = $pdo->prepare("INSERT INTO media_items (title, media_type, url, caption, destination) VALUES (?, ?, ?, ?, ?)");
            $stmt2->execute([$title, $media_type, $url, $caption, $dest]);
        } catch (\Exception $e) {
            try {
                $stmt2 = $pdo->prepare("INSERT INTO media_items (title, media_type, url, caption) VALUES (?, ?, ?, ?)");
                $stmt2->execute([$title, $media_type, $url, $caption]);
            } catch (\Exception $e2) {}
        }
    }

    $newItem = [
        "id"          => $newId,
        "title"       => $title,
        "name"        => $title,
        "media_type"  => $media_type,
        "type"        => $normType,
        "destination" => $dest,
        "url"         => $url,
        "stream_url"  => $url,
        "poster_url"  => $posterUrl,
        "caption"     => $caption,
        "category"    => $caption,
        "size"        => $size,
        "duration"    => $duration,
        "created_at"  => date('c')
    ];

    $items = getLocalJsonStore('media_items.json');
    array_unshift($items, $newItem);
    saveLocalJsonStore('media_items.json', $items);

    $legacy = getLocalJsonStore('media.json');
    array_unshift($legacy, $newItem);
    saveLocalJsonStore('media.json', $legacy);

    recordSystemEvent('media_uploaded', $newItem);

    echo json_encode([
        "success" => true,
        "id"      => $newId,
        "media"   => $newItem
    ]);
    exit;
}

// 3. DELETE MEDIA ITEM
if ($method === 'DELETE') {
    $id = strval($_GET['id'] ?? ($data['id'] ?? ''));
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["error" => "Missing media ID"]);
        exit;
    }

    $items1 = getLocalJsonStore('media_items.json');
    $items2 = getLocalJsonStore('media.json');
    foreach (array_merge($items1, $items2) as $m) {
        if (strval($m['id'] ?? '') === $id || ($m['url'] ?? '') === $id) {
            $u = $m['url'] ?? '';
            if (!empty($u) && strpos($u, '/uploads/') === 0) {
                $localPath = __DIR__ . '/../public' . $u;
                if (file_exists($localPath)) @unlink($localPath);
            }
        }
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM media WHERE id = ? OR url = ?");
            $stmt->execute([$id, $id]);
        } catch (\Exception $e) {}
        try {
            $stmt2 = $pdo->prepare("DELETE FROM media_items WHERE id = ? OR url = ?");
            $stmt2->execute([$id, $id]);
        } catch (\Exception $e) {}
    }

    $filtered1 = array_values(array_filter($items1, function($m) use ($id) {
        return strval($m['id'] ?? '') !== $id && ($m['url'] ?? '') !== $id;
    }));
    saveLocalJsonStore('media_items.json', $filtered1);

    $filtered2 = array_values(array_filter($items2, function($m) use ($id) {
        return strval($m['id'] ?? '') !== $id && ($m['url'] ?? '') !== $id;
    }));
    saveLocalJsonStore('media.json', $filtered2);

    recordSystemEvent('media_deleted', ['id' => $id]);

    echo json_encode(["success" => true, "id" => $id]);
    exit;
}
