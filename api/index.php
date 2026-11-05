<?php
/**
 * Arab Hausa RTV - Universal API Gateway & Router
 */
// Start session only if cookie present, and immediately close write lock to prevent blocking concurrent requests
if (isset($_COOKIE[session_name()])) {
    @session_start();
    @session_write_close();
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Password, Range");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

$routeParam = $_GET['route'] ?? null;
if ($routeParam) {
    $requestUri = '/api/' . ltrim($routeParam, '/');
} else {
    $requestUri = parse_url($_SERVER["REQUEST_URI"] ?? '', PHP_URL_PATH);
}
$requestUri = explode('?', $requestUri)[0];

if (strpos($requestUri, "/api/") === 0 || $requestUri === '/api') {
    if (rtrim($requestUri, '/') === '/api') {
        header("Content-Type: application/json");
        echo json_encode([
            "station" => "Arab Hausa RTV",
            "status" => "API is live",
            "time" => date('c')
        ]);
        exit;
    }
    
    if ($requestUri === "/api/posts" || $requestUri === "/api/posts.php") {
        require __DIR__ . "/posts.php";
    } elseif ($requestUri === "/api/media" || $requestUri === "/api/media.php") {
        require __DIR__ . "/media.php";
    } elseif ($requestUri === "/api/upload" || $requestUri === "/api/upload.php") {
        require __DIR__ . "/upload.php";
    } elseif ($requestUri === "/api/sign_upload" || $requestUri === "/api/sign_upload.php") {
        require __DIR__ . "/sign_upload.php";
    } elseif ($requestUri === "/api/events" || $requestUri === "/api/events.php") {
        require __DIR__ . "/events.php";
    } elseif ($requestUri === "/api/video-chunk" || $requestUri === "/api/video-chunk.php") {
        require __DIR__ . "/video-chunk.php";
    } elseif ($requestUri === "/api/video-stream" || $requestUri === "/api/video-stream.php") {
        require __DIR__ . "/video-stream.php";
    } elseif ($requestUri === "/api/news" || $requestUri === "/api/news.php") {
        require __DIR__ . "/news.php";
    } elseif ($requestUri === "/api/schedule" || $requestUri === "/api/schedule.php") {
        require __DIR__ . "/schedule.php";
    } elseif ($requestUri === "/api/settings" || $requestUri === "/api/settings.php") {
        require __DIR__ . "/../api-php/settings.php";
    } else {
        $clean = preg_replace('/\.php$/i', '', basename($requestUri));
        if (file_exists(__DIR__ . '/' . $clean . '.php')) {
            require __DIR__ . '/' . $clean . '.php';
        } elseif (file_exists(__DIR__ . '/../api-php/' . $clean . '.php')) {
            require __DIR__ . '/../api-php/' . $clean . '.php';
        } else {
            header("Content-Type: application/json");
            http_response_code(404);
            echo json_encode(["error" => "API endpoint not found: " . $requestUri]);
        }
    }
    exit;
}

header("Content-Type: application/json");
http_response_code(404);
echo json_encode(["error" => "Route not found"]);
