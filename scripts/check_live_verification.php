<?php
$ch = curl_init('https://radio-nine-gamma.vercel.app/tiktok-developers-site-verification.txt');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$resp = curl_exec($ch);
$err = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
echo "CODE: " . $code . "\n";
echo "ERROR: " . $err . "\n";
echo "RESPONSE:\n" . $resp . "\n";
