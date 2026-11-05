<?php
if (isset($_COOKIE[session_name()])) {
    @session_start();
    @session_write_close();
}
header('Content-Type: application/json');
header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$dataFile = __DIR__ . '/../data/news.json';
$pubDataFile = __DIR__ . '/../public/data/news.json';

function getLocalNews($file) {
    if (file_exists($file)) {
        $content = file_get_contents($file);
        $json = json_decode($content, true);
        if (is_array($json)) return $json;
    }
    return [];
}

function saveLocalNews($file, $pubFile, $items) {
    $dir = dirname($file);
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    file_put_contents($file, json_encode(array_values($items), JSON_PRETTY_PRINT));

    $pubDir = dirname($pubFile);
    if (!is_dir($pubDir)) mkdir($pubDir, 0777, true);
    file_put_contents($pubFile, json_encode(array_values($items), JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $category = $_GET['category'] ?? '';
    $search = $_GET['search'] ?? '';

    // Fast 1ms Local File Feed
    $news = getLocalNews($dataFile);
    if (empty($news)) {
        $news = getLocalNews($pubDataFile);
    }

    if (empty($news)) {
        // Attempt Neon if local store is empty
        try {
            require_once __DIR__ . '/db.php';
            $db = getDB();
            $sql = "SELECT id, title, title_ar, category, content, author, image_url, created_at FROM news";
            $params = [];
            $where = [];

            if (!empty($category) && $category !== 'All') {
                $where[] = "category = $" . (count($params) + 1);
                $params[] = $category;
            }

            if (!empty($search)) {
                $where[] = "(title ILIKE $" . (count($params) + 1) . " OR content ILIKE $" . (count($params) + 1) . ")";
                $params[] = '%' . $search . '%';
            }

            if (!empty($where)) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }
            $sql .= " ORDER BY id DESC LIMIT 50";

            $rows = $db->query($sql, $params);
            if (is_array($rows) && !isset($rows['error']) && count($rows) > 0) {
                $news = $rows;
            }
        } catch (\Throwable $e) {}
    } else {
        if (!empty($category) && $category !== 'All') {
            $news = array_values(array_filter($news, function($item) use ($category) {
                return ($item['category'] ?? '') === $category;
            }));
        }
        if (!empty($search)) {
            $s = strtolower($search);
            $news = array_values(array_filter($news, function($item) use ($s) {
                return (strpos(strtolower($item['title'] ?? ''), $s) !== false) ||
                       (strpos(strtolower($item['content'] ?? ''), $s) !== false);
            }));
        }
    }

    echo json_encode(['success' => true, 'news' => $news ?: []]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $title = trim($input['title'] ?? '');
    $title_ar = trim($input['title_ar'] ?? '');
    $category = trim($input['category'] ?? 'General');
    $content = trim($input['content'] ?? '');
    $author = trim($input['author'] ?? 'Arab Hausa Desk');
    $image_url = trim($input['image_url'] ?? '');
    $media_url = trim($input['media_url'] ?? '');

    if (empty($title) || empty($content)) {
        echo json_encode(['success' => false, 'message' => 'Title and content are required']);
        exit;
    }

    $newItem = [
        'id' => round(microtime(true) * 1000),
        'title' => $title,
        'title_ar' => $title_ar,
        'category' => $category,
        'content' => $content,
        'author' => $author,
        'image_url' => $image_url,
        'media_url' => $media_url,
        'created_at' => date('c')
    ];

    $items = getLocalNews($dataFile);
    // Deduplicate: replace any existing news with the same title
    $items = array_values(array_filter($items, function($item) use ($title) {
        return ($item['title'] ?? '') !== $title;
    }));
    array_unshift($items, $newItem);
    saveLocalNews($dataFile, $pubDataFile, $items);

    // Also synchronize to posts.json for universal posts API & news.html
    try {
        require_once __DIR__ . '/../config/database.php';
        if (function_exists('getLocalJsonStore') && function_exists('saveLocalJsonStore')) {
            $posts = getLocalJsonStore('posts.json');
            $postItem = [
                'id' => $newItem['id'],
                'title' => $newItem['title'],
                'content' => $newItem['content'],
                'category' => $newItem['category'],
                'photo' => $newItem['image_url'],
                'video' => (!empty($newItem['media_url']) && (strpos($newItem['media_url'], '.mp4') !== false || strpos($newItem['media_url'], 'video') !== false)) ? $newItem['media_url'] : null,
                'audio' => (!empty($newItem['media_url']) && (strpos($newItem['media_url'], '.mp3') !== false || strpos($newItem['media_url'], 'audio') !== false)) ? $newItem['media_url'] : null,
                'created_at' => $newItem['created_at']
            ];
            $posts = array_values(array_filter($posts, function($p) use ($title) {
                return ($p['title'] ?? '') !== $title;
            }));
            array_unshift($posts, $postItem);
            saveLocalJsonStore('posts.json', $posts);
        }
    } catch (\Throwable $e) {}

    // Broadcast live event so all public users see the news article immediately without refreshing
    try {
        require_once __DIR__ . '/../config/database.php';
        if (function_exists('recordSystemEvent')) {
            recordSystemEvent('post_published', $newItem);
        }
    } catch (\Throwable $e) {}

    // Also attempt Neon insert
    try {
        require_once __DIR__ . '/db.php';
        $db = getDB();
        $db->query("
            INSERT INTO news (title, title_ar, category, content, author, image_url)
            VALUES ($1, $2, $3, $4, $5, $6)
        ", [$title, $title_ar, $category, $content, $author, $image_url]);
    } catch (\Throwable $e) {}

    echo json_encode(['success' => true, 'message' => 'Article published successfully']);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id > 0) {
        $items = getLocalNews($dataFile);
        $items = array_values(array_filter($items, function($item) use ($id) {
            return (int)($item['id'] ?? 0) !== $id;
        }));
        saveLocalNews($dataFile, $pubDataFile, $items);

        // Also remove from posts.json
        try {
            require_once __DIR__ . '/../config/database.php';
            if (function_exists('getLocalJsonStore') && function_exists('saveLocalJsonStore')) {
                $posts = getLocalJsonStore('posts.json');
                $posts = array_values(array_filter($posts, function($p) use ($id) {
                    return (int)($p['id'] ?? 0) !== $id;
                }));
                saveLocalJsonStore('posts.json', $posts);
            }
        } catch (\Throwable $e) {}

        // Broadcast live delete event
        try {
            require_once __DIR__ . '/../config/database.php';
            if (function_exists('recordSystemEvent')) {
                recordSystemEvent('post_deleted', ['id' => $id]);
            }
        } catch (\Throwable $e) {}

        try {
            require_once __DIR__ . '/db.php';
            $db = getDB();
            $db->query("DELETE FROM news WHERE id = $1", [$id]);
        } catch (\Throwable $e) {}

        echo json_encode(['success' => true, 'message' => 'Article deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid article ID']);
    }
    exit;
}

echo json_encode(['error' => 'Method not allowed']);
