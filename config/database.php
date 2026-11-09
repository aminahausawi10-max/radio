<?php
/**
 * Arab Hausa RTV - Universal Database Engine
 * Dual-Mode Connection: MySQL (Hosting Provider), PostgreSQL (Neon), and SQLite Local Fallback
 */

// Load environment variables if not populated
if (!getenv('DATABASE_URL') && !isset($_ENV['DATABASE_URL'])) {
    $envFiles = [__DIR__ . '/../.env.local', __DIR__ . '/../.env'];
    foreach ($envFiles as $envFile) {
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($key, $val) = explode('=', $line, 2);
                    $key = trim($key);
                    $val = trim($val, " \t\n\r\0\x0B\"'");
                    if (!isset($_ENV[$key])) {
                        $_ENV[$key] = $val;
                        putenv("$key=$val");
                    }
                }
            }
        }
    }
}

$pdo = null;
$dbDriver = 'sqlite';
$lastDbError = null;
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::ATTR_TIMEOUT            => 7 // 7 seconds allows Neon cold-starts to wake up reliably
];

// Check Circuit Breaker for remote DB
$circuitBreakerFile = sys_get_temp_dir() . '/.station_db_fail';
$recentFailure = file_exists($circuitBreakerFile) && (time() - filemtime($circuitBreakerFile) < 60);

// 1. Try MySQL first if hosting provider environment variables are present (DirectAdmin / cPanel)
if (!$pdo && extension_loaded('pdo_mysql')) {
    $mysqlHost = getenv('DB_HOST') ?: (getenv('MYSQL_HOST') ?: '');
    $mysqlDb   = getenv('DB_NAME') ?: getenv('MYSQL_DATABASE');
    $mysqlUser = getenv('DB_USER') ?: getenv('MYSQL_USER');
    $mysqlPass = getenv('DB_PASS') ?: (getenv('DB_PASSWORD') ?: getenv('MYSQL_PASSWORD'));
    $mysqlPort = getenv('DB_PORT') ?: (getenv('MYSQL_PORT') ?: 3306);

    if ($mysqlDb && $mysqlUser) {
        try {
            $h = $mysqlHost ?: 'localhost';
            $dsn = "mysql:host=$h;port=$mysqlPort;dbname=$mysqlDb;charset=utf8mb4";
            $pdo = new PDO($dsn, $mysqlUser, $mysqlPass, $options);
            $dbDriver = 'mysql';
        } catch (\Throwable $e) {
            $pdo = null;
        }
    }
}

// 2. Try PostgreSQL / MySQL from DATABASE_URL if configured and not in recent circuit breaker
$defaultNeonUrl = 'postgresql://neondb_owner:npg_KabABmFgv8o5@ep-billowing-sound-b4grdojl-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
$dbUrl = getenv('DATABASE_URL_UNPOOLED') ?: (getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? $defaultNeonUrl));
if (!$pdo && $dbUrl && !$recentFailure) {
    $parsedUrl = parse_url($dbUrl);
    $scheme = strtolower($parsedUrl['scheme'] ?? '');

    if (($scheme === 'postgres' || $scheme === 'postgresql') && extension_loaded('pdo_pgsql')) {
        try {
            $host = $parsedUrl['host'] ?? 'localhost';
            $port = $parsedUrl['port'] ?? 5432;
            $user = $parsedUrl['user'] ?? '';
            $pass = $parsedUrl['pass'] ?? '';
            $db   = ltrim($parsedUrl['path'] ?? '', '/');
            $dsn  = "pgsql:host=$host;port=$port;dbname=$db;sslmode=require;connect_timeout=6";
            
            $pdo = new PDO($dsn, $user, $pass, $options);
            $dbDriver = 'pgsql';
            if (file_exists($circuitBreakerFile)) @unlink($circuitBreakerFile);
        } catch (\Throwable $e) {
            $lastDbError = "PGSQL (" . $e->getCode() . "): " . $e->getMessage();
            @file_put_contents($circuitBreakerFile, time());
            $pdo = null;
        }
    } elseif ($scheme === 'mysql' && extension_loaded('pdo_mysql')) {
        try {
            $host = $parsedUrl['host'] ?? 'localhost';
            $port = $parsedUrl['port'] ?? 3306;
            $user = $parsedUrl['user'] ?? '';
            $pass = $parsedUrl['pass'] ?? '';
            $db   = ltrim($parsedUrl['path'] ?? '', '/');
            $dsn  = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
            $pdo = new PDO($dsn, $user, $pass, $options);
            $dbDriver = 'mysql';
        } catch (\Throwable $e) {
            $pdo = null;
        }
    }
}

// 3. Fallback to SQLite (Immediate 0ms local ACID database, permanent on disk)
if (!$pdo && extension_loaded('pdo_sqlite')) {
    try {
        $sqliteDir = sys_get_temp_dir() . '/arab_hausa_data';
        if (!is_dir($sqliteDir)) @mkdir($sqliteDir, 0777, true);
        $sqlitePath = $sqliteDir . '/station.db';
        $pdo = new PDO("sqlite:$sqlitePath", null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        $dbDriver = 'sqlite';
    } catch (\Throwable $e) {
        $pdo = null;
    }
}

// Ensure database tables exist automatically across all supported drivers
if ($pdo) {
    try {
        if ($dbDriver === 'sqlite') {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    category VARCHAR(100) DEFAULT 'Official Update',
                    photo TEXT NULL,
                    video TEXT NULL,
                    audio TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(255) NOT NULL,
                    media_type VARCHAR(50) NOT NULL DEFAULT 'Photo',
                    url TEXT NOT NULL,
                    caption TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type VARCHAR(50) NOT NULL DEFAULT 'photo',
                    name VARCHAR(255) NOT NULL,
                    category VARCHAR(100) DEFAULT 'TV Broadcast',
                    url TEXT NOT NULL,
                    stream_url TEXT NULL,
                    poster_url TEXT NULL,
                    size VARCHAR(50) DEFAULT 'HD Media',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type VARCHAR(50) NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS news (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(255) NOT NULL,
                    title_ar VARCHAR(255),
                    category VARCHAR(100),
                    content TEXT NOT NULL,
                    author VARCHAR(100),
                    image_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(255) NOT NULL,
                    host VARCHAR(100),
                    time_slot VARCHAR(100) NOT NULL,
                    broadcast_type VARCHAR(50),
                    description TEXT,
                    is_live INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
                CREATE INDEX IF NOT EXISTS idx_media_id ON media(id);
                CREATE INDEX IF NOT EXISTS idx_media_items_id ON media_items(id);
                CREATE INDEX IF NOT EXISTS idx_events_id ON media_events(id);
            ");
            try { $pdo->exec("ALTER TABLE media ADD COLUMN duration REAL NULL"); } catch (\Throwable $e) {}
        } elseif ($dbDriver === 'mysql') {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS posts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    category VARCHAR(100) DEFAULT 'Official Update',
                    photo TEXT NULL,
                    video TEXT NULL,
                    audio TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    media_type VARCHAR(50) NOT NULL DEFAULT 'Photo',
                    url TEXT NOT NULL,
                    caption TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    type VARCHAR(50) NOT NULL DEFAULT 'photo',
                    name VARCHAR(255) NOT NULL,
                    category VARCHAR(100) DEFAULT 'TV Broadcast',
                    url TEXT NOT NULL,
                    stream_url TEXT NULL,
                    poster_url TEXT NULL,
                    size VARCHAR(50) DEFAULT 'HD Media',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media_events (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    event_type VARCHAR(50) NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS news (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    title_ar VARCHAR(255),
                    category VARCHAR(100),
                    content TEXT NOT NULL,
                    author VARCHAR(100),
                    image_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS schedules (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    host VARCHAR(100),
                    time_slot VARCHAR(100) NOT NULL,
                    broadcast_type VARCHAR(50),
                    description TEXT,
                    is_live TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            ");
        } else {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS posts (
                    id SERIAL PRIMARY KEY,
                    user_id INT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    category VARCHAR(100) DEFAULT 'Official Update',
                    photo TEXT NULL,
                    video TEXT NULL,
                    audio TEXT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media_items (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    media_type VARCHAR(50) NOT NULL DEFAULT 'Photo',
                    url TEXT NOT NULL,
                    caption TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media (
                    id BIGSERIAL PRIMARY KEY,
                    type VARCHAR(50) NOT NULL DEFAULT 'photo',
                    name VARCHAR(255) NOT NULL,
                    category VARCHAR(100) DEFAULT 'TV Broadcast',
                    url TEXT NOT NULL,
                    stream_url TEXT NULL,
                    poster_url TEXT NULL,
                    size VARCHAR(50) DEFAULT 'HD Media',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media_events (
                    id BIGSERIAL PRIMARY KEY,
                    event_type VARCHAR(50) NOT NULL,
                    payload TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS news (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    title_ar VARCHAR(255),
                    category VARCHAR(100),
                    content TEXT NOT NULL,
                    author VARCHAR(100),
                    image_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS schedules (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    host VARCHAR(100),
                    time_slot VARCHAR(100) NOT NULL,
                    broadcast_type VARCHAR(50),
                    description TEXT,
                    is_live INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            ");
        }
        try { $pdo->exec("ALTER TABLE media ADD COLUMN duration REAL NULL"); } catch (\Throwable $e) {}
    } catch (\Throwable $e) {}
}

// Universal Persistence Helper: Save and read JSON backups
function getLocalJsonStore($filename) {
    $tmpPath = sys_get_temp_dir() . '/arab_hausa_data/' . $filename;
    if (file_exists($tmpPath)) {
        $c = @file_get_contents($tmpPath);
        $j = json_decode($c, true);
        if (is_array($j) && !empty($j)) return $j;
    }
    $path = __DIR__ . '/../data/' . $filename;
    if (file_exists($path)) {
        $c = @file_get_contents($path);
        $j = json_decode($c, true);
        if (is_array($j) && !empty($j)) return $j;
    }
    $pubPath = __DIR__ . '/../public/data/' . $filename;
    if (file_exists($pubPath)) {
        $c = @file_get_contents($pubPath);
        $j = json_decode($c, true);
        if (is_array($j) && !empty($j)) return $j;
    }
    return [];
}

function saveLocalJsonStore($filename, $items) {
    $json = json_encode(array_values($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $tmpDir = sys_get_temp_dir() . '/arab_hausa_data';
    if (!is_dir($tmpDir)) @mkdir($tmpDir, 0777, true);
    @file_put_contents($tmpDir . '/' . $filename, $json);

    $dir = __DIR__ . '/../data';
    if (@is_dir($dir) || @mkdir($dir, 0777, true)) {
        @file_put_contents($dir . '/' . $filename, $json);
    }
    $pubDir = __DIR__ . '/../public/data';
    if (@is_dir($pubDir) || @mkdir($pubDir, 0777, true)) {
        @file_put_contents($pubDir . '/' . $filename, $json);
    }
}

// Real-Time Event Broadcaster
function recordSystemEvent($eventType, $data) {
    global $pdo;
    $event = [
        'id' => round(microtime(true) * 1000),
        'type' => $eventType,
        'data' => $data,
        'timestamp' => time()
    ];

    $events = getLocalJsonStore('events.json');
    array_unshift($events, $event);
    if (count($events) > 60) $events = array_slice($events, 0, 60);
    saveLocalJsonStore('events.json', $events);

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("INSERT INTO media_events (event_type, payload) VALUES (?, ?)");
            $stmt->execute([$eventType, json_encode($data, JSON_UNESCAPED_SLASHES)]);
        } catch (\Throwable $e) {}
    }
}

// Cloudinary Permanent Asset Deletion Helper
function deleteFromCloudinaryIfPresent($url) {
    if (empty($url) || strpos($url, 'res.cloudinary.com') === false) return false;
    
    $cloudName = getenv('CLOUDINARY_CLOUD_NAME') ?: ($_ENV['CLOUDINARY_CLOUD_NAME'] ?? 'dpghoiocq');
    $apiKey    = getenv('CLOUDINARY_API_KEY') ?: ($_ENV['CLOUDINARY_API_KEY'] ?? '748289518863837');
    $apiSecret = getenv('CLOUDINARY_API_SECRET') ?: ($_ENV['CLOUDINARY_API_SECRET'] ?? 'lT5EDDnG5XWsuTPZxkHjSj97FF8');
    
    $resourceType = (strpos($url, '/video/') !== false) ? 'video' : ((strpos($url, '/raw/') !== false) ? 'raw' : 'image');
    
    if (preg_match('/\/upload\/(?:v\d+\/)?([^\.\?#]+)/', $url, $matches)) {
        $publicId = $matches[1];
        $timestamp = time();
        $paramsToSign = "public_id=" . $publicId . "&timestamp=" . $timestamp;
        $signature = sha1($paramsToSign . $apiSecret);
        
        $postData = http_build_query([
            'public_id' => $publicId,
            'timestamp' => $timestamp,
            'api_key'   => $apiKey,
            'signature' => $signature
        ]);
        
        $endpoint = "https://api.cloudinary.com/v1_1/{$cloudName}/{$resourceType}/destroy";
        
        $opts = [
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content' => $postData,
                'timeout' => 4
            ]
        ];
        $context = stream_context_create($opts);
        @file_get_contents($endpoint, false, $context);
        return true;
    }
    return false;
}
