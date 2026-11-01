<?php
/**
 * Arab Hausa Radio TV - Universal Database Bridge
 * Supports MySQL (cPanel / DirectAdmin), PostgreSQL (Neon / Supabase), and SQLite.
 */

class StationDB {
    private static $instance = null;
    private $pdo = null;
    private $driver = null;

    private function __construct() {
        $this->loadEnv();
        $this->initConnection();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new StationDB();
        }
        return self::$instance;
    }

    private function loadEnv() {
        $envPaths = [
            __DIR__ . '/../.env.local',
            __DIR__ . '/../.env'
        ];

        foreach ($envPaths as $path) {
            if (file_exists($path)) {
                $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
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

    private function initConnection() {
        // 1. Check for standard MySQL environment variables (cPanel / DirectAdmin)
        $mysqlHost = getenv('DB_HOST') ?: (getenv('MYSQL_HOST') ?: 'localhost');
        $mysqlDb   = getenv('DB_NAME') ?: getenv('MYSQL_DATABASE');
        $mysqlUser = getenv('DB_USER') ?: getenv('MYSQL_USER');
        $mysqlPass = getenv('DB_PASS') ?: (getenv('DB_PASSWORD') ?: getenv('MYSQL_PASSWORD'));

        if ($mysqlDb && $mysqlUser && extension_loaded('pdo_mysql')) {
            try {
                $dsn = "mysql:host={$mysqlHost};dbname={$mysqlDb};charset=utf8mb4";
                $this->pdo = new PDO($dsn, $mysqlUser, $mysqlPass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);
                $this->driver = 'mysql';
                $this->createTablesIfMissing();
                return;
            } catch (\Exception $e) {}
        }

        // 2. Check for DATABASE_URL (MySQL or Postgres)
        $dbUrl = getenv('DATABASE_URL_UNPOOLED') ?: getenv('DATABASE_URL');
        if ($dbUrl) {
            $parsed = parse_url($dbUrl);
            $scheme = strtolower($parsed['scheme'] ?? '');

            if (($scheme === 'postgres' || $scheme === 'postgresql') && extension_loaded('pdo_pgsql')) {
                try {
                    $dsn = sprintf(
                        "pgsql:host=%s;port=%d;dbname=%s;sslmode=require",
                        $parsed['host'],
                        $parsed['port'] ?? 5432,
                        ltrim($parsed['path'], '/')
                    );
                    $this->pdo = new PDO($dsn, $parsed['user'] ?? '', $parsed['pass'] ?? '', [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                    ]);
                    $this->driver = 'pgsql';
                    return;
                } catch (\Exception $e) {}
            } elseif (($scheme === 'mysql') && extension_loaded('pdo_mysql')) {
                try {
                    $dsn = sprintf(
                        "mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4",
                        $parsed['host'],
                        $parsed['port'] ?? 3306,
                        ltrim($parsed['path'], '/')
                    );
                    $this->pdo = new PDO($dsn, $parsed['user'] ?? '', $parsed['pass'] ?? '', [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                    ]);
                    $this->driver = 'mysql';
                    $this->createTablesIfMissing();
                    return;
                } catch (\Exception $e) {}
            }
        }
    }

    private function createTablesIfMissing() {
        if (!$this->pdo || $this->driver !== 'mysql') return;
        try {
            $this->pdo->exec("
                CREATE TABLE IF NOT EXISTS admin_users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(100) PRIMARY KEY,
                    setting_value TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS media (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    category VARCHAR(100),
                    url TEXT NOT NULL,
                    stream_url TEXT,
                    size VARCHAR(50),
                    poster_url TEXT,
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
            ");
        } catch (\Exception $e) {}
    }

    public function query($sql, $params = []) {
        if (!$this->pdo) {
            return [];
        }

        try {
            // Translate $1, $2 placeholders for MySQL if needed
            if ($this->driver === 'mysql') {
                $count = 0;
                $sql = preg_replace_callback('/\$(\d+)/', function($m) {
                    return '?';
                }, $sql);
            }

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(array_values($params));
            if (stripos(trim($sql), 'SELECT') === 0) {
                return $stmt->fetchAll();
            }
            return ['rowCount' => $stmt->rowCount()];
        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }
}

function getDB() {
    return StationDB::getInstance();
}
