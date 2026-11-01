<?php
/**
 * Arab Hausa Radio TV - Web Gateway for Apache & DirectAdmin
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. API route routing (handles /api/upload, /api/news, /api/settings, etc.)
if (strpos($uri, '/api/') === 0) {
    $cleanEndpoint = preg_replace('/\.php$/i', '', basename($uri));
    $script = __DIR__ . '/api-php/' . $cleanEndpoint . '.php';
    if (file_exists($script)) {
        require $script;
        exit;
    }
}

// 2. Admin portal routing
if ($uri === '/admin' || $uri === '/admin.php' || $uri === '/admin.html') {
    if (file_exists(__DIR__ . '/public/admin.html')) {
        require __DIR__ . '/public/admin.html';
        exit;
    }
    if (file_exists(__DIR__ . '/public/admin.php')) {
        require __DIR__ . '/public/admin.php';
        exit;
    }
}

// 3. Static public file routing
$filePath = __DIR__ . '/public' . $uri;
if ($uri !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mimes = [
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'json' => 'application/json',
        'svg'  => 'image/svg+xml',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
        'mp4'  => 'video/mp4',
        'mp3'  => 'audio/mpeg',
        'ico'  => 'image/x-icon',
        'html' => 'text/html'
    ];
    if (isset($mimes[$ext])) {
        header("Content-Type: " . $mimes[$ext]);
    }
    readfile($filePath);
    exit;
}

// 4. Default: Serve homepage
require __DIR__ . '/public/index.html';
