# -*- coding: utf-8 -*-
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace mergeMediaList and loadPublicMedia with deduplicated, robust version
old_merge_and_load = """  function mergeMediaList(newItems, filterType = 'all') {
    if (!Array.isArray(newItems) || newItems.length === 0) return;
    const mediaMap = new Map();
    (publicMediaItems || []).forEach(m => {
      if (isValidPublicMedia(m)) {
        const key = String(m.id || m.url || m.name);
        mediaMap.set(key, m);
      }
    });
    newItems.forEach(m => {
      if (isValidPublicMedia(m)) {
        const key = String(m.id || m.url || m.name);
        mediaMap.set(key, m);
      }
    });
    publicMediaItems = Array.from(mediaMap.values()).filter(isValidPublicMedia).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    try {
      localStorage.setItem('arab_hausa_uploaded_media', JSON.stringify(publicMediaItems));
    } catch(e) {}
    renderPublicHomeMedia(filterType);
    renderTvMedia();
  }

  async function loadPublicMedia(filterType = 'all') {
    // 1. Instant Cache Render: 0ms immediate display on page load/refresh from synchronous storage
    let localItems = [];
    try {
      const lsRaw = localStorage.getItem('arab_hausa_uploaded_media');
      if (lsRaw) localItems = JSON.parse(lsRaw);
    } catch (e) {}

    if (Array.isArray(localItems) && localItems.length > 0) {
      publicMediaItems = localItems.filter(isValidPublicMedia).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      renderPublicHomeMedia(filterType);
      renderTvMedia();
    }

    // 2. Instant Static Feed (/data/media.json is served directly by Apache in 2ms with zero PHP load)
    try {
      const sRes = await fetchWithTimeout('/data/media.json?t=' + Date.now(), 2000);
      if (sRes && sRes.ok) {
        const staticList = await sRes.json().catch(() => null);
        if (Array.isArray(staticList) && staticList.length > 0) {
          mergeMediaList(staticList, filterType);
        }
      }
    } catch (e) {}

    // 3. Dynamic Backend Verification with fast 3.5s timeout (never blocks page render)
    try {
      const [uploadRes, mediaRes] = await Promise.allSettled([
        apiFetch('upload?t=' + Date.now(), { timeout: 3500 }),
        fetchWithTimeout('/api/media?t=' + Date.now(), { cache: 'no-store' }, 3500).then(r => r && r.ok ? r.json() : null)
      ]);

      let serverItems = [];
      if (uploadRes.status === 'fulfilled' && uploadRes.value && Array.isArray(uploadRes.value.media)) {
        serverItems = serverItems.concat(uploadRes.value.media);
      }
      if (mediaRes.status === 'fulfilled' && Array.isArray(mediaRes.value) && mediaRes.value.length > 0) {
        mediaRes.value.forEach(item => {
          serverItems.push({
            id: item.id,
            type: (item.media_type || 'photo').toLowerCase(),
            name: item.title,
            category: item.caption || 'Media',
            url: item.url,
            stream_url: item.url,
            poster_url: item.poster_url || '',
            size: 'HD Media',
            created_at: item.created_at
          });
        });
      }
      if (serverItems.length > 0) {
        mergeMediaList(serverItems, filterType);
      }
    } catch (e) {}

    // If still empty after all attempts, ensure skeleton placeholders are cleared cleanly
    if (publicMediaItems.length === 0) {
      renderPublicHomeMedia(filterType);
      renderTvMedia();
    }
  }"""

new_merge_and_load = """  // Deduplication Key Generator: Strict URL keying guarantees no duplicate cards across local & DB items
  function getMediaDeduplicationKey(m) {
    if (!m) return '';
    const u = (m.url || m.stream_url || '').trim().toLowerCase();
    if (u) return 'url:' + u;
    return 'id:' + String(m.id || m.name || Math.random());
  }

  function mergeMediaList(newItems, filterType = 'all') {
    if (!Array.isArray(newItems) || newItems.length === 0) return;
    const mediaMap = new Map();

    (publicMediaItems || []).forEach(m => {
      if (isValidPublicMedia(m)) {
        mediaMap.set(getMediaDeduplicationKey(m), m);
      }
    });

    newItems.forEach(m => {
      if (isValidPublicMedia(m)) {
        const key = getMediaDeduplicationKey(m);
        const existing = mediaMap.get(key);
        if (existing) {
          // Merge, giving priority to database-saved metadata while keeping valid playback details
          mediaMap.set(key, { ...existing, ...m });
        } else {
          mediaMap.set(key, m);
        }
      }
    });

    // Reverse chronological order (newest first)
    publicMediaItems = Array.from(mediaMap.values())
      .filter(isValidPublicMedia)
      .sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime() || (Number(a.id) || 0);
        const timeB = new Date(b.created_at || 0).getTime() || (Number(b.id) || 0);
        return timeB - timeA;
      });

    try {
      localStorage.setItem('arab_hausa_uploaded_media', JSON.stringify(publicMediaItems));
    } catch(e) {}

    renderPublicHomeMedia(filterType);
    renderTvMedia();
  }

  window.retryLoadPublicMedia = function() {
    loadPublicMedia();
  };

  async function loadPublicMedia(filterType = 'all') {
    // 1. Instant Cache Render: 0ms immediate display on page load/refresh from synchronous storage
    let localItems = [];
    try {
      const lsRaw = localStorage.getItem('arab_hausa_uploaded_media');
      if (lsRaw) localItems = JSON.parse(lsRaw);
    } catch (e) {}

    if (Array.isArray(localItems) && localItems.length > 0) {
      publicMediaItems = localItems.filter(isValidPublicMedia).sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime() || (Number(a.id) || 0);
        const timeB = new Date(b.created_at || 0).getTime() || (Number(b.id) || 0);
        return timeB - timeA;
      });
      renderPublicHomeMedia(filterType);
      renderTvMedia();
    }

    // 2. Fetch from Permanent Database via /api/upload and /api/media
    let fetchFailed = false;
    try {
      const [uploadRes, mediaRes, staticRes] = await Promise.allSettled([
        apiFetch('upload?t=' + Date.now(), { timeout: 4000 }),
        fetchWithTimeout('/api/media?t=' + Date.now(), { cache: 'no-store' }, 4000).then(r => r && r.ok ? r.json() : null),
        fetchWithTimeout('/data/media.json?t=' + Date.now(), { cache: 'no-store' }, 2000).then(r => r && r.ok ? r.json() : null)
      ]);

      let serverItems = [];
      if (uploadRes.status === 'fulfilled' && uploadRes.value && Array.isArray(uploadRes.value.media)) {
        serverItems = serverItems.concat(uploadRes.value.media);
      }
      if (mediaRes.status === 'fulfilled' && Array.isArray(mediaRes.value) && mediaRes.value.length > 0) {
        mediaRes.value.forEach(item => {
          serverItems.push({
            id: item.id,
            type: (item.type || item.media_type || 'photo').toLowerCase(),
            name: item.name || item.title,
            title: item.title || item.name,
            category: item.category || item.caption || 'Media',
            caption: item.caption || item.category || 'Media',
            url: item.url || item.stream_url,
            stream_url: item.stream_url || item.url,
            poster_url: item.poster_url || '',
            size: item.size || 'HD Media',
            created_at: item.created_at
          });
        });
      }
      if (staticRes.status === 'fulfilled' && Array.isArray(staticRes.value) && staticRes.value.length > 0) {
        serverItems = serverItems.concat(staticRes.value);
      }

      if (serverItems.length > 0) {
        mergeMediaList(serverItems, filterType);
      } else if (publicMediaItems.length === 0) {
        fetchFailed = uploadRes.status === 'rejected' && mediaRes.status === 'rejected';
      }
    } catch (e) {
      if (publicMediaItems.length === 0) fetchFailed = true;
    }

    // 3. Render state: If empty after all attempts, show clean empty state or retry button
    if (publicMediaItems.length === 0) {
      if (fetchFailed) {
        if (homeMediaGrid) {
          homeMediaGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 28px 16px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.15);">
              <p style="color: #F87171; font-size: 0.95rem; margin-bottom: 12px; font-weight: 600;">⚠️ Ba a iya loda kafofin watsa labarai daga Database ba.</p>
              <button onclick="window.retryLoadPublicMedia()" class="btn-primary" style="padding: 8px 20px; border-radius: 20px; font-size: 0.85rem; cursor: pointer;">🔄 Gwada Sake (Retry)</button>
            </div>
          `;
        }
      } else {
        renderPublicHomeMedia(filterType);
        renderTvMedia();
      }
    }
  }"""

if old_merge_and_load in content:
    content = content.replace(old_merge_and_load, new_merge_and_load, 1)
    print("Successfully replaced mergeMediaList and loadPublicMedia in app.js")
    with open('public/js/app.js', 'w', encoding='utf-8') as f:
        f.write(content)
else:
    print("Warning: old_merge_and_load block not matched in app.js!")
