# -*- coding: utf-8 -*-
with open('public/js/admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update getDynamicChunkSize
old_chunk_func = """  function getDynamicChunkSize(fileSize) {
    if (fileSize <= 15 * 1024 * 1024) return 256 * 1024; // 256 KB
    return 384 * 1024; // 384 KB
  }"""

new_chunk_func = """  // Optimal Dynamic Chunk Sizing: 1MB to 3MB chunks reduce HTTP round-trips by ~85-90% for high-speed transfers
  function getDynamicChunkSize(fileSize) {
    if (fileSize <= 10 * 1024 * 1024) return 1024 * 1024; // 1 MB
    if (fileSize <= 50 * 1024 * 1024) return 2 * 1024 * 1024; // 2 MB
    return 3 * 1024 * 1024; // 3 MB
  }"""

if old_chunk_func in content:
    content = content.replace(old_chunk_func, new_chunk_func)
    print("Updated getDynamicChunkSize successfully.")
else:
    print("Warning: old_chunk_func not found!")

# 2. Update uploadPhotoBtn with direct FormData upload & single-flight lock
photo_needle_start = "  // Upload Photo action\n  if (uploadPhotoBtn) {"
photo_needle_end = "  // --- 6c. ULTRA-FAST RESUMABLE & PARALLEL VIDEO UPLOAD ENGINE ---"

idx_start = content.find(photo_needle_start)
idx_end = content.find(photo_needle_end)

if idx_start != -1 and idx_end != -1:
    new_photo_block = """  // Upload Photo action
  let isPublishingPhoto = false;
  if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener('click', async () => {
      if (isPublishingPhoto) return;
      const externalUrl = photoExternalUrlInput ? photoExternalUrlInput.value.trim() : '';

      if (!currentPhotoFile && !externalUrl) {
        showMediaFeedback('⚠️ Da fatan a zaɓi hoto daga Gallery ko saka Image URL da farko.', false, 'photo');
        return;
      }

      isPublishingPhoto = true;
      uploadPhotoBtn.disabled = true;
      uploadPhotoBtn.textContent = '⏳ Ana tura hoto zuwa Cloudinary / Database...';
      showMediaFeedback('⏳ Ana shirya hoto da tura shi zuwa Cloudinary / Database...', true, 'photo');

      const title = (photoTitleInput ? photoTitleInput.value.trim() : '') || (currentPhotoFile ? currentPhotoFile.name.replace(/\\.[^/.]+$/, '') : 'Uploaded Photo');
      const category = document.getElementById('photoCategorySelect') ? document.getElementById('photoCategorySelect').value : 'TV Studio';
      const idempotencyKey = 'pub_photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

      try {
        let savedItem = null;

        // Path A: Upload directly via binary FormData (Fast, preserves full quality, no base64 canvas blowup)
        if (currentPhotoFile) {
          let cloudUrl = null;
          try {
            cloudUrl = await uploadToCloudinary(currentPhotoFile, (pct) => {
              uploadPhotoBtn.textContent = `☁️ Cloudinary CDN (${pct}%)...`;
            });
          } catch (e) {}

          if (cloudUrl) {
            // Save Cloudinary URL
            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-Idempotency-Key': idempotencyKey
              },
              body: JSON.stringify({
                type: 'photo',
                name: title,
                title: title,
                category: category,
                url: cloudUrl,
                stream_url: cloudUrl,
                size: `${Math.round(currentPhotoFile.size / 1024)} KB`
              })
            });
            const data = await res.json().catch(() => null);
            if (data && data.success) savedItem = data.media;
          } else {
            // Direct binary multipart FormData upload to server
            uploadPhotoBtn.textContent = '⚡ Ana tura hoto kai-tsaye...';
            const formData = new FormData();
            formData.append('file', currentPhotoFile);
            formData.append('type', 'photo');
            formData.append('name', title);
            formData.append('title', title);
            formData.append('category', category);
            formData.append('size', `${Math.round(currentPhotoFile.size / 1024)} KB`);
            formData.append('idempotency_key', idempotencyKey);

            const res = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'X-Idempotency-Key': idempotencyKey },
              body: formData
            });
            const data = await res.json().catch(() => null);
            if (data && data.success) savedItem = data.media;
          }
        } else if (externalUrl) {
          // Path B: External image URL
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({
              type: 'photo',
              name: title,
              title: title,
              category: category,
              url: externalUrl,
              stream_url: externalUrl,
              size: 'HD Photo'
            })
          });
          const data = await res.json().catch(() => null);
          if (data && data.success) savedItem = data.media;
        }

        if (savedItem) {
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
          showMediaFeedback('✅ An saka hoton a Database da TV! Yanzu kowa zai iya gani a bainar jama\\'a.', true, 'photo');
          if (photoFileInput) photoFileInput.value = '';
          if (photoExternalUrlInput) photoExternalUrlInput.value = '';
          const nameEl = document.getElementById('photoSelectedName');
          if (nameEl) nameEl.style.display = 'none';
          currentPhotoFile = null;
          photoPreviewBox.style.display = 'none';
          photoTitleInput.value = '';
          await loadAdminMedia('photo');
          window.dispatchEvent(new CustomEvent('media-uploaded', { detail: savedItem }));
        } else {
          showMediaFeedback('❌ Kuskuren tura hoto zuwa server. Da fatan a sake gwadawa.', false, 'photo');
        }
      } catch (err) {
        showMediaFeedback('❌ Network error while uploading photo: ' + err.message, false, 'photo');
      } finally {
        isPublishingPhoto = false;
        uploadPhotoBtn.disabled = false;
        uploadPhotoBtn.textContent = '📸 Save & Upload Photo';
      }
    });
  }

"""
    content = content[:idx_start] + new_photo_block + content[idx_end:]
    print("Updated uploadPhotoBtn successfully.")
else:
    print(f"Warning: uploadPhotoBtn block boundaries not found! idx_start={idx_start}, idx_end={idx_end}")

# 3. Add isPublishingVideo guard to uploadVideoBtn
old_video_listener = "  if (uploadVideoBtn) {\n    uploadVideoBtn.addEventListener('click', async () => {"
new_video_listener = """  let isPublishingVideo = false;
  if (uploadVideoBtn) {
    uploadVideoBtn.addEventListener('click', async () => {
      if (isPublishingVideo) return;
      isPublishingVideo = true;"""

if old_video_listener in content:
    content = content.replace(old_video_listener, new_video_listener, 1)
    print("Added isPublishingVideo guard.")
else:
    print("Warning: old_video_listener not found!")

# Reset isPublishingVideo in resetUploadUI
old_reset_ui = "    if (uploadVideoBtn) {\n      uploadVideoBtn.disabled = false;\n      uploadVideoBtn.textContent = '🎥 Save & Upload Video';\n    }"
new_reset_ui = "    isPublishingVideo = false;\n    if (uploadVideoBtn) {\n      uploadVideoBtn.disabled = false;\n      uploadVideoBtn.textContent = '🎥 Save & Upload Video';\n    }"

if old_reset_ui in content:
    content = content.replace(old_reset_ui, new_reset_ui, 1)
    print("Added isPublishingVideo reset in resetUploadUI.")
else:
    print("Warning: old_reset_ui not found!")

# 4. Add isPublishingAudio guard to uploadAudioBtn
old_audio_listener = "  if (uploadAudioBtn) {\n    uploadAudioBtn.addEventListener('click', async () => {"
new_audio_listener = """  let isPublishingAudio = false;
  if (uploadAudioBtn) {
    uploadAudioBtn.addEventListener('click', async () => {
      if (isPublishingAudio) return;
      isPublishingAudio = true;"""

if old_audio_listener in content:
    content = content.replace(old_audio_listener, new_audio_listener, 1)
    print("Added isPublishingAudio guard.")
else:
    print("Warning: old_audio_listener not found!")

# Reset isPublishingAudio in audio finally
old_audio_finally = "      } finally {\n        uploadAudioBtn.disabled = false;\n        uploadAudioBtn.textContent = '🎙️ Save & Upload Voice Note';\n      }"
new_audio_finally = "      } finally {\n        isPublishingAudio = false;\n        uploadAudioBtn.disabled = false;\n        uploadAudioBtn.textContent = '🎙️ Save & Upload Voice Note';\n      }"

if old_audio_finally in content:
    content = content.replace(old_audio_finally, new_audio_finally, 1)
    print("Added isPublishingAudio reset in finally.")
else:
    print("Warning: old_audio_finally not found!")

with open('public/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("admin.js patching complete.")
