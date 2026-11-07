<?php
$file = __DIR__ . '/../public/admin.php';
$content = file_get_contents($file);
$contentNorm = str_replace("\r\n", "\n", $content);

// 1. Add TikTok Integration Card right above the media-uploaders-grid
$targetCard = '            <!-- 3 Dedicated Upload Modules -->
            <div class="media-uploaders-grid">';

$replacementCard = '            <!-- TikTok Auto-Publishing Integration Card -->
            <div class="tiktok-card-wrap" id="tiktokIntegrationCard">
              <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 44px; height: 44px; border-radius: 12px; background: #010101; border: 1px solid rgba(0, 242, 254, 0.4); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); flex-shrink: 0;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <h4 style="margin: 0; font-size: 1.05rem; color: #fff; font-weight: 800;">TikTok Auto-Publishing</h4>
                      <span id="tiktokStatusBadge" style="font-size: 0.72rem; padding: 2px 10px; border-radius: 12px; font-weight: 800; background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3);">NOT CONNECTED</span>
                    </div>
                    <p style="margin: 3px 0 0 0; font-size: 0.8rem; color: #94A3B8;">
                      Account: <a href="https://tiktok.com/@arab_hausa_rtv" target="_blank" rel="noopener" style="color: #00f2fe; text-decoration: none; font-weight: 700;">@arab_hausa_rtv</a> • One-click auto-publishing for station broadcast videos
                    </p>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <button type="button" class="btn-primary tiktok-brand-btn" id="connectTikTokBtn" style="padding: 10px 18px; border-radius: 10px; font-size: 0.88rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
                    <span>Connect TikTok</span>
                  </button>
                  <button type="button" class="btn-secondary" id="disconnectTikTokBtn" style="display: none; padding: 10px 14px; border-radius: 10px; font-size: 0.82rem; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #EF4444;">
                    Disconnect
                  </button>
                  <button type="button" class="btn-secondary" id="toggleTikTokSettingsBtn" style="padding: 10px 12px; border-radius: 10px; font-size: 0.82rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #CBD5E1;">
                    ⚙️ Credentials
                  </button>
                </div>
              </div>

              <!-- Connected Account Details Preview (Visible when connected) -->
              <div id="tiktokConnectedBox" style="display: none; margin-top: 14px; padding: 12px 14px; background: rgba(0, 242, 254, 0.05); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <img id="tiktokAccountAvatar" src="/images/logo-circle.png" alt="Avatar" style="width: 38px; height: 38px; border-radius: 50%; border: 2px solid #00f2fe; object-fit: cover;">
                  <div>
                    <div style="font-size: 0.9rem; font-weight: 700; color: #fff;" id="tiktokAccountName">Arab Hausa RTV</div>
                    <div style="font-size: 0.78rem; color: #00f2fe;" id="tiktokAccountHandle">@arab_hausa_rtv</div>
                  </div>
                </div>
                <div style="font-size: 0.76rem; color: #94A3B8; display: flex; gap: 14px; align-items: center;">
                  <span>🔒 OAuth 2.0 Secure Session</span>
                  <span id="tiktokTokenExpiry" style="color: #10B981; font-weight: 600;">Active</span>
                </div>
              </div>

              <!-- Collapsible TikTok Developer App Settings -->
              <div id="tiktokSettingsCollapsible" style="display: none; margin-top: 14px; padding: 14px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <strong style="font-size: 0.88rem; color: #00f2fe;">⚙️ TikTok Developer App Configuration</strong>
                  <a href="https://developers.tiktok.com/" target="_blank" rel="noopener" style="font-size: 0.76rem; color: #00A3FF; text-decoration: underline;">Open TikTok Developer Portal ↗</a>
                </div>
                <p style="font-size: 0.76rem; color: #94A3B8; margin: 0 0 10px 0; line-height: 1.45;">
                  Create an app on <strong>developers.tiktok.com</strong> with <strong>Login Kit</strong> and <strong>Content Posting API</strong>. Required Scopes: <code>user.info.basic,video.publish,video.upload</code>.
                </p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                  <div class="admin-input-group" style="margin: 0;">
                    <label for="tiktokClientKeyInput" style="font-size: 0.78rem;">Client Key</label>
                    <input type="text" id="tiktokClientKeyInput" class="admin-input" style="font-size: 0.82rem;" placeholder="e.g. aw1234567890abcdef">
                  </div>
                  <div class="admin-input-group" style="margin: 0;">
                    <label for="tiktokClientSecretInput" style="font-size: 0.78rem;">Client Secret</label>
                    <input type="password" id="tiktokClientSecretInput" class="admin-input" style="font-size: 0.82rem;" placeholder="e.g. secret_••••••••••••••••">
                  </div>
                </div>

                <div class="admin-input-group" style="margin: 0 0 10px 0;">
                  <label for="tiktokRedirectUriInput" style="font-size: 0.78rem;">Redirect URI (Add this exact URL in your TikTok Developer Portal)</label>
                  <div style="display: flex; gap: 6px;">
                    <input type="text" id="tiktokRedirectUriInput" class="admin-input" style="font-size: 0.82rem; background: rgba(0,0,0,0.4);" readonly value="https://www.arab-hausa-rtv.com.ng/api/tiktok?action=callback">
                    <button type="button" class="btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById(\'tiktokRedirectUriInput\').value); alert(\'Redirect URI copied to clipboard!\');" style="padding: 6px 12px; font-size: 0.76rem; white-space: nowrap;">Copy</button>
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button type="button" class="btn-primary" id="saveTikTokSettingsBtn" style="padding: 8px 16px; font-size: 0.82rem; background: #0056B3;">
                    💾 Save TikTok Credentials
                  </button>
                </div>
                <div id="tiktokSettingsFeedback" style="display: none; margin-top: 8px; font-size: 0.8rem; text-align: center;"></div>
              </div>
            </div>

            <!-- 3 Dedicated Upload Modules -->
            <div class="media-uploaders-grid">';

if (strpos($contentNorm, $targetCard) !== false) {
    $contentNorm = str_replace($targetCard, $replacementCard, $contentNorm);
    echo "1. Added TikTok Integration Card in admin.php tab-media\n";
} else {
    echo "1. Target targetCard not found in admin.php\n";
}

// 2. Add TikTok Auto-Publish Control in Video Uploader
$targetVideoBtn = '<button class="btn-primary" type="button" id="uploadVideoBtn"';
$tiktokVideoControl = '<!-- TikTok Auto-Publish Control -->
                <div class="tiktok-publish-toggle-box" style="margin: 14px 0 10px 0; padding: 12px 14px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(0, 242, 254, 0.35); border-radius: 10px;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#00f2fe"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
                      <div>
                        <strong style="font-size: 0.92rem; color: #fff;">Auto-Publish to TikTok</strong>
                        <div style="font-size: 0.76rem; color: #94A3B8;">Post simultaneously to <span style="color: #00f2fe; font-weight: 700;">@arab_hausa_rtv</span></div>
                      </div>
                    </div>
                    <label class="tiktok-switch">
                      <input type="checkbox" id="tiktokAutoPublishCheckbox">
                      <span class="tiktok-slider"></span>
                    </label>
                  </div>

                  <!-- Collapsible TikTok Post Options -->
                  <div id="tiktokPublishOptions" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.15);">
                    <div class="admin-input-group" style="margin-bottom: 8px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <label for="tiktokCaptionInput" style="font-size: 0.8rem; margin: 0; color: #fff;">TikTok Caption &amp; Hashtags</label>
                        <span id="tiktokCharCount" style="font-size: 0.72rem; color: #94A3B8;">0 / 2200</span>
                      </div>
                      <textarea id="tiktokCaptionInput" class="admin-input" rows="2" style="resize: vertical; font-size: 0.85rem;" placeholder="Add caption and hashtags e.g. #ArabHausaRTV #Hausa #Labarai"></textarea>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                      <div class="admin-input-group" style="margin: 0;">
                        <label for="tiktokPrivacySelect" style="font-size: 0.78rem; color: #fff;">Who Can View</label>
                        <select id="tiktokPrivacySelect" class="admin-input" style="font-size: 0.8rem; padding: 6px 8px;">
                          <option value="PUBLIC_TO_EVERYONE">🌍 Public (Everyone)</option>
                          <option value="MUTUAL_FOLLOW_FRIENDS">👥 Friends / Mutual</option>
                          <option value="SELF_ONLY">🔒 Private (Only Me)</option>
                        </select>
                      </div>
                      <div class="admin-input-group" style="margin: 0;">
                        <label for="tiktokAigcSelect" style="font-size: 0.78rem; color: #fff;">AI Content (AIGC)</label>
                        <select id="tiktokAigcSelect" class="admin-input" style="font-size: 0.8rem; padding: 6px 8px;">
                          <option value="0">Standard Video</option>
                          <option value="1">✨ AI Generated / Edited</option>
                        </select>
                      </div>
                    </div>

                    <div style="display: flex; gap: 12px; font-size: 0.76rem; color: #CBD5E1; margin-top: 6px;">
                      <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <input type="checkbox" id="tiktokAllowComments" checked> Comments
                      </label>
                      <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <input type="checkbox" id="tiktokAllowDuet" checked> Duet
                      </label>
                      <label style="cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <input type="checkbox" id="tiktokAllowStitch" checked> Stitch
                      </label>
                    </div>
                  </div>

                  <div id="tiktokPublishStatus" style="display: none; margin-top: 10px; font-size: 0.82rem; padding: 8px 12px; border-radius: 6px; text-align: center;"></div>
                </div>

                <button class="btn-primary" type="button" id="uploadVideoBtn"';

if (strpos($contentNorm, $targetVideoBtn) !== false) {
    $contentNorm = str_replace($targetVideoBtn, $tiktokVideoControl, $contentNorm);
    echo "2. Added TikTok Auto-Publish control in admin.php Video Uploader\n";
} else {
    echo "2. Target targetVideoBtn not found in admin.php\n";
}

// 3. Bump script cache queries
$contentNorm = str_replace('admin.js?v=40', 'admin.js?v=70', $contentNorm);
$contentNorm = str_replace('admin.js?v=62', 'admin.js?v=70', $contentNorm);
$contentNorm = str_replace('admin.css?v=20', 'admin.css?v=25', $contentNorm);

$contentFinal = str_replace("\n", "\r\n", $contentNorm);
file_put_contents($file, $contentFinal);
echo "Finished updating public/admin.php\n";
