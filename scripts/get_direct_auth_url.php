<?php
$data = json_decode(file_get_contents('https://radio-nine-gamma.vercel.app/api/tiktok?action=auth_url'), true);
echo $data['auth_url'] . "\n";
