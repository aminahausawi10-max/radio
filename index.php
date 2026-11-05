<?php
/**
 * Arab Hausa Radio TV - Web Gateway for Apache & DirectAdmin
 */

@ini_set('upload_max_filesize', '2048M');
@ini_set('post_max_size', '2048M');
@ini_set('max_execution_time', '3600');
@ini_set('max_input_time', '3600');
@ini_set('memory_limit', '1024M');
@set_time_limit(3600);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. API route routing (handles /api/posts, /api/media, /api/upload, /api/events, /api/news, etc.)
if (strpos($uri, '/api') === 0) {
    if ($uri === '/api' || $uri === '/api/') {
        require __DIR__ . '/api/index.php';
        exit;
    }
    $cleanEndpoint = preg_replace('/\.php$/i', '', basename($uri));
    
    // Check api/ first (new Universal Architecture)
    $apiScript = __DIR__ . '/api/' . $cleanEndpoint . '.php';
    if (file_exists($apiScript)) {
        require $apiScript;
        exit;
    }
    
    // Check api-php/ (legacy endpoints)
    $legacyScript = __DIR__ . '/api-php/' . $cleanEndpoint . '.php';
    if (file_exists($legacyScript)) {
        require $legacyScript;
        exit;
    }
}

// 2. Admin & News portal routing
if ($uri === '/admin' || $uri === '/admin.php' || $uri === '/admin.html') {
    if (file_exists(__DIR__ . '/public/admin.php')) {
        require __DIR__ . '/public/admin.php';
        exit;
    }
    if (file_exists(__DIR__ . '/public/admin.html')) {
        require __DIR__ . '/public/admin.html';
        exit;
    }
}

if ($uri === '/news' || $uri === '/news.html') {
    if (file_exists(__DIR__ . '/public/news.html')) {
        require __DIR__ . '/public/news.html';
        exit;
    }
}

// 3. Static public file routing (with HTTP 206 Range Streaming for videos/audio)
$filePath = __DIR__ . '/public' . $uri;

// If /uploads/ requested, check if it's directly in /public/uploads/ or /tmp
if (strpos($uri, '/uploads/') === 0 && !file_exists($filePath)) {
    $alt = __DIR__ . '/public/uploads/' . basename($uri);
    if (file_exists($alt)) {
        $filePath = $alt;
    } else {
        $tmpAlt = sys_get_temp_dir() . '/arab_hausa_uploads/' . basename($uri);
        if (file_exists($tmpAlt)) {
            $filePath = $tmpAlt;
        }
    }
}

// If /data/ requested, check if it's in root /data/
if (strpos($uri, '/data/') === 0 && !file_exists($filePath)) {
    $altData = __DIR__ . $uri;
    if (file_exists($altData)) {
        $filePath = $altData;
    }
}

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
        'webm' => 'video/webm',
        'mov'  => 'video/quicktime',
        'mkv'  => 'video/x-matroska',
        'mp3'  => 'audio/mpeg',
        'wav'  => 'audio/wav',
        'm4a'  => 'audio/mp4',
        'ogg'  => 'audio/ogg',
        'oga'  => 'audio/ogg',
        'aac'  => 'audio/aac',
        'flac' => 'audio/flac',
        'ico'  => 'image/x-icon',
        'html' => 'text/html'
    ];

    // High performance byte-range media streamer for video and audio (prevents mobile playback crash)
    if (in_array($ext, ['mp4', 'webm', 'mov', 'mkv', 'mp3', 'm4a', 'wav', 'ogg', 'oga', 'aac', 'flac'])) {
        @set_time_limit(0);
        @ini_set('max_execution_time', '0');
        while (ob_get_level()) {
            ob_end_clean();
        }

        $fileSize = filesize($filePath);
        $start = 0;
        $end = $fileSize - 1;
        $mime = $mimes[$ext] ?? 'application/octet-stream';
        if ($ext === 'webm') {
            if (stripos($filePath, 'voice') !== false || stripos($filePath, 'audio') !== false) {
                $mime = 'audio/webm';
            } else {
                if (function_exists('finfo_open')) {
                    $finfo = @finfo_open(FILEINFO_MIME_TYPE);
                    $detected = $finfo ? @finfo_file($finfo, $filePath) : null;
                    if ($finfo) @finfo_close($finfo);
                    if ($detected && (strpos($detected, 'video/') === 0 || strpos($detected, 'audio/') === 0)) {
                        $mime = $detected;
                    }
                }
            }
        }

        header('Content-Type: ' . $mime);
        header('Accept-Ranges: bytes');
        header('Cache-Control: public, max-age=86400, stale-while-revalidate=604800');

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

        $fp = fopen($filePath, 'rb');
        if ($fp) {
            fseek($fp, $start);
            $bytesRemaining = $end - $start + 1;
            $bufferSize = 64 * 1024; // 64KB high-speed packet buffer

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

    if (isset($mimes[$ext])) {
        header("Content-Type: " . $mimes[$ext]);
    }
    if ($ext === 'json') {
        header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
        header("Pragma: no-cache");
        header("Expires: 0");
    }
    readfile($filePath);
    exit;
}

// 4. Default: Serve homepage
require __DIR__ . '/public/index.html';
