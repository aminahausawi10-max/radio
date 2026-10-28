<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $category = $_GET['category'] ?? '';
    $search = $_GET['search'] ?? '';

    $sql = "SELECT id, title, title_ar, category, content, author, created_at FROM news";
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

    $sql .= " ORDER BY id DESC LIMIT 20";

    $rows = $db->query($sql, $params);
    echo json_encode(['success' => true, 'news' => $rows ?: []]);
    exit;
}

if ($method === 'POST') {
    if (empty($_SESSION['admin_logged_in'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $title = trim($input['title'] ?? '');
    $title_ar = trim($input['title_ar'] ?? '');
    $category = trim($input['category'] ?? 'General');
    $content = trim($input['content'] ?? '');
    $author = trim($input['author'] ?? 'Arab Hausa Desk');

    if (empty($title) || empty($content)) {
        echo json_encode(['success' => false, 'message' => 'Title and content are required']);
        exit;
    }

    $db->query("
        INSERT INTO news (title, title_ar, category, content, author)
        VALUES ($1, $2, $3, $4, $5)
    ", [$title, $title_ar, $category, $content, $author]);

    echo json_encode(['success' => true, 'message' => 'Article published']);
    exit;
}

if ($method === 'DELETE') {
    if (empty($_SESSION['admin_logged_in'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    $id = intval($_GET['id'] ?? 0);
    if ($id > 0) {
        $db->query("DELETE FROM news WHERE id = $1", [$id]);
        echo json_encode(['success' => true, 'message' => 'Article deleted']);
        exit;
    }
    echo json_encode(['success' => false, 'message' => 'Invalid ID']);
    exit;
}
