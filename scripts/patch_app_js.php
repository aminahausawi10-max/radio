<?php
$file = __DIR__ . '/../public/js/app.js';
$content = file_get_contents($file);
$contentNorm = str_replace("\r\n", "\n", $content);

// 1. Remove defaultPublicMedia mock
$oldDefaultMedia = '  const defaultPublicMedia = [
    {
      id: 1,
      type: "video",
      name: "Arab Hausa TV HD Live Feed",
      category: "TV Broadcast",
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      stream_url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      size: "HD Live Stream",
      created_at: "2026-10-30T12:00:00.000Z"
    }
  ];
  let publicMediaItems = [...defaultPublicMedia];';

$newDefaultMedia = '  let publicMediaItems = [];

  function getActiveMediaFilter() {
    const activeBtn = document.querySelector(\'.public-filter-btn.active[data-media-filter]\');
    return activeBtn ? (activeBtn.getAttribute(\'data-media-filter\') || \'all\') : \'all\';
  }';

if (strpos($contentNorm, $oldDefaultMedia) !== false) {
    $contentNorm = str_replace($oldDefaultMedia, $newDefaultMedia, $contentNorm);
    echo "1. Replaced defaultPublicMedia\n";
} else {
    echo "1. defaultPublicMedia pattern not found\n";
}

// 2. Replace mergeMediaList and loadPublicMedia
$oldMergeAndLoad = '  function mergeMediaList(newItems, filterType = \'all\') {
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
      localStorage.setItem(\'arab_hausa_uploaded_media\', JSON.stringify(publicMediaItems));
    } catch(e) {}

    renderPublicHomeMedia(filterType);
    renderTvMedia();
  }

  window.retryLoadPublicMedia = function() {
    loadPublicMedia();
  };

  async function loadPublicMedia(filterType = \'all\') {
    // 1. Instant Cache Render: 0ms immediate display on page load/refresh from synchronous storage
    let localItems = [];
    try {
      const lsRaw = localStorage.getItem(\'arab_hausa_uploaded_media\');
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
        apiFetch(\'upload?t=\' + Date.now(), { timeout: 4000 }),
        fetchWithTimeout(\'/api/media?t=\' + Date.now(), { cache: \'no-store\' }, 4000).then(r => r && r.ok ? r.json() : null),
        fetchWithTimeout(\'/data/media.json?t=\' + Date.now(), { cache: \'no-store\' }, 2000).then(r => r && r.ok ? r.json() : null)
      ]);

      let serverItems = [];
      if (uploadRes.status === \'fulfilled\' && uploadRes.value && Array.isArray(uploadRes.value.media)) {
        serverItems = serverItems.concat(uploadRes.value.media);
      }
      if (mediaRes.status === \'fulfilled\' && Array.isArray(mediaRes.value) && mediaRes.value.length > 0) {
        mediaRes.value.forEach(item => {
          serverItems.push({
            id: item.id,
            type: (item.type || item.media_type || \'photo\').toLowerCase(),
            name: item.name || item.title,
            title: item.title || item.name,
            category: item.category || item.caption || \'Media\',
            caption: item.caption || item.category || \'Media\',
            url: item.url || item.stream_url,
            stream_url: item.stream_url || item.url,
            poster_url: item.poster_url || \'\',
            size: item.size || \'HD Media\',
            created_at: item.created_at
          });
        });
      }
      if (staticRes.status === \'fulfilled\' && Array.isArray(staticRes.value) && staticRes.value.length > 0) {
        serverItems = serverItems.concat(staticRes.value);
      }

      if (serverItems.length > 0) {
        mergeMediaList(serverItems, filterType);
      } else if (publicMediaItems.length === 0) {
        fetchFailed = uploadRes.status === \'rejected\' && mediaRes.status === \'rejected\';
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
  }';

$newMergeAndLoad = '  function mergeMediaList(newItems, filterType = null) {
    if (!Array.isArray(newItems)) return;
    const activeFilter = filterType || getActiveMediaFilter();

    // Server database is the authoritative permanent source of truth
    const serverMap = new Map();
    newItems.forEach(m => {
      if (isValidPublicMedia(m)) {
        serverMap.set(getMediaDeduplicationKey(m), m);
      }
    });

    // Chronological order (newest first)
    publicMediaItems = Array.from(serverMap.values())
      .filter(isValidPublicMedia)
      .sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime() || (Number(a.id) || 0);
        const timeB = new Date(b.created_at || 0).getTime() || (Number(b.id) || 0);
        return timeB - timeA;
      });

    try {
      localStorage.setItem(\'arab_hausa_uploaded_media\', JSON.stringify(publicMediaItems));
    } catch(e) {}

    renderPublicHomeMedia(activeFilter);
    renderTvMedia();
  }

  window.retryLoadPublicMedia = function() {
    loadPublicMedia();
  };

  async function loadPublicMedia(filterType = null) {
    const currentFilter = filterType || getActiveMediaFilter();

    // 1. Instant Cache Render: 0ms immediate display on page load/refresh from synchronous storage
    let localItems = [];
    try {
      const lsRaw = localStorage.getItem(\'arab_hausa_uploaded_media\');
      if (lsRaw) localItems = JSON.parse(lsRaw);
    } catch (e) {}

    if (Array.isArray(localItems) && localItems.length > 0) {
      publicMediaItems = localItems.filter(isValidPublicMedia).sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime() || (Number(a.id) || 0);
        const timeB = new Date(b.created_at || 0).getTime() || (Number(b.id) || 0);
        return timeB - timeA;
      });
      renderPublicHomeMedia(currentFilter);
      renderTvMedia();
    }

    // 2. Fetch from Permanent Database via /api/upload and /api/media
    let fetchFailed = false;
    try {
      const [uploadRes, mediaRes, staticRes] = await Promise.allSettled([
        apiFetch(\'upload?t=\' + Date.now(), { timeout: 4500 }),
        fetchWithTimeout(\'/api/media?t=\' + Date.now(), { cache: \'no-store\' }, 4500).then(r => r && r.ok ? r.json() : null),
        fetchWithTimeout(\'/data/media.json?t=\' + Date.now(), { cache: \'no-store\' }, 2500).then(r => r && r.ok ? r.json() : null)
      ]);

      let serverItems = [];
      if (uploadRes.status === \'fulfilled\' && uploadRes.value && Array.isArray(uploadRes.value.media)) {
        serverItems = serverItems.concat(uploadRes.value.media);
      }
      if (mediaRes.status === \'fulfilled\' && Array.isArray(mediaRes.value) && mediaRes.value.length > 0) {
        mediaRes.value.forEach(item => {
          serverItems.push({
            id: item.id,
            type: (item.type || item.media_type || \'photo\').toLowerCase(),
            name: item.name || item.title,
            title: item.title || item.name,
            category: item.category || item.caption || \'Media\',
            caption: item.caption || item.category || \'Media\',
            url: item.url || item.stream_url,
            stream_url: item.stream_url || item.url,
            poster_url: item.poster_url || \'\',
            size: item.size || \'HD Media\',
            created_at: item.created_at
          });
        });
      }
      if (staticRes.status === \'fulfilled\' && Array.isArray(staticRes.value) && staticRes.value.length > 0) {
        serverItems = serverItems.concat(staticRes.value);
      }

      if (serverItems.length > 0) {
        mergeMediaList(serverItems, currentFilter);
      } else if (publicMediaItems.length === 0) {
        fetchFailed = (uploadRes.status === \'rejected\' || !uploadRes.value) && (mediaRes.status === \'rejected\' || !mediaRes.value);
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
        renderPublicHomeMedia(currentFilter);
        renderTvMedia();
      }
    }
  }';

if (strpos($contentNorm, $oldMergeAndLoad) !== false) {
    $contentNorm = str_replace($oldMergeAndLoad, $newMergeAndLoad, $contentNorm);
    echo "2. Replaced mergeMediaList & loadPublicMedia\n";
} else {
    echo "2. mergeMediaList & loadPublicMedia pattern not found\n";
}

// 3. Replace syncMediaGrid
$oldSyncMediaGrid = '  // Surgical Non-Destructive DOM Reconciliation
  function syncMediaGrid(container, items) {
    if (!container) return;
    container.querySelectorAll(\'.skeleton-card\').forEach(s => s.remove());

    const lang = getActiveLanguage();
    if (!items || items.length === 0) {
      const emptyText = (window.translations && window.translations[lang] && window.translations[lang].noMedia) 
        || (lang === \'en\' ? \'No media uploads found in this category yet.\' : \'Babu hotuna ko bidiyo da aka wallafa a wannan rukunin tukuna.\');
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; padding:16px; text-align:center; grid-column:1/-1;">${emptyText}</p>`;
      return;
    }

    const emptyP = container.querySelector(\'p\');
    if (emptyP && container.children.length === 1 && !emptyP.classList.contains(\'public-media-card\')) {
      emptyP.remove();
    }

    const existingCards = Array.from(container.querySelectorAll(\'.public-media-card\'));

    // Initial mount if empty
    if (existingCards.length === 0) {
      container.innerHTML = items.map(m => renderMediaItemHTML(m)).join(\'\');
      initRenderedMedia(container);
      return;
    }

    // Collect currently mounted keys and IDs
    const mountedKeySet = new Set();
    existingCards.forEach(c => {
      const k = c.getAttribute(\'data-media-key\');
      const id = c.getAttribute(\'data-media-id\');
      if (k) mountedKeySet.add(k);
      if (id) mountedKeySet.add(id);
    });

    // Check for genuinely new items (not yet mounted)
    const newItemsToPrepend = [];
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const key = getMediaDeduplicationKey(item);
      const idStr = String(item.id || \'\');
      if (!mountedKeySet.has(key) && !mountedKeySet.has(idStr)) {
        newItemsToPrepend.unshift(item);
        mountedKeySet.add(key);
        if (idStr) mountedKeySet.add(idStr);
      }
    }

    if (newItemsToPrepend.length > 0) {
      const newHtml = newItemsToPrepend.map(m => renderMediaItemHTML(m)).join(\'\');
      container.insertAdjacentHTML(\'afterbegin\', newHtml);
      initRenderedMedia(container);
    }

    // Check for deleted items
    const validKeySet = new Set(items.map(m => getMediaDeduplicationKey(m)));
    const validIdSet = new Set(items.map(m => String(m.id || \'\')));
    existingCards.forEach(c => {
      const cardKey = c.getAttribute(\'data-media-key\');
      const cardId = c.getAttribute(\'data-media-id\');
      if (cardKey && !validKeySet.has(cardKey) && (!cardId || !validIdSet.has(cardId))) {
        c.remove();
      }
    });
  }';

$newSyncMediaGrid = '  function isAnyMediaPlaying(container) {
    if (!container) return false;
    const videos = container.querySelectorAll(\'video\');
    for (const v of videos) {
      if (!v.paused && !v.ended && v.currentTime > 0) return true;
    }
    const audios = container.querySelectorAll(\'audio\');
    for (const a of audios) {
      if (!a.paused && !a.ended && a.currentTime > 0) return true;
    }
    return false;
  }

  // Surgical Non-Destructive DOM Reconciliation (Preserves active playback while guaranteeing exact DB catalog)
  function syncMediaGrid(container, items) {
    if (!container) return;
    container.querySelectorAll(\'.skeleton-card\').forEach(s => s.remove());

    const lang = getActiveLanguage();
    if (!items || items.length === 0) {
      const emptyText = (window.translations && window.translations[lang] && window.translations[lang].noMedia) 
        || (lang === \'en\' ? \'No media uploads found in this category yet.\' : \'Babu hotuna ko bidiyo da aka wallafa a wannan rukunin tukuna.\');
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; padding:16px; text-align:center; grid-column:1/-1;">${emptyText}</p>`;
      return;
    }

    const emptyP = container.querySelector(\'p\');
    if (emptyP && container.children.length === 1 && !emptyP.classList.contains(\'public-media-card\')) {
      emptyP.remove();
    }

    const existingCards = Array.from(container.querySelectorAll(\'.public-media-card\'));
    const hasUnmanagedCard = existingCards.some(c => !c.getAttribute(\'data-media-key\'));

    // Full clean reconciliation if fresh mount, unmanaged cards present, or no media actively playing
    if (existingCards.length === 0 || hasUnmanagedCard || !isAnyMediaPlaying(container)) {
      const targetKeys = items.map(m => getMediaDeduplicationKey(m)).join(\'|\');
      const currentKeys = existingCards.map(c => c.getAttribute(\'data-media-key\') || \'\').join(\'|\');
      if (targetKeys !== currentKeys || hasUnmanagedCard) {
        container.innerHTML = items.map(m => renderMediaItemHTML(m)).join(\'\');
        initRenderedMedia(container);
      }
      return;
    }

    // Media is actively playing: Surgical non-destructive DOM reconciliation
    const mountedKeySet = new Set();
    existingCards.forEach(c => {
      const k = c.getAttribute(\'data-media-key\');
      const id = c.getAttribute(\'data-media-id\');
      if (k) mountedKeySet.add(k);
      if (id) mountedKeySet.add(id);
    });

    const newItemsToPrepend = [];
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const key = getMediaDeduplicationKey(item);
      const idStr = String(item.id || \'\');
      if (!mountedKeySet.has(key) && !mountedKeySet.has(idStr)) {
        newItemsToPrepend.unshift(item);
        mountedKeySet.add(key);
        if (idStr) mountedKeySet.add(idStr);
      }
    }

    if (newItemsToPrepend.length > 0) {
      const newHtml = newItemsToPrepend.map(m => renderMediaItemHTML(m)).join(\'\');
      container.insertAdjacentHTML(\'afterbegin\', newHtml);
      initRenderedMedia(container);
    }

    const validKeySet = new Set(items.map(m => getMediaDeduplicationKey(m)));
    const validIdSet = new Set(items.map(m => String(m.id || \'\')));
    existingCards.forEach(c => {
      const cardKey = c.getAttribute(\'data-media-key\');
      const cardId = c.getAttribute(\'data-media-id\');
      if (cardKey && !validKeySet.has(cardKey) && (!cardId || !validIdSet.has(cardId))) {
        c.remove();
      }
    });
  }';

if (strpos($contentNorm, $oldSyncMediaGrid) !== false) {
    $contentNorm = str_replace($oldSyncMediaGrid, $newSyncMediaGrid, $contentNorm);
    echo "3. Replaced syncMediaGrid\n";
} else {
    echo "3. syncMediaGrid pattern not found\n";
}

$contentFinal = str_replace("\n", "\r\n", $contentNorm);
file_put_contents($file, $contentFinal);
echo "Finished updating public/js/app.js\n";
