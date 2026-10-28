<?php
/**
 * Arab Hausa Radio TV - Web Gateway
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// API route routing
if (strpos($uri, '/api/') === 0) {
    $script = __DIR__ . '/api-php/' . basename($uri);
    if (file_exists($script)) {
        require $script;
        exit;
    }
}

// Admin route
if ($uri === '/admin' || $uri === '/admin.php') {
    require __DIR__ . '/public/admin.php';
    exit;
}

// Static public file routing
$filePath = __DIR__ . '/public' . $uri;
if ($uri !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimes = [
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'ico' => 'image/x-icon',
        'html' => 'text/html'
    ];
    if (isset($mimes[$ext])) {
        header("Content-Type: " . $mimes[$ext]);
    }
    readfile($filePath);
    exit;
}

// Serve homepage
require __DIR__ . '/public/index.html';
