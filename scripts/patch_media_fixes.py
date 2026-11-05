# -*- coding: utf-8 -*-
import re

# 1. Patch public/js/admin.js for Voice Note Uploading
with open('public/js/admin.js', 'r', encoding='utf-8') as f:
    admin_content = f.read()

# Add currentAudioBlob and currentAudioFile variables
old_audio_vars = "  let currentAudioUrl = null;\n  let voiceRecorder = null;"
new_audio_vars = """  let currentAudioUrl = null;
  let currentAudioBlob = null;
  let currentAudioFile = null;
  let voiceRecorder = null;"""

if old_audio_vars in admin_content:
    admin_content = admin_content.replace(old_audio_vars, new_audio_vars, 1)
    print("[admin.js] Added currentAudioBlob and currentAudioFile variables.")
else:
    print("[admin.js] Warning: old_audio_vars not found!")

# Capture blob in voiceRecorder.onstop
old_recorder_onstop = """        voiceRecorder.onstop = () => {
          const actualMime = voiceRecorder.mimeType || 'audio/webm';
          const blob = new Blob(voiceChunks, { type: actualMime });
          const reader = new FileReader();"""

new_recorder_onstop = """        voiceRecorder.onstop = () => {
          const actualMime = voiceRecorder.mimeType || 'audio/webm';
          const blob = new Blob(voiceChunks, { type: actualMime });
          currentAudioBlob = blob;
          currentAudioFile = null;
          const reader = new FileReader();"""

if old_recorder_onstop in admin_content:
    admin_content = admin_content.replace(old_recorder_onstop, new_recorder_onstop, 1)
    print("[admin.js] Updated voiceRecorder.onstop to store currentAudioBlob.")
else:
    print("[admin.js] Warning: old_recorder_onstop not found!")

# Capture file in audioFileInput
old_audio_change = """  if (audioFileInput) {
    audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();"""

new_audio_change = """  if (audioFileInput) {
    audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        currentAudioFile = file;
        currentAudioBlob = null;
        const reader = new FileReader();"""

if old_audio_change in admin_content:
    admin_content = admin_content.replace(old_audio_change, new_audio_change, 1)
    print("[admin.js] Updated audioFileInput to store currentAudioFile.")
else:
    print("[admin.js] Warning: old_audio_change not found!")

# Replace uploadAudioBtn handler with direct binary multipart upload
audio_btn_start = "  let isPublishingAudio = false;\n  if (uploadAudioBtn) {"
audio_btn_end = "  // --- 6d. MEDIA GALLERY FILTER & DELETE (Neon Postgres) ---"

idx_a_start = admin_content.find(audio_btn_start)
idx_a_end = admin_content.find(audio_btn_end)

if idx_a_start != -1 and idx_a_end != -1:
    new_audio_btn_block = """  let isPublishingAudio = false;
  if (uploadAudioBtn) {
    uploadAudioBtn.addEventListener('click', async () => {
      if (isPublishingAudio) return;
      if (!currentAudioUrl && !currentAudioBlob && !currentAudioFile) {
        showMediaFeedback('⚠️ Da fatan a ɗauki murya ko zaɓi fayil ɗin sauti da farko.', false);
        return;
      }

      isPublishingAudio = true;
      uploadAudioBtn.disabled = true;
      uploadAudioBtn.textContent = '⏳ Ana tura murya zuwa Database...';
      const title = (audioTitleInput ? audioTitleInput.value.trim() : '') || 'Recorded Voice Note';
      const category = 'Voice Note Dispatch';
      const idempotencyKey = 'pub_audio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

      try {
        let savedItem = null;
        const rawBlob = currentAudioBlob || currentAudioFile;

        // Path A: High-speed multipart binary FormData upload (clean, direct, no base64 size explosion)
        if (rawBlob) {
          uploadAudioBtn.textContent = '⚡ Ana tura sautin kai-tsaye...';
          const mime = rawBlob.type || 'audio/webm';
          let ext = 'webm';
          if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3';
          else if (mime.includes('wav')) ext = 'wav';
          else if (mime.includes('ogg')) ext = 'ogg';
          else if (mime.includes('m4a') || mime.includes('mp4') || mime.includes('aac')) ext = 'm4a';

          const formData = new FormData();
          formData.append('file', rawBlob, `voice_note_${Date.now()}.${ext}`);
          formData.append('type', 'voicenote');
          formData.append('name', title);
          formData.append('title', title);
          formData.append('category', category);
          formData.append('size', `${(rawBlob.size / 1024).toFixed(1)} KB`);
          formData.append('idempotency_key', idempotencyKey);

          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'X-Admin-Password': localStorage.getItem('admin_custom_password') || 'YourSuperSecureAdminPassword2026',
              'X-Idempotency-Key': idempotencyKey
            },
            body: formData
          });
          const data = await res.json().catch(() => null);
          if (data && data.success) savedItem = data.media;
        } else if (currentAudioUrl) {
          // Path B: Fallback for base64 or external URL
          const payload = {
            type: 'voicenote',
            name: title,
            title: title,
            category: category,
            size: currentAudioUrl.startsWith('data:') ? `${(currentAudioUrl.length * 0.75 / 1024).toFixed(1)} KB` : 'Audio Stream',
            idempotency_key: idempotencyKey
          };
          if (currentAudioUrl.startsWith('data:')) {
            payload.dataUrl = currentAudioUrl;
          } else {
            payload.url = currentAudioUrl;
          }
          const data = await adminApiFetch('upload', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(payload)
          });
          if (data && data.success) savedItem = data.media;
        }

        if (savedItem) {
          showMediaFeedback('✅ An wallafa muryar a Database da shafin jama\\'a! Yanzu kowa zai iya sauraro.', true);
          if (audioFileInput) audioFileInput.value = '';
          const aNameEl = document.getElementById('audioSelectedName');
          if (aNameEl) aNameEl.style.display = 'none';
          currentAudioUrl = null;
          currentAudioBlob = null;
          currentAudioFile = null;
          audioPreviewBox.style.display = 'none';
          if (audioTitleInput) audioTitleInput.value = '';

          if (typeof AppMediaStore !== 'undefined' && AppMediaStore.put) {
            AppMediaStore.put(savedItem);
          }
          try {
            const raw = localStorage.getItem('arab_hausa_uploaded_media');
            const list = raw ? JSON.parse(raw) : [];
            const filtered = list.filter(m => String(m.id) !== String(savedItem.id) && m.url !== savedItem.url);
            filtered.unshift(savedItem);
            localStorage.setItem('arab_hausa_uploaded_media', JSON.stringify(filtered.slice(0, 50)));
            localStorage.setItem('arab_hausa_media_sync', Date.now().toString());
          } catch(e) {}
          window.dispatchEvent(new CustomEvent('media-uploaded', { detail: savedItem }));
          loadAdminMedia('voicenote');
        } else {
          showMediaFeedback('❌ Kuskuren tura murya zuwa server. Da fatan a sake gwadawa.', false);
        }
      } catch (err) {
        showMediaFeedback('❌ Network error while uploading voice note: ' + err.message, false);
      } finally {
        isPublishingAudio = false;
        uploadAudioBtn.disabled = false;
        uploadAudioBtn.textContent = '🎙️ Save & Upload Voice Note';
      }
    });
  }

"""
    admin_content = admin_content[:idx_a_start] + new_audio_btn_block + admin_content[idx_a_end:]
    print("[admin.js] Replaced uploadAudioBtn block successfully.")
else:
    print(f"[admin.js] Warning: uploadAudioBtn block boundaries not found! start={idx_a_start}, end={idx_a_end}")

with open('public/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(admin_content)

print("Finished updating admin.js.")
