<?php
$file = __DIR__ . '/../public/js/admin.js';
$content = file_get_contents($file);

// 1. Add Post to TikTok button in renderMediaGalleryList
$targetBtn = '<button class="gallery-action-btn btn-danger" onclick="deleteMediaItem(\'${item.id}\')">Delete</button>';
$replacementBtn = '${item.type === \'video\' ? `<button class="gallery-action-btn" style="background:#010101; color:#fff; border:1px solid #fe2c55; display:inline-flex; align-items:center; gap:4px; font-weight:700; font-size:0.75rem; border-radius:6px; padding:4px 8px; cursor:pointer;" onclick="publishExistingVideoToTikTok(\'${item.id}\', \'${encodeURIComponent(mediaUrl)}\', \'${encodeURIComponent(item.name || item.title || \'\')}\')">🎵 Post to TikTok</button>` : \'\'}' . "\n              " . $targetBtn;

if (strpos($content, 'publishExistingVideoToTikTok') === false) {
    $content = str_replace($targetBtn, $replacementBtn, $content);
    echo "Added button to gallery card\n";
} else {
    echo "Button already present\n";
}

// 2. Add window.publishExistingVideoToTikTok function before checkTikTokStatus()
$funcCode = <<<JS

  window.publishExistingVideoToTikTok = async function(id, encodedUrl, encodedTitle) {
    const mediaUrl = decodeURIComponent(encodedUrl || '');
    const title = decodeURIComponent(encodedTitle || 'Arab Hausa RTV Video');

    const caption = prompt('Publish this video to TikTok (@arab_hausa_rtv)?\\nEnter caption and hashtags (or click OK to use title):', title);
    if (caption === null) return;

    if (window.showToast) window.showToast('Submitting video to TikTok...', 'info');

    try {
      const res = await apiFetch('/api/tiktok?action=publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: mediaUrl,
          caption: caption.trim() || title,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false
        })
      });

      if (res && res.success && res.publish_id) {
        if (window.showToast) window.showToast('🎉 Video submitted to TikTok! Processing your post.', 'success');
        alert('🎉 Video successfully submitted to TikTok!\\n\\nTikTok publish ID: ' + res.publish_id + '\\nYour post is being processed by TikTok.');
        if (typeof pollTikTokPublishStatus === 'function') {
          pollTikTokPublishStatus(res.publish_id);
        }
      } else {
        const err = (res && res.error) || 'Failed to publish to TikTok';
        alert('TikTok Publish Error: ' + err);
      }
    } catch (err) {
      console.error('TikTok publish error:', err);
      alert('TikTok Publish Error: ' + err.message);
    }
  };

JS;

if (strpos($content, 'window.publishExistingVideoToTikTok =') === false) {
    $content = str_replace('window.retryTikTokPublish = function() {', $funcCode . "\n  window.retryTikTokPublish = function() {", $content);
    echo "Added publishExistingVideoToTikTok function\n";
}

file_put_contents($file, $content);
echo "Successfully patched admin.js!\n";
