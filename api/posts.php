<?php
/**
 * Arab Hausa RTV - Posts & News Articles API
 */
@ini_set('memory_limit', '256M');
header("Content-Type: application/json");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Password");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../config/database.php";

$method = $_SERVER['REQUEST_METHOD'];
$masterAdminPass = getenv('ADMIN_PASSWORD') ?: ($_ENV['ADMIN_PASSWORD'] ?? 'YourSuperSecureAdminPassword2026');

// Master Admin Password verification for write operations
if ($method === 'POST' || $method === 'DELETE') {
    $rawInput = file_get_contents("php://input");
    $data = json_decode($rawInput, true) ?: [];

    $adminPassword = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '';
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $adminPassword = $headers['X-Admin-Password'] ?? $headers['x-admin-password'] ?? $adminPassword;
    }
    $adminPassword = $adminPassword ?: ($data['admin_password'] ?? $_GET['admin_password'] ?? '');
    
    // Also accept admin session or token if logged in
    $isAuthorized = (trim($adminPassword) === $masterAdminPass) || (isset($_SESSION['admin_user']));
    
    if (!$isAuthorized) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized: Incorrect Admin Password"]);
        exit;
    }
}

// 1. GET ALL POSTS (Instant 1ms response from local store)
if ($method === 'GET') {
    if (session_status() === PHP_SESSION_ACTIVE) @session_write_close();
    
    $posts = getLocalJsonStore('posts.json');
    if (empty($posts)) {
        $legacyNews = getLocalJsonStore('news.json');
        if (!empty($legacyNews)) {
            $posts = array_map(function($n) {
                return [
                    'id' => $n['id'] ?? round(microtime(true) * 1000),
                    'title' => $n['title'] ?? 'News Update',
                    'content' => $n['content'] ?? '',
                    'category' => $n['category'] ?? 'Official Update',
                    'photo' => $n['image_url'] ?? null,
                    'video' => null,
                    'audio' => null,
                    'created_at' => $n['created_at'] ?? date('c')
                ];
            }, $legacyNews);
        }
    }

    if (empty($posts) && $pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM posts ORDER BY id DESC LIMIT 50");
            $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {}
    }

    echo json_encode(array_values($posts));
    exit;
}

// 2. CREATE POST
if ($method === 'POST') {
    $rawInput = file_get_contents("php://input");
    $data = json_decode($rawInput, true) ?: $_POST;

    if (!isset($data['title']) || !isset($data['content'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing title or content"]);
        exit;
    }
    
    $title    = trim($data['title']);
    $content  = trim($data['content']);
    $category = !empty($data['category']) ? trim($data['category']) : 'Official Update';
    $photo    = !empty($data['photo']) ? $data['photo'] : null;
    $video    = !empty($data['video']) ? $data['video'] : null;
    $audio    = !empty($data['audio']) ? $data['audio'] : null;

    $newId = round(microtime(true) * 1000);

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO posts (title, content, category, photo, video, audio) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$title, $content, $category, $photo, $video, $audio]);
            $insertedId = (int)$pdo->lastInsertId();
            if ($insertedId > 0) $newId = $insertedId;
        } catch (\Exception $e) {}
    }

    $newPost = [
        "id" => $newId,
        "title" => $title,
        "content" => $content,
        "category" => $category,
        "photo" => $photo,
        "video" => $video,
        "audio" => $audio,
        "created_at" => date('c')
    ];

    // Permanently persist in local JSON backup
    $posts = getLocalJsonStore('posts.json');
    array_unshift($posts, $newPost);
    saveLocalJsonStore('posts.json', $posts);

    // Broadcast Real-Time Update to all connected visitors
    recordSystemEvent('post_published', $newPost);

    echo json_encode([
        "success" => true,
        "id" => $newId,
        "post" => $newPost
    ]);
    exit;
}

// 3. DELETE POST
if ($method === 'DELETE') {
    $rawInput = file_get_contents("php://input");
    $body = json_decode($rawInput, true) ?: [];
    $id = $_GET['id'] ?? $body['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing post ID"]);
        exit;
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("DELETE FROM posts WHERE id = ?");
            $stmt->execute([$id]);
        } catch (\Exception $e) {}
    }

    $posts = getLocalJsonStore('posts.json');
    $posts = array_values(array_filter($posts, function($p) use ($id) {
        return strval($p['id'] ?? '') !== strval($id);
    }));
    saveLocalJsonStore('posts.json', $posts);

    recordSystemEvent('post_deleted', ['id' => $id]);

    echo json_encode(["success" => true, "id" => (int)$id]);
    exit;
}
