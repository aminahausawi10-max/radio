<?php
/**
 * Arab Hausa Radio TV - Universal Database Bridge
 * Seamlessly interfaces with config/database.php PDO connection:
 * Supports MySQL (cPanel / DirectAdmin), PostgreSQL (Neon / Supabase), and SQLite Local Fallback.
 */

require_once __DIR__ . '/../config/database.php';

class StationDB {
    private static $instance = null;
    private $pdo = null;
    private $driver = 'sqlite';

    private function __construct() {
        global $pdo, $dbDriver;
        $this->pdo = $pdo;
        $this->driver = $dbDriver ?: 'sqlite';
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new StationDB();
        }
        return self::$instance;
    }

    public function getPdo() {
        return $this->pdo;
    }

    public function getDriver() {
        return $this->driver;
    }

    public function query($sql, $params = []) {
        if (!$this->pdo) {
            return [];
        }

        try {
            $formattedSql = $sql;
            $execParams = array_values($params);

            // Translate placeholders and operators for non-Postgres drivers
            if ($this->driver !== 'pgsql') {
                // ILIKE -> LIKE
                $formattedSql = str_ireplace(' ILIKE ', ' LIKE ', $formattedSql);

                // $1, $2 -> ?
                $formattedSql = preg_replace('/\$(\d+)/', '?', $formattedSql);
            }

            $stmt = $this->pdo->prepare($formattedSql);
            $stmt->execute($execParams);

            if (stripos(trim($formattedSql), 'SELECT') === 0 || stripos(trim($formattedSql), 'PRAGMA') === 0) {
                return $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            return ['rowCount' => $stmt->rowCount(), 'lastInsertId' => $this->pdo->lastInsertId()];
        } catch (\Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }
}

function getDB() {
    return StationDB::getInstance();
}
