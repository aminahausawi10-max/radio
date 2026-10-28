<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? $_POST['username'] ?? '');
    $password = trim($input['password'] ?? $_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Username and password required']);
        exit;
    }

    $hash = hash('sha256', $password);
    $db = getDB();
    $rows = $db->query("SELECT id, username, password_hash FROM admin_users WHERE username = $1 LIMIT 1", [$username]);

    if (!empty($rows) && !isset($rows['error'])) {
        $user = $rows[0];
        if (hash_equals($user['password_hash'], $hash)) {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_user'] = $user['username'];
            $_SESSION['admin_id'] = $user['id'];
            echo json_encode(['success' => true, 'message' => 'Logged in successfully', 'user' => $user['username']]);
            exit;
        }
    }

    echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
    exit;
}

if ($action === 'check') {
    $loggedIn = !empty($_SESSION['admin_logged_in']);
    echo json_encode(['authenticated' => $loggedIn, 'user' => $_SESSION['admin_user'] ?? null]);
    exit;
}

echo json_encode(['error' => 'Unknown action']);
