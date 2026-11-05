<?php
/**
 * Arab Hausa RTV - Cloudinary Upload Signature Generator
 */
header("Content-Type: application/json");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$cloudName = getenv('CLOUDINARY_CLOUD_NAME') ?: ($_ENV['CLOUDINARY_CLOUD_NAME'] ?? 'dpghoiocq');
$apiKey    = getenv('CLOUDINARY_API_KEY') ?: ($_ENV['CLOUDINARY_API_KEY'] ?? '748289518863837');
$apiSecret = getenv('CLOUDINARY_API_SECRET') ?: ($_ENV['CLOUDINARY_API_SECRET'] ?? 'lT5EDDnG5XWsuTPZxkHjSj97FF8');

$timestamp = time();
$paramsToSign = "timestamp=" . $timestamp;
$signature = sha1($paramsToSign . $apiSecret);

echo json_encode([
    "success"    => true,
    "cloud_name" => $cloudName,
    "api_key"    => $apiKey,
    "timestamp"  => $timestamp,
    "signature"  => $signature,
    "drivers"    => class_exists('PDO') ? PDO::getAvailableDrivers() : []
]);
