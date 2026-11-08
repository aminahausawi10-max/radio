<?php
$file = __DIR__ . '/../public/index.html';
$content = file_get_contents($file);
$tag = "\n  <meta name=\"tiktok-developers-site-verification\" content=\"qEgYXTdgmLcgUcBJmUxAQb9P0PhErQWZ\">\n  ";
if (strpos($content, 'tiktok-developers-site-verification') === false) {
    $content = str_replace('<title>', $tag . '<title>', $content);
    file_put_contents($file, $content);
    echo "Added meta tag to public/index.html\n";
} else {
    echo "Meta tag already present\n";
}
