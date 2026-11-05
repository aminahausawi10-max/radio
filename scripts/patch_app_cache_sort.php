<?php
$file = __DIR__ . '/../public/js/app.js';
$content = file_get_contents($file);
$contentNorm = str_replace("\r\n", "\n", $content);

$target = '        publicMediaItems = parsed.filter(isValidPublicMedia).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));';
$replacement = '        publicMediaItems = parsed.filter(isValidPublicMedia).sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime() || (Number(a.id) || 0);
          const timeB = new Date(b.created_at || 0).getTime() || (Number(b.id) || 0);
          return timeB - timeA;
        });';

if (strpos($contentNorm, $target) !== false) {
    $contentNorm = str_replace($target, $replacement, $contentNorm);
    $contentFinal = str_replace("\n", "\r\n", $contentNorm);
    file_put_contents($file, $contentFinal);
    echo "Startup cache sort updated\n";
} else {
    echo "Startup cache target not found\n";
}
