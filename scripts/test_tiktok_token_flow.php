<?php
$baseUrl = 'http://127.0.0.1:8099';
$adminPass = 'YourSuperSecureAdminPassword2026';

// Write mock connected token
$tokenData = [
    'connected'          => true,
    'open_id'            => 'mock_open_id_123',
    'union_id'           => 'mock_union_id_456',
    'access_token'       => 'mock_access_token_active',
    'expires_at'         => time() + 7200, // Valid for 2 hours
    'refresh_token'      => 'mock_refresh_token_xyz',
    'refresh_expires_at' => time() + 15552000,
    'scope'              => 'user.info.basic,video.publish,video.upload',
    'username'           => 'arab_hausa_rtv',
    'display_name'       => 'Arab Hausa RTV',
    'avatar_url'         => 'https://www.arab-hausa-rtv.com.ng/images/logo-circle.png',
    'creator_limits'     => [
        'max_video_post_duration_sec' => 600,
        'privacy_level_options' => ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'],
        'comment_disabled' => false,
        'duet_disabled' => false,
        'stitch_disabled' => false
    ],
    'connected_at'       => date('c'),
    'updated_at'         => date('c')
];

file_put_contents(__DIR__ . '/../data/tiktok_token.json', json_encode($tokenData));

$ch = curl_init("$baseUrl/api/tiktok?action=status");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
curl_close($ch);
$s = json_decode($res, true);

echo "Token Connected: " . ($s['connected'] ? 'YES' : 'NO') . "\n";
echo "Username: @" . $s['username'] . "\n";
echo "Profile URL: " . $s['profile_url'] . "\n";
echo "Expires in: " . $s['expires_in_sec'] . "s\n";

// Disconnect test
$ch = curl_init("$baseUrl/api/tiktok?action=disconnect");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["X-Admin-Password: $adminPass"]);
$res2 = curl_exec($ch);
curl_close($ch);
$d = json_decode($res2, true);
echo "Disconnect success: " . ($d['success'] ? 'YES' : 'NO') . "\n";

// Check status after disconnect
$ch = curl_init("$baseUrl/api/tiktok?action=status");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res3 = curl_exec($ch);
curl_close($ch);
$s3 = json_decode($res3, true);
echo "Status after disconnect: " . ($s3['connected'] ? 'Connected' : 'Disconnected') . "\n";
