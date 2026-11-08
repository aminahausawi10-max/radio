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
if ($routeParam === 'tiktok_verify' || (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'tiktok-developers-site-verification') !== false)) {
    header("Content-Type: text/plain; charset=utf-8");
    echo "tiktok-developers-site-verification=qEgYXTdgmLcgUcBJmUxAQb9P0PhErQWZ";
    exit;
}
if ($routeParam === 'uploads' || isset($_GET['file'])) {
    $file = basename($_GET['file'] ?? '');
    if (!empty($file) && $file !== 'uploads') {
        $candidates = [
            __DIR__ . '/../public/uploads/' . $file,
            sys_get_temp_dir() . '/arab_hausa_uploads/' . $file,
            sys_get_temp_dir() . '/arab_hausa_data/' . $file,
        ];
        foreach ($candidates as $c) {
            if (file_exists($c) && is_file($c)) {
                $ext = strtolower(pathinfo($c, PATHINFO_EXTENSION));
                $mimes = [
                    'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
                    'webp' => 'image/webp', 'gif' => 'image/gif', 'svg' => 'image/svg+xml',
                    'mp4' => 'video/mp4', 'webm' => 'video/webm', 'mp3' => 'audio/mpeg',
                    'wav' => 'audio/wav', 'ogg' => 'audio/ogg'
                ];
                $contentType = $mimes[$ext] ?? 'application/octet-stream';
                $fileSize = filesize($c);
                $start = 0;
                $end = $fileSize - 1;

                header("Content-Type: $contentType");
                header('Accept-Ranges: bytes');
                header('Cache-Control: public, max-age=86400, stale-while-revalidate=604800');
                header('X-Content-Type-Options: nosniff');

                if (isset($_SERVER['HTTP_RANGE'])) {
                    $range = $_SERVER['HTTP_RANGE'];
                    if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
                        $start = (int)$matches[1];
                        if (!empty($matches[2])) {
                            $end = (int)$matches[2];
                        }
                    }

                    if ($start > $end || $start >= $fileSize) {
                        http_response_code(416);
                        header("Content-Range: bytes */$fileSize");
                        exit;
                    }

                    $length = $end - $start + 1;
                    http_response_code(206);
                    header("Content-Range: bytes $start-$end/$fileSize");
                    header("Content-Length: " . $length);
                } else {
                    header("Content-Length: " . $fileSize);
                }

                while (ob_get_level()) {
                    @ob_end_clean();
                }

                $fp = @fopen($c, 'rb');
                if ($fp) {
                    fseek($fp, $start);
                    $bytesRemaining = $end - $start + 1;
                    $bufferSize = 64 * 1024;

                    while (!feof($fp) && $bytesRemaining > 0 && !connection_aborted()) {
                        $readBytes = min($bufferSize, $bytesRemaining);
                        $data = fread($fp, $readBytes);
                        echo $data;
                        @ob_flush();
                        @flush();
                        $bytesRemaining -= strlen($data);
                    }
                    fclose($fp);
                }
                exit;
            }
        }
    }
}

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
    } elseif ($requestUri === "/api/tiktok" || $requestUri === "/api/tiktok.php") {
        require __DIR__ . "/tiktok.php";
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
