<?php
$file = __DIR__ . '/../public/js/admin.js';
$content = file_get_contents($file);
$contentNorm = str_replace("\r\n", "\n", $content);

// 1. Hook into handleUploadSuccess
$targetSuccess = '    window.dispatchEvent(new CustomEvent(\'media-uploaded\', { detail: data.media }));
    }';

$replacementSuccess = '    window.dispatchEvent(new CustomEvent(\'media-uploaded\', { detail: data.media }));
    }

    // Trigger TikTok Auto-Publish if enabled
    const uploadedVidUrl = (data && data.media && data.media.url) || currentVideoUrl;
    const uploadedVidTitle = (data && data.media && data.media.name) || (videoTitleInput ? videoTitleInput.value : \'\');
    if (uploadedVidUrl && typeof publishVideoToTikTok === \'function\') {
      publishVideoToTikTok(uploadedVidUrl, uploadedVidTitle);
    }';

if (strpos($contentNorm, $targetSuccess) !== false) {
    $contentNorm = str_replace($targetSuccess, $replacementSuccess, $contentNorm);
    echo "1. Hooked TikTok auto-publish into handleUploadSuccess\n";
} else {
    echo "1. targetSuccess pattern not found\n";
}

// 2. Hook into external URL upload success
$targetExtSuccess = '          showMediaFeedback(\'✅ An yi nasarar ɗora bidiyo a kan shafin TV!\', true, \'video\');
          currentVideoUrl = null;';

$replacementExtSuccess = '          showMediaFeedback(\'✅ An yi nasarar ɗora bidiyo a kan shafin TV!\', true, \'video\');
          // Trigger TikTok Auto-Publish if enabled
          if (localItem && localItem.url && typeof publishVideoToTikTok === \'function\') {
            publishVideoToTikTok(localItem.url, localItem.name);
          }
          currentVideoUrl = null;';

if (strpos($contentNorm, $targetExtSuccess) !== false) {
    $contentNorm = str_replace($targetExtSuccess, $replacementExtSuccess, $contentNorm);
    echo "2. Hooked TikTok auto-publish into external URL upload\n";
} else {
    echo "2. targetExtSuccess pattern not found\n";
}

// 3. Append TikTok Controller before the closing '});'
$tiktokJs = <<<'EOD'

  // =========================================================================
  // TIKTOK AUTO-PUBLISHING ENGINE (@arab_hausa_rtv)
  // =========================================================================
  const connectTikTokBtn = document.getElementById('connectTikTokBtn');
  const disconnectTikTokBtn = document.getElementById('disconnectTikTokBtn');
  const toggleTikTokSettingsBtn = document.getElementById('toggleTikTokSettingsBtn');
  const tiktokSettingsCollapsible = document.getElementById('tiktokSettingsCollapsible');
  const saveTikTokSettingsBtn = document.getElementById('saveTikTokSettingsBtn');
  const tiktokClientKeyInput = document.getElementById('tiktokClientKeyInput');
  const tiktokClientSecretInput = document.getElementById('tiktokClientSecretInput');
  const tiktokRedirectUriInput = document.getElementById('tiktokRedirectUriInput');
  const tiktokSettingsFeedback = document.getElementById('tiktokSettingsFeedback');
  const tiktokStatusBadge = document.getElementById('tiktokStatusBadge');
  const tiktokConnectedBox = document.getElementById('tiktokConnectedBox');
  const tiktokAccountName = document.getElementById('tiktokAccountName');
  const tiktokAccountHandle = document.getElementById('tiktokAccountHandle');
  const tiktokAccountAvatar = document.getElementById('tiktokAccountAvatar');
  const tiktokTokenExpiry = document.getElementById('tiktokTokenExpiry');
  const tiktokAutoPublishCheckbox = document.getElementById('tiktokAutoPublishCheckbox');
  const tiktokPublishOptions = document.getElementById('tiktokPublishOptions');
  const tiktokCaptionInput = document.getElementById('tiktokCaptionInput');
  const tiktokCharCount = document.getElementById('tiktokCharCount');
  const tiktokPublishStatus = document.getElementById('tiktokPublishStatus');
  const tiktokPrivacySelect = document.getElementById('tiktokPrivacySelect');
  const tiktokAigcSelect = document.getElementById('tiktokAigcSelect');
  const tiktokAllowComments = document.getElementById('tiktokAllowComments');
  const tiktokAllowDuet = document.getElementById('tiktokAllowDuet');
  const tiktokAllowStitch = document.getElementById('tiktokAllowStitch');

  let tiktokState = {
    connected: false,
    username: 'arab_hausa_rtv',
    displayName: 'Arab Hausa RTV',
    appConfigured: false,
    lastPublishId: null,
    lastVideoUrl: null,
    lastTitle: null
  };

  async function checkTikTokStatus() {
    try {
      const res = await fetch('/api/tiktok?action=status&t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.success) return;

      tiktokState.connected = Boolean(data.connected);
      tiktokState.username = data.username || 'arab_hausa_rtv';
      tiktokState.displayName = data.display_name || 'Arab Hausa RTV';
      tiktokState.appConfigured = Boolean(data.app_configured);

      if (tiktokRedirectUriInput && data.redirect_uri) {
        tiktokRedirectUriInput.value = data.redirect_uri;
      }
      if (tiktokClientKeyInput && data.client_key) {
        tiktokClientKeyInput.placeholder = data.client_key + ' (configured)';
      }

      if (tiktokState.connected) {
        if (tiktokStatusBadge) {
          tiktokStatusBadge.textContent = 'CONNECTED & ACTIVE ✅';
          tiktokStatusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
          tiktokStatusBadge.style.color = '#10B981';
          tiktokStatusBadge.style.border = '1px solid rgba(16, 185, 129, 0.35)';
        }
        if (connectTikTokBtn) {
          connectTikTokBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
            <span>Re-Authorize</span>
          `;
        }
        if (disconnectTikTokBtn) disconnectTikTokBtn.style.display = 'inline-block';
        if (tiktokConnectedBox) tiktokConnectedBox.style.display = 'flex';
        if (tiktokAccountName) tiktokAccountName.textContent = tiktokState.displayName;
        if (tiktokAccountHandle) tiktokAccountHandle.textContent = '@' + tiktokState.username;
        if (tiktokAccountAvatar && data.avatar_url) tiktokAccountAvatar.src = data.avatar_url;

        if (tiktokTokenExpiry) {
          const hrs = Math.round((data.expires_in_sec || 7200) / 3600);
          tiktokTokenExpiry.textContent = `Auto-refresh active (~${hrs}h)`;
        }
      } else {
        if (tiktokStatusBadge) {
          if (!tiktokState.appConfigured) {
            tiktokStatusBadge.textContent = 'CONFIG NEEDED ⚠️';
            tiktokStatusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
            tiktokStatusBadge.style.color = '#F59E0B';
            tiktokStatusBadge.style.border = '1px solid rgba(245, 158, 11, 0.35)';
          } else {
            tiktokStatusBadge.textContent = 'NOT CONNECTED';
            tiktokStatusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
            tiktokStatusBadge.style.color = '#EF4444';
            tiktokStatusBadge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
          }
        }
        if (connectTikTokBtn) {
          connectTikTokBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
            <span>Connect TikTok</span>
          `;
        }
        if (disconnectTikTokBtn) disconnectTikTokBtn.style.display = 'none';
        if (tiktokConnectedBox) tiktokConnectedBox.style.display = 'none';
      }
    } catch (e) {
      console.warn('TikTok status check error:', e);
    }
  }

  // Toggle Developer App settings form
  if (toggleTikTokSettingsBtn && tiktokSettingsCollapsible) {
    toggleTikTokSettingsBtn.addEventListener('click', () => {
      const isClosed = tiktokSettingsCollapsible.style.display === 'none';
      tiktokSettingsCollapsible.style.display = isClosed ? 'block' : 'none';
    });
  }

  // Save TikTok Developer Credentials
  if (saveTikTokSettingsBtn) {
    saveTikTokSettingsBtn.addEventListener('click', async () => {
      const clientKey = (tiktokClientKeyInput?.value || '').trim();
      const clientSecret = (tiktokClientSecretInput?.value || '').trim();
      const redirectUri = (tiktokRedirectUriInput?.value || '').trim();

      if (!clientKey && !clientSecret && !redirectUri) {
        alert('Please enter your Client Key and Client Secret from your TikTok Developer Portal.');
        return;
      }

      saveTikTokSettingsBtn.disabled = true;
      saveTikTokSettingsBtn.textContent = 'Saving...';
      try {
        const res = await adminApiFetch('tiktok?action=save_settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_key: clientKey, client_secret: clientSecret, redirect_uri: redirectUri })
        });
        if (res && res.success) {
          if (tiktokSettingsFeedback) {
            tiktokSettingsFeedback.style.display = 'block';
            tiktokSettingsFeedback.style.color = '#10B981';
            tiktokSettingsFeedback.textContent = '✅ Credentials saved! Now click "Connect TikTok".';
          }
          await checkTikTokStatus();
          setTimeout(() => {
            if (tiktokSettingsCollapsible) tiktokSettingsCollapsible.style.display = 'none';
          }, 2000);
        } else {
          throw new Error((res && res.error) || 'Failed to save');
        }
      } catch (err) {
        if (tiktokSettingsFeedback) {
          tiktokSettingsFeedback.style.display = 'block';
          tiktokSettingsFeedback.style.color = '#EF4444';
          tiktokSettingsFeedback.textContent = '❌ Error saving: ' + err.message;
        }
      } finally {
        saveTikTokSettingsBtn.disabled = false;
        saveTikTokSettingsBtn.textContent = '💾 Save TikTok Credentials';
      }
    });
  }

  // Connect TikTok Account Click Handler
  if (connectTikTokBtn) {
    connectTikTokBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/tiktok?action=auth_url');
        const data = await res.json();
        if (data && data.success && data.auth_url) {
          const width = 600, height = 750;
          const left = (window.innerWidth - width) / 2 + window.screenX;
          const top = (window.innerHeight - height) / 2 + window.screenY;
          window.open(data.auth_url, 'TikTokAuthPopup', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`);
        } else {
          if (tiktokSettingsCollapsible) tiktokSettingsCollapsible.style.display = 'block';
          alert(data.error || 'Please configure your TikTok Developer App Client Key and Secret first.');
        }
      } catch (e) {
        alert('Network error connecting to TikTok: ' + e.message);
      }
    });
  }

  // Disconnect TikTok Account Click Handler
  if (disconnectTikTokBtn) {
    disconnectTikTokBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to disconnect @' + tiktokState.username + '? Auto-publishing to TikTok will be paused.')) {
        return;
      }
      try {
        await adminApiFetch('tiktok?action=disconnect', { method: 'POST' });
        await checkTikTokStatus();
        alert('TikTok account disconnected.');
      } catch (e) {
        alert('Error disconnecting TikTok: ' + e.message);
      }
    });
  }

  // Listen for callback event or window focus to refresh status
  window.addEventListener('tiktok-connected', () => checkTikTokStatus());
  window.addEventListener('focus', () => checkTikTokStatus());

  // Auto-Publish checkbox toggle handler
  if (tiktokAutoPublishCheckbox && tiktokPublishOptions) {
    tiktokAutoPublishCheckbox.addEventListener('change', () => {
      if (tiktokAutoPublishCheckbox.checked) {
        if (!tiktokState.connected) {
          tiktokAutoPublishCheckbox.checked = false;
          alert('⚠️ Please connect your TikTok account first using the "Connect TikTok" button above.');
          return;
        }
        tiktokPublishOptions.style.display = 'block';
        if (tiktokCaptionInput && !tiktokCaptionInput.value.trim()) {
          const title = (videoTitleInput?.value || '').trim();
          tiktokCaptionInput.value = (title ? title + ' ' : '') + '#ArabHausaRTV #Hausa #Labarai #KaiTsaye';
          updateTikTokCharCount();
        }
      } else {
        tiktokPublishOptions.style.display = 'none';
      }
    });
  }

  function updateTikTokCharCount() {
    if (!tiktokCaptionInput || !tiktokCharCount) return;
    const len = tiktokCaptionInput.value.length;
    tiktokCharCount.textContent = `${len} / 2200`;
    tiktokCharCount.style.color = len > 2200 ? '#EF4444' : '#94A3B8';
  }

  if (tiktokCaptionInput) {
    tiktokCaptionInput.addEventListener('input', updateTikTokCharCount);
  }

  // Auto-fill caption if video title changes
  if (videoTitleInput && tiktokCaptionInput) {
    videoTitleInput.addEventListener('input', () => {
      if (tiktokAutoPublishCheckbox && tiktokAutoPublishCheckbox.checked) {
        if (!tiktokCaptionInput.dataset.userEdited) {
          const t = videoTitleInput.value.trim();
          tiktokCaptionInput.value = (t ? t + ' ' : '') + '#ArabHausaRTV #Hausa #Labarai #KaiTsaye';
          updateTikTokCharCount();
        }
      }
    });
    tiktokCaptionInput.addEventListener('keydown', () => {
      tiktokCaptionInput.dataset.userEdited = 'true';
    });
  }

  // Main TikTok Auto-Publish Worker Function
  async function publishVideoToTikTok(videoUrl, defaultTitle) {
    if (!tiktokAutoPublishCheckbox || !tiktokAutoPublishCheckbox.checked) {
      return null;
    }

    if (!tiktokPublishStatus) return null;
    tiktokPublishStatus.style.display = 'block';
    tiktokPublishStatus.style.background = 'rgba(0, 242, 254, 0.1)';
    tiktokPublishStatus.style.border = '1px solid rgba(0, 242, 254, 0.3)';
    tiktokPublishStatus.style.color = '#00f2fe';
    tiktokPublishStatus.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span class="upload-pulse-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00f2fe;"></span>
        <span>🎵 Sending video to TikTok (@${tiktokState.username})... Step 1: Initializing</span>
      </div>
    `;

    const caption = (tiktokCaptionInput?.value || '').trim() || defaultTitle || 'Arab Hausa RTV Broadcast';
    const privacy = tiktokPrivacySelect?.value || 'PUBLIC_TO_EVERYONE';
    const isAigc = (tiktokAigcSelect?.value === '1');
    const allowComments = Boolean(tiktokAllowComments?.checked);
    const allowDuet = Boolean(tiktokAllowDuet?.checked);
    const allowStitch = Boolean(tiktokAllowStitch?.checked);

    tiktokState.lastVideoUrl = videoUrl;
    tiktokState.lastTitle = caption;

    try {
      const payload = {
        video_url: videoUrl,
        title: caption,
        privacy_level: privacy,
        disable_comment: !allowComments,
        disable_duet: !allowDuet,
        disable_stitch: !allowStitch,
        is_aigc: isAigc
      };

      const res = await adminApiFetch('tiktok?action=publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res || !res.success || !res.publish_id) {
        throw new Error((res && res.error) || 'TikTok API rejected initialization');
      }

      tiktokState.lastPublishId = res.publish_id;
      tiktokPublishStatus.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span class="upload-pulse-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00f2fe;"></span>
          <span>⏳ Video received by TikTok! Processing and transcoding...</span>
        </div>
      `;

      pollTikTokPublishStatus(res.publish_id);
      return res;

    } catch (err) {
      console.error('TikTok publish error:', err);
      tiktokPublishStatus.style.background = 'rgba(239, 68, 68, 0.15)';
      tiktokPublishStatus.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      tiktokPublishStatus.style.color = '#F87171';
      tiktokPublishStatus.innerHTML = `
        <div>❌ TikTok Auto-Publish Failed: ${escapeHtml(err.message)}</div>
        <div style="margin-top: 6px;">
          <button type="button" onclick="window.retryTikTokPublish()" class="btn-primary" style="padding: 4px 12px; font-size: 0.76rem; background: #EF4444; border-radius: 6px;">
            🔄 Retry TikTok Publish
          </button>
        </div>
      `;
      return null;
    }
  }

  function pollTikTokPublishStatus(publishId, attempts = 0) {
    if (attempts > 30) {
      if (tiktokPublishStatus) {
        tiktokPublishStatus.innerHTML = `
          <div>ℹ️ TikTok is still processing this video. Check your TikTok profile in a few minutes: <a href="https://tiktok.com/@${tiktokState.username}" target="_blank" style="color:#00f2fe; font-weight:bold;">@${tiktokState.username}</a></div>
        `;
      }
      return;
    }

    setTimeout(async () => {
      try {
        const res = await fetch(`/api/tiktok?action=publish_status&publish_id=${encodeURIComponent(publishId)}`);
        const data = await res.json();
        if (!data || !data.success) {
          pollTikTokPublishStatus(publishId, attempts + 1);
          return;
        }

        if (data.is_complete || data.status === 'PUBLISH_COMPLETE') {
          if (tiktokPublishStatus) {
            tiktokPublishStatus.style.background = 'rgba(16, 185, 129, 0.15)';
            tiktokPublishStatus.style.border = '1px solid rgba(16, 185, 129, 0.4)';
            tiktokPublishStatus.style.color = '#10B981';
            tiktokPublishStatus.innerHTML = `
              <div>🎉 <strong>Published to TikTok Successfully!</strong></div>
              <div style="font-size: 0.78rem; margin-top: 4px;">
                Live on <a href="https://tiktok.com/@${tiktokState.username}" target="_blank" rel="noopener" style="color:#00f2fe; font-weight:800; text-decoration:underline;">@${tiktokState.username}</a>
              </div>
            `;
          }
        } else if (data.is_failed || data.status === 'FAILED') {
          if (tiktokPublishStatus) {
            tiktokPublishStatus.style.background = 'rgba(239, 68, 68, 0.15)';
            tiktokPublishStatus.style.border = '1px solid rgba(239, 68, 68, 0.4)';
            tiktokPublishStatus.style.color = '#F87171';
            const reason = data.fail_reason || data.error || 'Video failed TikTok processing';
            tiktokPublishStatus.innerHTML = `
              <div>❌ TikTok Processing Failed: ${escapeHtml(reason)}</div>
              <div style="margin-top: 6px;">
                <button type="button" onclick="window.retryTikTokPublish()" class="btn-primary" style="padding: 4px 12px; font-size: 0.76rem; background: #EF4444; border-radius: 6px;">
                  🔄 Retry TikTok Publish
                </button>
              </div>
            `;
          }
        } else {
          if (tiktokPublishStatus) {
            tiktokPublishStatus.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span class="upload-pulse-dot" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00f2fe;"></span>
                <span>⏳ TikTok processing video (${data.status})... Please wait.</span>
              </div>
            `;
          }
          pollTikTokPublishStatus(publishId, attempts + 1);
        }
      } catch (e) {
        pollTikTokPublishStatus(publishId, attempts + 1);
      }
    }, 2800);
  }

  window.retryTikTokPublish = function() {
    if (tiktokState.lastVideoUrl) {
      publishVideoToTikTok(tiktokState.lastVideoUrl, tiktokState.lastTitle);
    } else {
      alert('No video available to retry. Please select and upload a video.');
    }
  };

  // Initial check on Admin load
  checkTikTokStatus();
EOD;

$closingBrace = "\n});";
$pos = strrpos($contentNorm, $closingBrace);
if ($pos !== false) {
    $contentNorm = substr($contentNorm, 0, $pos) . "\n" . $tiktokJs . "\n});";
    echo "3. Appended TikTok Integration Controller into admin.js\n";
} else {
    echo "3. Closing brace not found in admin.js\n";
}

$contentFinal = str_replace("\n", "\r\n", $contentNorm);
file_put_contents($file, $contentFinal);
echo "Finished updating public/js/admin.js\n";
