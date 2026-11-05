<?php
$html = file_get_contents(__DIR__ . '/../public/index.html');

$dummyHome = '<div id="homeMediaGrid" class="public-media-grid">
          <div class="public-media-card" data-media-id="1">
            <div class="public-media-preview video-preview">
              <span class="public-media-badge" data-i18n="badgeVideo" style="background:#D32F2F; color:#FFFFFF;">BIDIYO</span>
              <video controls playsinline webkit-playsinline preload="metadata" data-video-src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" style="width:100%; height:auto; max-height:600px; object-fit:contain !important; background:#000000; display:block;"></video>
            </div>
            <div class="public-media-body">
              <h4 class="public-media-title">Arab Hausa TV HD Live Feed</h4>
              <div class="public-media-meta">
                <span class="category-tag" data-i18n="categoryTvBroadcast">TV Broadcast</span>
                <span data-i18n="badgeLive">Kai Tsaye</span>
              </div>
            </div>
          </div>
        </div>';

$dummyTv = '<div id="tvMediaGrid" class="public-media-grid">
          <div class="public-media-card" data-media-id="1">
            <div class="public-media-preview video-preview">
              <span class="public-media-badge" data-i18n="badgeVideo" style="background:#D32F2F; color:#FFFFFF;">BIDIYO</span>
              <video controls playsinline webkit-playsinline preload="metadata" data-video-src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" style="width:100%; height:auto; max-height:600px; object-fit:contain !important; background:#000000; display:block;"></video>
            </div>
            <div class="public-media-body">
              <h4 class="public-media-title">Arab Hausa TV HD Live Feed</h4>
              <div class="public-media-meta">
                <span class="category-tag" data-i18n="categoryTvBroadcast">TV Broadcast</span>
                <span data-i18n="badgeLive">Kai Tsaye</span>
              </div>
            </div>
          </div>
        </div>';

$replacementHome = '<div id="homeMediaGrid" class="public-media-grid">
          <div class="skeleton-card" style="height:260px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.08);"></div>
          <div class="skeleton-card" style="height:260px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.08);"></div>
        </div>';

$replacementTv = '<div id="tvMediaGrid" class="public-media-grid">
          <div class="skeleton-card" style="height:260px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.08);"></div>
          <div class="skeleton-card" style="height:260px; background:rgba(255,255,255,0.03); border-radius:14px; border:1px solid rgba(255,255,255,0.08);"></div>
        </div>';

// Normalize newlines to match
$htmlNorm = str_replace("\r\n", "\n", $html);
$countHome = 0;
$countTv = 0;
$htmlNorm = str_replace($dummyHome, $replacementHome, $htmlNorm, $countHome);
$htmlNorm = str_replace($dummyTv, $replacementTv, $htmlNorm, $countTv);

// Update script query versions to v49
$htmlNorm = str_replace('?v=45', '?v=49', $htmlNorm);
$htmlNorm = str_replace('?v=48', '?v=49', $htmlNorm);

// Convert back to CRLF
$htmlFinal = str_replace("\n", "\r\n", $htmlNorm);
file_put_contents(__DIR__ . '/../public/index.html', $htmlFinal);

echo "Replaced Home: $countHome, Replaced Tv: $countTv\n";
