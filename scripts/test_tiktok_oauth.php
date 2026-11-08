<?php
$url = 'https://www.tiktok.com/v2/auth/authorize/?client_key=sbawzd3jagayc4wfjd&response_type=code&scope=user.info.basic,video.publish,video.upload&redirect_uri=' . urlencode('https://radio-nine-gamma.vercel.app/api/tiktok?action=callback') . '&state=test123';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
echo "CODE: " . $code . "\n";
echo "FINAL URL: " . $finalUrl . "\n";
if (strpos($resp, 'error') !== false) {
    echo "Found error text in response\n";
}
