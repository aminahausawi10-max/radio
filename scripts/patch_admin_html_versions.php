<?php
$file = __DIR__ . '/../public/admin.html';
$content = file_get_contents($file);
$contentNorm = str_replace("\r\n", "\n", $content);
$contentNorm = str_replace('admin.js?v=62', 'admin.js?v=70', $contentNorm);
$contentNorm = str_replace('admin.css?v=20', 'admin.css?v=25', $contentNorm);
$contentFinal = str_replace("\n", "\r\n", $contentNorm);
file_put_contents($file, $contentFinal);
echo "Updated script versions in admin.html\n";
