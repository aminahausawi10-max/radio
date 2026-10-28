<?php
/**
 * Arab Hausa Radio TV - Neon Postgres Database Bridge
 * Automatically loads .env or .env.local and executes queries via PDO PgSQL
 * or Neon's High-Performance HTTP SQL API over HTTPS.
 */

class NeonDB {
    private static $instance = null;
    private $dbUrl = null;
    private $pdo = null;
    private $host = null;
    private $useHttpApi = false;

    private function __construct() {
        $this->loadEnv();
        $this->initConnection();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new NeonDB();
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

        $this->dbUrl = getenv('DATABASE_URL_UNPOOLED') ?: getenv('DATABASE_URL');
        if (!$this->dbUrl && isset($_ENV['DATABASE_URL_UNPOOLED'])) {
            $this->dbUrl = $_ENV['DATABASE_URL_UNPOOLED'];
        } elseif (!$this->dbUrl && isset($_ENV['DATABASE_URL'])) {
            $this->dbUrl = $_ENV['DATABASE_URL'];
        }
    }

    private function initConnection() {
        if (!$this->dbUrl) {
            return;
        }

        $parsed = parse_url($this->dbUrl);
        $this->host = $parsed['host'] ?? null;

        // Check if PDO pgsql is available
        if (extension_loaded('pdo_pgsql')) {
            try {
                $dsn = sprintf(
                    "pgsql:host=%s;port=%d;dbname=%s;sslmode=require",
                    $parsed['host'],
                    $parsed['port'] ?? 5432,
                    ltrim($parsed['path'], '/')
                );
                $this->pdo = new PDO($dsn, $parsed['user'], $parsed['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);
                return;
            } catch (Exception $e) {
                // Fall back to Neon HTTP API
                $this->useHttpApi = true;
            }
        } else {
            $this->useHttpApi = true;
        }
    }

    public function query($sql, $params = []) {
        if (!$this->dbUrl) {
            return ['error' => 'DATABASE_URL not configured'];
        }

        if ($this->pdo) {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            if (stripos(trim($sql), 'SELECT') === 0) {
                return $stmt->fetchAll();
            }
            return ['rowCount' => $stmt->rowCount()];
        }

        // Neon HTTP SQL API
        return $this->queryHttpApi($sql, $params);
    }

    private function queryHttpApi($sql, $params = []) {
        if (!$this->host) {
            return ['error' => 'Invalid DB Host'];
        }

        // Replace $1, $2 placeholders with param values for Neon /sql or format query
        $formattedSql = $sql;
        if (!empty($params)) {
            foreach ($params as $idx => $param) {
                $placeholder = '$' . ($idx + 1);
                $escaped = "'" . addslashes((string)$param) . "'";
                $formattedSql = str_replace($placeholder, $escaped, $formattedSql);
            }
        }

        $url = "https://{$this->host}/sql";
        $payload = json_encode(['query' => $formattedSql]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Neon-Connection-String: {$this->dbUrl}",
            "Content-Type: application/json",
            "Content-Length: " . strlen($payload)
        ]);
        // Auto-configure SSL for environments without configured CA bundle (like Windows CLI)
        $caBundle = ini_get('curl.cainfo');
        if ($caBundle && file_exists($caBundle)) {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        } else {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        }
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            return ['error' => "Curl Error: $curlErr"];
        }

        $data = json_decode($response, true);
        if ($httpCode >= 200 && $httpCode < 300 && isset($data['rows'])) {
            return $data['rows'];
        }

        if (isset($data['command'])) {
            return ['rowCount' => $data['rowCount'] ?? 1];
        }

        return ['error' => $data['message'] ?? 'Database error', 'raw' => $response];
    }
}

function getDB() {
    return NeonDB::getInstance();
}
