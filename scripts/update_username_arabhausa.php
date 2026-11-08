<?php
$files = ['public/admin.php', 'public/admin.html', 'public/js/admin.js'];
foreach ($files as $f) {
    if (file_exists($f)) {
        $c = file_get_contents($f);
        $c = str_replace('@arab_hausa_rtv', '@arabhausa', $c);
        $c = str_replace('tiktok.com/@arab_hausa_rtv', 'tiktok.com/@arabhausa', $c);
        file_put_contents($f, $c);
        echo "Updated $f\n";
    }
}
