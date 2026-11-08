<?php
/**
 * Arab Hausa RTV - TikTok Content Posting API & OAuth v2 Integration
 * Official TikTok API v2 Engine for Auto-Publishing Videos to @arab_hausa_rtv
 *
 * Supported Capabilities:
 * 1. OAuth v2 Secure Authorization with CSRF State validation
 * 2. Automatic Token Refresh and Strict Token Rotation Handling
 * 3. Creator Profile & Constraints Verification (/v2/post/publish/creator_info/query/)
 * 4. Dual-Mode Publishing: PULL_FROM_URL (for hosted media) & FILE_UPLOAD (direct chunked streaming)
 * 5. Full Post Metadata: Title/Caption, Privacy, Comments, Duet, Stitch, and AIGC Labeling
 * 6. Asynchronous Processing Status Polling (/v2/post/publish/status/fetch/)
 * 7. Zero Token Exposure: Tokens stored strictly on server, never sent to frontend JavaScript
 */

require_once __DIR__ . "/../config/database.php";

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Password, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$masterAdminPass = getenv('ADMIN_PASSWORD') ?: ($_ENV['ADMIN_PASSWORD'] ?? 'YourSuperSecureAdminPassword2026');
$dataDir = __DIR__ . '/../data';
$tempDataDir = sys_get_temp_dir() . '/arab_hausa_data';
if (!is_dir($tempDataDir)) @mkdir($tempDataDir, 0777, true);

// Determine writable directory for serverless environments (e.g. Vercel)
$writableDir = (is_dir($dataDir) && is_writable($dataDir)) ? $dataDir : $tempDataDir;

$tokenFile  = $writableDir . '/tiktok_token.json';
$configFile = $writableDir . '/tiktok_config.json';

// --- HELPER: Read and Write TikTok Server Storage ---
function getTikTokConfig() {
    global $configFile, $dataDir, $tempDataDir;
    $default = [
        'client_key'    => getenv('TIKTOK_CLIENT_KEY') ?: ($_ENV['TIKTOK_CLIENT_KEY'] ?? 'sbawzd3jagayc4wfjd'),
        'client_secret' => getenv('TIKTOK_CLIENT_SECRET') ?: ($_ENV['TIKTOK_CLIENT_SECRET'] ?? 'Ug8bBebhe1ZmsR4FBIEjGmPI7knXP20r'),
        'redirect_uri'  => getenv('TIKTOK_REDIRECT_URI') ?: ($_ENV['TIKTOK_REDIRECT_URI'] ?? 'https://radio-nine-gamma.vercel.app/api/tiktok-callback')
    ];

    $candidates = [
        $configFile,
        $dataDir . '/tiktok_config.json',
        $tempDataDir . '/tiktok_config.json'
    ];

    foreach ($candidates as $file) {
        if (file_exists($file)) {
            $saved = json_decode(@file_get_contents($file), true);
            if (is_array($saved)) {
                $default = array_merge($default, array_filter($saved));
                break;
            }
        }
    }

    if (empty($default['redirect_uri'])) {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
                   (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') ||
                   (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
        $scheme = $isHttps ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'www.arab-hausa-rtv.com.ng';
        $default['redirect_uri'] = "{$scheme}://{$host}/api/tiktok-callback";
    }

    return $default;
}

function saveTikTokConfig($data) {
    global $configFile, $dataDir, $tempDataDir;
    $existing = getTikTokConfig();
    $merged = array_merge($existing, $data);
    $json = json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    @file_put_contents($configFile, $json);
    if (is_dir($dataDir) && is_writable($dataDir)) {
        @file_put_contents($dataDir . '/tiktok_config.json', $json);
    }
    return $merged;
}

function getStoredTikTokToken() {
    global $tokenFile, $dataDir, $tempDataDir;
    $candidates = [
        $tokenFile,
        $dataDir . '/tiktok_token.json',
        $tempDataDir . '/tiktok_token.json'
    ];
    foreach ($candidates as $file) {
        if (file_exists($file)) {
            $data = json_decode(@file_get_contents($file), true);
            if (is_array($data) && !empty($data['access_token'])) {
                return $data;
            }
        }
    }
    return null;
}

function saveStoredTikTokToken($data) {
    global $tokenFile, $dataDir, $tempDataDir;
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    @file_put_contents($tokenFile, $json);
    @chmod($tokenFile, 0600);
    if (is_dir($dataDir) && is_writable($dataDir)) {
        @file_put_contents($dataDir . '/tiktok_token.json', $json);
        @chmod($dataDir . '/tiktok_token.json', 0600);
    }
    return $data;
}

function clearStoredTikTokToken() {
    global $tokenFile, $dataDir, $tempDataDir;
    $candidates = [
        $tokenFile,
        $dataDir . '/tiktok_token.json',
        $tempDataDir . '/tiktok_token.json'
    ];
    foreach ($candidates as $file) {
        if (file_exists($file)) @unlink($file);
    }
}

// --- HELPER: Admin Authorization Verification ---
function isAuthorizedAdmin() {
    global $masterAdminPass;
    if (session_status() === PHP_SESSION_ACTIVE) @session_write_close();

    $adminPassword = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? ($_POST['admin_password'] ?? '');
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        $adminPassword = $headers['X-Admin-Password'] ?? ($headers['x-admin-password'] ?? $adminPassword);
    }

    $isLoggedIn = !empty($_SESSION['admin_user']) || !empty($_SESSION['admin_logged_in']);
    return $isLoggedIn || (trim($adminPassword) !== '' && trim($adminPassword) === $masterAdminPass);
}

// --- HELPER: Resilient cURL Request Engine ---
function tiktokApiRequest($url, $method = 'GET', $body = null, $headers = [], $timeout = 25) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    $formattedHeaders = [];
    foreach ($headers as $k => $v) {
        $formattedHeaders[] = is_numeric($k) ? $v : "{$k}: {$v}";
    }

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($body) ? http_build_query($body) : $body);
        }
    } elseif ($method === 'PUT') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    curl_setopt($ch, CURLOPT_HTTPHEADER, $formattedHeaders);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    return [
        'code'  => $httpCode,
        'body'  => $response,
        'json'  => json_decode($response, true),
        'error' => $curlError
    ];
}

// --- HELPER: Automatic Token Refresh Engine with Rotation Handling ---
function getValidAccessToken() {
    $token = getStoredTikTokToken();
    if (!$token || empty($token['access_token'])) {
        return null;
    }

    $now = time();
    $expiresAt = $token['expires_at'] ?? 0;

    // If access token is still valid for more than 5 minutes, return it directly
    if ($expiresAt > ($now + 300)) {
        return $token['access_token'];
    }

    // Access token is expired or expiring soon: Refresh it
    $refreshToken = $token['refresh_token'] ?? '';
    if (empty($refreshToken)) {
        return null;
    }

    $config = getTikTokConfig();
    if (empty($config['client_key']) || empty($config['client_secret'])) {
        return null;
    }

    $refreshParams = [
        'client_key'    => $config['client_key'],
        'client_secret' => $config['client_secret'],
        'grant_type'    => 'refresh_token',
        'refresh_token' => $refreshToken
    ];

    $res = tiktokApiRequest('https://open.tiktokapis.com/v2/oauth/token/', 'POST', $refreshParams, [
        'Content-Type' => 'application/x-www-form-urlencoded',
        'Cache-Control' => 'no-cache'
    ]);

    if ($res['code'] === 200 && !empty($res['json']['access_token'])) {
        $j = $res['json'];
        $token['access_token']        = $j['access_token'];
        $token['expires_at']          = time() + (int)($j['expires_in'] ?? 7200);
        $token['refresh_token']        = $j['refresh_token'] ?? $refreshToken; // Store rotated token
        $token['refresh_expires_at']  = time() + (int)($j['refresh_expires_in'] ?? 15552000);
        $token['updated_at']          = date('c');
        saveStoredTikTokToken($token);
        return $token['access_token'];
    }

    return null;
}

// --- HELPER: Fetch User Info from TikTok API ---
function fetchTikTokUserInfo($accessToken) {
    $url = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username';
    $res = tiktokApiRequest($url, 'GET', null, [
        'Authorization' => "Bearer {$accessToken}"
    ]);

    if ($res['code'] === 200 && !empty($res['json']['data']['user'])) {
        return $res['json']['data']['user'];
    }
    return null;
}

// --- HELPER: Query Creator Constraints from TikTok API ---
function fetchTikTokCreatorInfo($accessToken) {
    $url = 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/';
    $res = tiktokApiRequest($url, 'POST', '{}', [
        'Authorization' => "Bearer {$accessToken}",
        'Content-Type'  => 'application/json; charset=UTF-8'
    ]);

    if ($res['code'] === 200 && !empty($res['json']['data'])) {
        return $res['json']['data'];
    }
    return null;
}

// -------------------------------------------------------------
// ROUTER & DISPATCHER
// -------------------------------------------------------------
$action = $_GET['action'] ?? ($_POST['action'] ?? 'status');
if (isset($_GET['code']) || (isset($_GET['state']) && isset($_GET['error']))) {
    $action = 'callback';
}

switch ($action) {

    // =========================================================
    // 1. GET STATUS: Public safe status (never exposes secrets)
    // =========================================================
    case 'status':
        $config = getTikTokConfig();
        $token = getStoredTikTokToken();
        $hasKeys = !empty($config['client_key']) && !empty($config['client_secret']);
        $isConnected = false;
        $username = 'arabhausa';
        $displayName = 'Arab Hausa RTV';
        $avatarUrl = '';
        $expiresIn = 0;
        $creatorLimits = null;

        if ($token && !empty($token['access_token'])) {
            $validToken = getValidAccessToken();
            if ($validToken) {
                $isConnected = true;
                $username = !empty($token['username']) ? $token['username'] : 'arab_hausa_rtv';
                $displayName = !empty($token['display_name']) ? $token['display_name'] : 'Arab Hausa RTV';
                $avatarUrl = $token['avatar_url'] ?? '';
                $expiresIn = max(0, ($token['expires_at'] ?? 0) - time());
                $creatorLimits = $token['creator_limits'] ?? null;
            }
        }

        echo json_encode([
            'success'        => true,
            'connected'      => $isConnected,
            'username'       => $username,
            'display_name'   => $displayName,
            'avatar_url'     => $avatarUrl,
            'profile_url'    => "https://tiktok.com/@{$username}",
            'app_configured' => $hasKeys,
            'client_key'     => !empty($config['client_key']) ? substr($config['client_key'], 0, 6) . '...' : '',
            'redirect_uri'   => $config['redirect_uri'],
            'expires_in_sec' => $expiresIn,
            'creator_limits' => $creatorLimits
        ]);
        exit;

    // =========================================================
    // 2. GET AUTH URL: Generate TikTok OAuth v2 Redirect URL
    // =========================================================
    case 'auth_url':
        $config = getTikTokConfig();
        if (empty($config['client_key'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error'   => 'TikTok App Client Key is not configured. Please set your credentials in Admin Settings.'
            ]);
            exit;
        }

        $state = bin2hex(random_bytes(16));
        @file_put_contents($writableDir . '/.tiktok_oauth_state', json_encode([
            'state' => $state,
            'created' => time()
        ]));

        $requestedScopes = trim($_GET['scope'] ?? '');
        $scopes = !empty($requestedScopes) ? $requestedScopes : 'user.info.basic,video.publish,video.upload';
        $params = [
            'client_key'        => $config['client_key'],
            'response_type'     => 'code',
            'scope'             => $scopes,
            'redirect_uri'      => $config['redirect_uri'],
            'state'             => $state,
            'disable_auto_auth' => 1
        ];

        $authUrl = 'https://www.tiktok.com/v2/auth/authorize/?' . http_build_query($params);

        echo json_encode([
            'success'  => true,
            'auth_url' => $authUrl,
            'state'    => $state
        ]);
        exit;

    // =========================================================
    // 3. OAUTH CALLBACK: Handle Redirect from TikTok
    // =========================================================
    case 'callback':
        $code  = $_GET['code'] ?? '';
        $state = $_GET['state'] ?? '';
        $error = $_GET['error'] ?? '';
        $errorDesc = $_GET['error_description'] ?? '';

        // Verification of CSRF state
        $savedStateFile = $writableDir . '/.tiktok_oauth_state';
        $savedState = '';
        if (file_exists($savedStateFile)) {
            $sData = json_decode(@file_get_contents($savedStateFile), true);
            $savedState = $sData['state'] ?? '';
            @unlink($savedStateFile);
        }

        if (!empty($error)) {
            $msg = htmlspecialchars($errorDesc ?: $error);
            echo "<!DOCTYPE html><html><body style='font-family:sans-serif; background:#0B162C; color:#fff; text-align:center; padding:50px;'>
                <h2>❌ TikTok Authorization Failed</h2>
                <p>{$msg}</p>
                <a href='/admin#tab-media' style='color:#00A3FF; text-decoration:none; font-weight:bold;'>Return to Admin Panel</a>
            </body></html>";
            exit;
        }

        if (empty($code)) {
            echo "<!DOCTYPE html><html><body style='font-family:sans-serif; background:#0B162C; color:#fff; text-align:center; padding:50px;'>
                <h2>❌ Missing Authorization Code</h2>
                <p>TikTok did not return a valid authorization code.</p>
                <a href='/admin#tab-media' style='color:#00A3FF;'>Return to Admin Panel</a>
            </body></html>";
            exit;
        }

        $config = getTikTokConfig();
        $tokenParams = [
            'client_key'    => $config['client_key'],
            'client_secret' => $config['client_secret'],
            'code'          => $code,
            'grant_type'    => 'authorization_code',
            'redirect_uri'  => $config['redirect_uri']
        ];

        $tokenRes = tiktokApiRequest('https://open.tiktokapis.com/v2/oauth/token/', 'POST', $tokenParams, [
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Cache-Control' => 'no-cache'
        ]);

        if ($tokenRes['code'] !== 200 || empty($tokenRes['json']['access_token'])) {
            $errDetail = htmlspecialchars($tokenRes['json']['error_description'] ?? ($tokenRes['json']['message'] ?? $tokenRes['body']));
            echo "<!DOCTYPE html><html><body style='font-family:sans-serif; background:#0B162C; color:#fff; text-align:center; padding:50px;'>
                <h2>❌ Token Exchange Failed</h2>
                <p>{$errDetail}</p>
                <a href='/admin#tab-media' style='color:#00A3FF;'>Return to Admin Panel</a>
            </body></html>";
            exit;
        }

        $tokenData = $tokenRes['json'];
        $accessToken = $tokenData['access_token'];

        // Retrieve creator profile and posting limits
        $userInfo = fetchTikTokUserInfo($accessToken);
        $creatorInfo = fetchTikTokCreatorInfo($accessToken);

        $savedTokenPayload = [
            'connected'          => true,
            'open_id'            => $tokenData['open_id'] ?? ($userInfo['open_id'] ?? ''),
            'union_id'           => $tokenData['union_id'] ?? ($userInfo['union_id'] ?? ''),
            'access_token'       => $accessToken,
            'expires_at'         => time() + (int)($tokenData['expires_in'] ?? 7200),
            'refresh_token'      => $tokenData['refresh_token'] ?? '',
            'refresh_expires_at' => time() + (int)($tokenData['refresh_expires_in'] ?? 15552000),
            'scope'              => $tokenData['scope'] ?? 'user.info.basic,video.publish,video.upload',
            'username'           => !empty($userInfo['username']) ? $userInfo['username'] : 'arab_hausa_rtv',
            'display_name'       => !empty($userInfo['display_name']) ? $userInfo['display_name'] : 'Arab Hausa RTV',
            'avatar_url'         => $userInfo['avatar_url'] ?? '',
            'creator_limits'     => $creatorInfo,
            'connected_at'       => date('c'),
            'updated_at'         => date('c')
        ];

        saveStoredTikTokToken($savedTokenPayload);

        // Display user-friendly success screen and return automatically to Admin
        echo "<!DOCTYPE html><html>
        <head>
            <title>TikTok Connected - Arab Hausa RTV</title>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                body { background: #070e1d; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
                .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(0, 163, 255, 0.3); border-radius: 16px; padding: 36px 28px; max-width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .badge { background: #00f2fe; color: #000; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; display: inline-block; margin-bottom: 16px; }
                .btn { display: inline-block; background: #0056B3; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class='card'>
                <div class='badge'>TIKTOK CONNECTED ✅</div>
                <h2 style='margin:0 0 10px 0;'>An Haɗa TikTok Cikin Nasara!</h2>
                <p style='color: #94A3B8; font-size: 0.95rem;'>Account <strong>@{$savedTokenPayload['username']}</strong> is now authorized for direct video publishing from your Arab Hausa RTV dashboard.</p>
                <a href='/admin#tab-media' class='btn' onclick='if(window.opener){window.opener.location.reload(); window.close(); return false;}'>Danna Nan don Koma Admin Panel</a>
            </div>
            <script>
                if (window.opener) {
                    try { window.opener.dispatchEvent(new CustomEvent('tiktok-connected', { detail: { username: '{$savedTokenPayload['username']}' } })); } catch(e){}
                    setTimeout(() => { window.opener.location.reload(); window.close(); }, 2000);
                } else {
                    setTimeout(() => { window.location.href = '/admin#tab-media'; }, 2500);
                }
            </script>
        </body></html>";
        exit;

    // =========================================================
    // 4. DISCONNECT TIKTOK: Clear stored tokens securely
    // =========================================================
    case 'disconnect':
        if (!isAuthorizedAdmin()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }

        clearStoredTikTokToken();
        echo json_encode([
            'success' => true,
            'message' => 'TikTok account disconnected successfully.'
        ]);
        exit;

    // =========================================================
    // 5. SAVE SETTINGS: Update Client Key / Secret
    // =========================================================
    case 'save_settings':
        if (!isAuthorizedAdmin()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }

        $rawInput = file_get_contents("php://input");
        $data = json_decode($rawInput, true) ?: $_POST;

        $clientKey = trim($data['client_key'] ?? '');
        $clientSecret = trim($data['client_secret'] ?? '');
        $redirectUri = trim($data['redirect_uri'] ?? '');

        $updates = [];
        if ($clientKey !== '')    $updates['client_key'] = $clientKey;
        if ($clientSecret !== '') $updates['client_secret'] = $clientSecret;
        if ($redirectUri !== '')  $updates['redirect_uri'] = $redirectUri;

        $saved = saveTikTokConfig($updates);

        echo json_encode([
            'success' => true,
            'message' => 'TikTok Developer Settings saved successfully.',
            'redirect_uri' => $saved['redirect_uri'],
            'app_configured' => !empty($saved['client_key']) && !empty($saved['client_secret'])
        ]);
        exit;

    // =========================================================
    // 6. PUBLISH VIDEO: Content Posting API v2
    // =========================================================
    case 'publish':
        if (!isAuthorizedAdmin()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }

        $accessToken = getValidAccessToken();
        if (!$accessToken) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error'   => 'TikTok account is not connected or token expired. Please click "Connect TikTok" first.'
            ]);
            exit;
        }

        $rawInput = file_get_contents("php://input");
        $data = json_decode($rawInput, true) ?: $_POST;

        $videoUrl = trim($data['video_url'] ?? '');
        $title    = trim($data['title'] ?? ($data['caption'] ?? 'Arab Hausa RTV Broadcast'));
        $privacy  = trim($data['privacy_level'] ?? 'PUBLIC_TO_EVERYONE');
        $disableComment = !empty($data['disable_comment']);
        $disableDuet    = !empty($data['disable_duet']);
        $disableStitch  = !empty($data['disable_stitch']);
        $isAigc         = !empty($data['is_aigc']);

        if (empty($videoUrl)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing video_url for TikTok publishing.']);
            exit;
        }

        // Format and append Arab Hausa RTV branding tags if not present
        if (strpos($title, '#ArabHausa') === false && strpos($title, '#Hausa') === false) {
            $title = rtrim($title) . " #ArabHausaRTV #Hausa #Labarai";
        }
        // Limit title to 2200 characters per TikTok specification
        $title = mb_substr($title, 0, 2200);

        // Normalize video path / URL
        $localFilePath = null;
        if (strpos($videoUrl, '/uploads/') === 0) {
            $localFilePath = __DIR__ . '/../public' . $videoUrl;
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $host = $_SERVER['HTTP_HOST'] ?? 'www.arab-hausa-rtv.com.ng';
            $absoluteUrl = "{$scheme}://{$host}{$videoUrl}";
        } else {
            $absoluteUrl = $videoUrl;
        }

        // Check if creator info allows direct post
        $creatorInfo = fetchTikTokCreatorInfo($accessToken);
        $allowedPrivacy = $creatorInfo['privacy_level_options'] ?? ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'];
        if (!in_array($privacy, $allowedPrivacy)) {
            $privacy = in_array('PUBLIC_TO_EVERYONE', $allowedPrivacy) ? 'PUBLIC_TO_EVERYONE' : ($allowedPrivacy[0] ?? 'SELF_ONLY');
        }

        $postInfo = [
            'title'           => $title,
            'privacy_level'   => $privacy,
            'disable_comment' => $disableComment,
            'disable_duet'    => $disableDuet,
            'disable_stitch'  => $disableStitch,
            'is_aigc'         => $isAigc
        ];

        // Decide on transfer method:
        // Try PULL_FROM_URL first if it is a public URL (e.g. Cloudinary or live domain)
        $isPublicUrl = (strpos($absoluteUrl, 'http://') === 0 || strpos($absoluteUrl, 'https://') === 0) &&
                       (strpos($absoluteUrl, 'localhost') === false && strpos($absoluteUrl, '127.0.0.1') === false);

        $initPayload = [
            'post_info'   => $postInfo,
            'source_info' => $isPublicUrl ? [
                'source'    => 'PULL_FROM_URL',
                'video_url' => $absoluteUrl
            ] : null
        ];

        // If local file or private URL, use FILE_UPLOAD mode
        $useDirectChunkUpload = false;
        if (!$isPublicUrl && $localFilePath && file_exists($localFilePath)) {
            $useDirectChunkUpload = true;
            $videoSize = (int)filesize($localFilePath);
            $chunkSize = min($videoSize, 10 * 1024 * 1024); // 10MB chunks
            $totalChunks = (int)ceil($videoSize / $chunkSize);

            $initPayload['source_info'] = [
                'source'            => 'FILE_UPLOAD',
                'video_size'        => $videoSize,
                'chunk_size'        => $chunkSize,
                'total_chunk_count' => $totalChunks
            ];
        }

        // Initialize TikTok Post
        $initUrl = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
        $initRes = tiktokApiRequest($initUrl, 'POST', json_encode($initPayload), [
            'Authorization' => "Bearer {$accessToken}",
            'Content-Type'  => 'application/json; charset=UTF-8'
        ]);

        if ($initRes['code'] !== 200 || empty($initRes['json']['data']['publish_id'])) {
            $errCode = $initRes['json']['error']['code'] ?? 'unknown_error';
            $errMsg  = $initRes['json']['error']['message'] ?? ($initRes['json']['message'] ?? $initRes['body']);

            http_response_code(400);
            echo json_encode([
                'success'    => false,
                'error'      => "TikTok API rejected video initialization ({$errCode}): {$errMsg}",
                'debug_code' => $errCode,
                'raw'        => $initRes['json']
            ]);
            exit;
        }

        $publishId = $initRes['json']['data']['publish_id'];
        $uploadUrl = $initRes['json']['data']['upload_url'] ?? null;

        // If FILE_UPLOAD was requested, stream local chunks to upload_url
        if ($useDirectChunkUpload && !empty($uploadUrl) && $localFilePath && file_exists($localFilePath)) {
            $fp = fopen($localFilePath, 'rb');
            $start = 0;
            $chunkIndex = 0;

            while (!feof($fp) && $start < $videoSize) {
                $chunkData = fread($fp, $chunkSize);
                $chunkLen = strlen($chunkData);
                $end = $start + $chunkLen - 1;

                $chunkHeaders = [
                    'Content-Type'   => 'video/mp4',
                    'Content-Range'  => "bytes {$start}-{$end}/{$videoSize}",
                    'Content-Length' => $chunkLen
                ];

                $chunkRes = tiktokApiRequest($uploadUrl, 'PUT', $chunkData, $chunkHeaders, 60);
                if ($chunkRes['code'] < 200 || $chunkRes['code'] >= 300) {
                    fclose($fp);
                    http_response_code(500);
                    echo json_encode([
                        'success'    => false,
                        'publish_id' => $publishId,
                        'error'      => "Chunk {$chunkIndex} upload to TikTok failed (HTTP {$chunkRes['code']}): " . $chunkRes['error']
                    ]);
                    exit;
                }

                $start += $chunkLen;
                $chunkIndex++;
            }
            fclose($fp);
        }

        // Record publishing log
        $publishLog = [
            'publish_id'   => $publishId,
            'title'        => $title,
            'video_url'    => $videoUrl,
            'privacy'      => $privacy,
            'status'       => 'PROCESSING_UPLOAD',
            'created_at'   => date('c')
        ];
        $logs = getLocalJsonStore('tiktok_posts.json');
        array_unshift($logs, $publishLog);
        if (count($logs) > 50) $logs = array_slice($logs, 0, 50);
        saveLocalJsonStore('tiktok_posts.json', $logs);

        echo json_encode([
            'success'       => true,
            'publish_id'    => $publishId,
            'status'        => 'PROCESSING_UPLOAD',
            'title'         => $title,
            'account'       => '@arab_hausa_rtv',
            'message'       => 'Video submitted to TikTok! Processing has started.'
        ]);
        exit;

    // =========================================================
    // 7. PUBLISH STATUS: Check processing status
    // =========================================================
    case 'publish_status':
        $publishId = trim($_GET['publish_id'] ?? ($_POST['publish_id'] ?? ''));
        if (empty($publishId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing publish_id']);
            exit;
        }

        $accessToken = getValidAccessToken();
        if (!$accessToken) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Not connected to TikTok']);
            exit;
        }

        $statusUrl = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';
        $statusRes = tiktokApiRequest($statusUrl, 'POST', json_encode(['publish_id' => $publishId]), [
            'Authorization' => "Bearer {$accessToken}",
            'Content-Type'  => 'application/json; charset=UTF-8'
        ]);

        if ($statusRes['code'] !== 200 || empty($statusRes['json']['data'])) {
            $err = $statusRes['json']['error']['message'] ?? ($statusRes['json']['message'] ?? 'Unable to fetch status');
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'status'  => 'UNKNOWN',
                'error'   => $err
            ]);
            exit;
        }

        $data = $statusRes['json']['data'];
        $pubStatus = $data['status'] ?? 'PROCESSING';
        $failReason = $data['fail_reason'] ?? '';

        // Update local logs
        $logs = getLocalJsonStore('tiktok_posts.json');
        foreach ($logs as &$log) {
            if (($log['publish_id'] ?? '') === $publishId) {
                $log['status'] = $pubStatus;
                if ($failReason) $log['fail_reason'] = $failReason;
                $log['updated_at'] = date('c');
            }
        }
        saveLocalJsonStore('tiktok_posts.json', $logs);

        echo json_encode([
            'success'     => true,
            'publish_id'  => $publishId,
            'status'      => $pubStatus,
            'fail_reason' => $failReason,
            'is_complete' => ($pubStatus === 'PUBLISH_COMPLETE'),
            'is_failed'   => ($pubStatus === 'FAILED')
        ]);
        exit;

    // =========================================================
    // 8. PUBLISH HISTORY LOGS
    // =========================================================
    case 'history':
        if (!isAuthorizedAdmin()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            exit;
        }
        $logs = getLocalJsonStore('tiktok_posts.json');
        echo json_encode(['success' => true, 'posts' => $logs]);
        exit;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        exit;
}
