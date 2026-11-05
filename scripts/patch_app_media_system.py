# -*- coding: utf-8 -*-
with open('public/js/app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

# 1. Add playerInitialized check in setupVideoElement
old_setup_video_start = "  function setupVideoElement(videoEl, url) {\n    if (!videoEl || !url) return;"
new_setup_video_start = """  function setupVideoElement(videoEl, url) {
    if (!videoEl || !url) return;
    if (videoEl.dataset.playerInitialized === 'true') return;
    videoEl.dataset.playerInitialized = 'true';"""

if old_setup_video_start in app_content:
    app_content = app_content.replace(old_setup_video_start, new_setup_video_start, 1)
    print("[app.js] Added dataset.playerInitialized check in setupVideoElement.")
else:
    print("[app.js] Warning: old_setup_video_start not found!")

# 2. Update renderMediaItemHTML, initRenderedMedia, syncMediaGrid, renderPublicHomeMedia, renderTvMedia
block_start = "    if (m.type === 'photo') {"
block_end = "  // 4. Photo Lightbox Modal"

idx_start = app_content.find(block_start)
idx_end = app_content.find(block_end)

if idx_start != -1 and idx_end != -1:
    new_media_pipeline = """    const dedupKey = getMediaDeduplicationKey(m);

    if (m.type === 'photo') {
      return `
        <div class="public-media-card" data-media-id="${m.id || ''}" data-media-key="${escapeHtml(dedupKey)}">
          <div class="public-media-preview clickable-photo" data-photo-id="${m.id}" data-photo-title="${escapeHtml(m.name || 'Photo')}" data-photo-meta="${escapeHtml(displayCategory)} • ${createdDate}">
            <span class="public-media-badge" style="background:#0B162C; color:#FFFFFF;">${badgePhoto}</span>
            <img src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(m.name || 'Photo')}" loading="lazy" onerror="this.onerror=null; this.src='/images/logo.png';">
          </div>
          <div class="public-media-body">
            <h4 class="public-media-title">${escapeHtml(m.name || 'Photo')}</h4>
            <div class="public-media-meta">
              <span class="category-tag">${escapeHtml(displayCategory)}</span>
              <span>${createdDate}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (m.type === 'video') {
      // Check YouTube Embed
      const ytMatch = mediaUrl.match(/(?:youtube\\.com\\/(?:watch\\?v=|embed\\/)|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/i);
      if (ytMatch && ytMatch[1]) {
        return `
          <div class="public-media-card" data-media-id="${m.id || ''}" data-media-key="${escapeHtml(dedupKey)}">
            <div class="public-media-preview video-preview" style="height:260px;">
              <span class="public-media-badge" style="background:#FF0000; color:#FFFFFF;">YOUTUBE</span>
              <iframe src="https://www.youtube-nocookie.com/embed/${ytMatch[1]}?enablejsapi=1&rel=0&modestbranding=1" style="width:100%; height:100%; border:none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="public-media-body">
              <h4 class="public-media-title">${escapeHtml(m.name || 'Video')}</h4>
              <div class="public-media-meta">
                <span class="category-tag">${escapeHtml(m.category || 'Broadcast')}</span>
                <span>${createdDate}</span>
              </div>
            </div>
          </div>
        `;
      }

      // Check Facebook Video
      const isFb = /facebook\\.com|fb\\.watch/i.test(mediaUrl);
      if (isFb) {
        return `
          <div class="public-media-card" data-media-id="${m.id || ''}" data-media-key="${escapeHtml(dedupKey)}">
            <div class="public-media-preview video-preview" style="height:260px;">
              <span class="public-media-badge" style="background:#1877F2; color:#FFFFFF;">FACEBOOK</span>
              <iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(mediaUrl)}&show_text=0" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>
            </div>
            <div class="public-media-body">
              <h4 class="public-media-title">${escapeHtml(m.name || 'Video')}</h4>
              <div class="public-media-meta">
                <span class="category-tag">${escapeHtml(m.category || 'Broadcast')}</span>
                <span>${createdDate}</span>
              </div>
            </div>
          </div>
        `;
      }

      // Direct Video (HLS, MP4, WebM, /uploads/...)
      const customPoster = posterUrl ? `poster="${escapeHtml(posterUrl)}"` : '';
      return `
        <div class="public-media-card" data-media-id="${m.id || ''}" data-media-key="${escapeHtml(dedupKey)}">
          <div class="public-media-preview video-preview" style="background:#000000; border-radius:12px 12px 0 0; overflow:hidden;">
            <span class="public-media-badge" style="background:#D32F2F; color:#FFFFFF;">${badgeVideo}</span>
            <video controls playsinline webkit-playsinline preload="metadata" ${customPoster} data-video-src="${escapeHtml(mediaUrl)}" src="${escapeHtml(mediaUrl)}" style="width:100%; height:auto; max-height:70vh; object-fit:contain !important; background:#000000; display:block; outline:none;"></video>
          </div>
          <div class="public-media-body">
            <h4 class="public-media-title">${escapeHtml(m.name || 'Video')}</h4>
            <div class="public-media-meta">
              <span class="category-tag">${escapeHtml(m.category || 'Broadcast')}</span>
              <span>${createdDate}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (m.type === 'voicenote' || m.type === 'audio') {
      return `
        <div class="public-media-card voice-note-card" data-media-id="${m.id || ''}" data-media-key="${escapeHtml(dedupKey)}">
          <div class="public-media-preview voice-preview" style="height:140px; background:linear-gradient(135deg, #0B162C 0%, #172554 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:12px 12px 0 0;">
            <span class="public-media-badge" style="background:#C59B27; color:#0B162C; font-weight:800;">${badgeAudio}</span>
            <button class="voice-play-toggle-btn" aria-label="Play voice note" style="width:58px; height:58px; border-radius:50%; background:#C59B27; border:none; color:#0B162C; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 6px 18px rgba(197,155,39,0.35); transition:transform 0.15s ease, background 0.15s ease; outline:none; z-index:2;">
              <svg class="play-icon" width="26" height="26" viewBox="0 0 24 24" fill="#0B162C"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
              <svg class="pause-icon" width="26" height="26" viewBox="0 0 24 24" fill="#0B162C" style="display:none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            </button>
            <span style="color:#FBBF24; font-size:0.75rem; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; margin-top:8px;">${voiceNoteLabel}</span>
          </div>
          <div class="public-media-body" style="padding:14px;">
            <audio class="voice-audio-element" preload="metadata" playsinline src="${escapeHtml(mediaUrl)}" style="display:none;"></audio>
            <div class="voice-progress-container" style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
              <span class="voice-time-current" style="font-size:0.75rem; color:var(--text-muted); font-variant-numeric:tabular-nums; min-width:32px;">0:00</span>
              <div class="voice-timeline-track" style="flex:1; height:6px; background:rgba(255,255,255,0.14); border-radius:3px; position:relative; cursor:pointer;">
                <div class="voice-timeline-bar" style="width:0%; height:100%; background:#C59B27; border-radius:3px; transition:width 0.1s linear;"></div>
              </div>
              <span class="voice-time-duration" style="font-size:0.75rem; color:var(--text-muted); font-variant-numeric:tabular-nums; min-width:32px;">--:--</span>
            </div>
            <div class="voice-error-msg" style="display:none; color:#F87171; font-size:0.78rem; margin-bottom:6px;">⚠️ Ba a iya kunna wannan sautin ba (Audio unavailable)</div>
            <h4 class="public-media-title" style="margin:4px 0;">${escapeHtml(m.name || 'Voice Note')}</h4>
            <div class="public-media-meta">
              <span class="category-tag">${escapeHtml(m.category || 'Voice Note')}</span>
              <span>${createdDate}</span>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  function initRenderedMedia(container) {
    if (!container) return;

    // 1. Initialize video tags with HLS, adaptive aspect ratios, and mutual exclusive play
    const videos = container.querySelectorAll('video');
    videos.forEach(v => {
      const src = v.getAttribute('data-video-src') || v.getAttribute('src');
      if (src) setupVideoElement(v, src);

      if (!v.dataset.eventsBound) {
        v.dataset.eventsBound = 'true';
        v.addEventListener('play', () => {
          document.querySelectorAll('audio, video').forEach(media => {
            if (media !== v && !media.paused) media.pause();
          });
          if (typeof audio !== 'undefined' && audio && !audio.paused) {
            audio.pause();
            if (typeof setPlayerState === 'function') setPlayerState(false);
          }
        });
      }

      if (window.ARAB_HAUSA_MEDIA && window.ARAB_HAUSA_MEDIA.adaptVideoContainer) {
        v.addEventListener('loadedmetadata', function() {
          window.ARAB_HAUSA_MEDIA.adaptVideoContainer(this);
        });
        if (v.readyState >= 1) {
          window.ARAB_HAUSA_MEDIA.adaptVideoContainer(v);
        }
      }
    });

    // 2. Attach click handlers to photos for fullscreen lightbox
    const photos = container.querySelectorAll('.clickable-photo');
    photos.forEach(p => {
      if (p.dataset.lightboxBound) return;
      p.dataset.lightboxBound = 'true';
      p.addEventListener('click', () => {
        const img = p.querySelector('img');
        const url = (img && img.src) ? img.src : (p.getAttribute('data-photo-url') || '');
        const title = p.getAttribute('data-photo-title');
        const meta = p.getAttribute('data-photo-meta');
        openPhotoLightbox(url, title, meta);
      });
    });

    // 3. Initialize custom Voice Note Audio Player
    const voiceCards = container.querySelectorAll('.voice-note-card');
    voiceCards.forEach(card => {
      if (card.dataset.audioInitialized === 'true') return;
      card.dataset.audioInitialized = 'true';

      const audioEl = card.querySelector('.voice-audio-element');
      const toggleBtn = card.querySelector('.voice-play-toggle-btn');
      const playIcon = card.querySelector('.play-icon');
      const pauseIcon = card.querySelector('.pause-icon');
      const track = card.querySelector('.voice-timeline-track');
      const bar = card.querySelector('.voice-timeline-bar');
      const currTimeEl = card.querySelector('.voice-time-current');
      const durTimeEl = card.querySelector('.voice-time-duration');
      const errorEl = card.querySelector('.voice-error-msg');

      if (!audioEl || !toggleBtn) return;

      const formatTime = (secs) => {
        if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      };

      const setPlayingUI = (playing) => {
        if (playIcon) playIcon.style.display = playing ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = playing ? 'block' : 'none';
        if (toggleBtn) {
          toggleBtn.style.transform = playing ? 'scale(1.08)' : 'scale(1)';
          toggleBtn.style.background = playing ? '#EAB308' : '#C59B27';
        }
      };

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (audioEl.paused) {
          // Pause all other media
          document.querySelectorAll('audio, video').forEach(m => {
            if (m !== audioEl && !m.paused) m.pause();
          });
          if (typeof audio !== 'undefined' && audio && !audio.paused) {
            audio.pause();
            if (typeof setPlayerState === 'function') setPlayerState(false);
          }
          audioEl.play().then(() => {
            setPlayingUI(true);
            if (errorEl) errorEl.style.display = 'none';
          }).catch(err => {
            console.warn('Audio play error:', err);
            if (errorEl) errorEl.style.display = 'block';
            setPlayingUI(false);
          });
        } else {
          audioEl.pause();
          setPlayingUI(false);
        }
      });

      audioEl.addEventListener('play', () => setPlayingUI(true));
      audioEl.addEventListener('pause', () => setPlayingUI(false));
      audioEl.addEventListener('ended', () => {
        setPlayingUI(false);
        if (bar) bar.style.width = '0%';
        if (currTimeEl) currTimeEl.textContent = '0:00';
      });

      audioEl.addEventListener('timeupdate', () => {
        if (!audioEl.duration) return;
        const pct = Math.min(100, (audioEl.currentTime / audioEl.duration) * 100);
        if (bar) bar.style.width = `${pct}%`;
        if (currTimeEl) currTimeEl.textContent = formatTime(audioEl.currentTime);
      });

      audioEl.addEventListener('loadedmetadata', () => {
        if (durTimeEl && audioEl.duration && isFinite(audioEl.duration)) {
          durTimeEl.textContent = formatTime(audioEl.duration);
        }
      });
      if (audioEl.readyState >= 1 && audioEl.duration && isFinite(audioEl.duration)) {
        if (durTimeEl) durTimeEl.textContent = formatTime(audioEl.duration);
      }

      audioEl.addEventListener('error', () => {
        if (errorEl) errorEl.style.display = 'block';
        setPlayingUI(false);
      });

      if (track) {
        track.addEventListener('click', (e) => {
          e.stopPropagation();
          const rect = track.getBoundingClientRect();
          const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          if (audioEl.duration && isFinite(audioEl.duration)) {
            audioEl.currentTime = clickPos * audioEl.duration;
            if (bar) bar.style.width = `${clickPos * 100}%`;
            if (currTimeEl) currTimeEl.textContent = formatTime(audioEl.currentTime);
          }
        });
      }
    });
  }

  // Surgical Non-Destructive DOM Reconciliation
  function syncMediaGrid(container, items) {
    if (!container) return;
    container.querySelectorAll('.skeleton-card').forEach(s => s.remove());

    const lang = getActiveLanguage();
    if (!items || items.length === 0) {
      const emptyText = (window.translations && window.translations[lang] && window.translations[lang].noMedia) 
        || (lang === 'en' ? 'No media uploads found in this category yet.' : 'Babu hotuna ko bidiyo da aka wallafa a wannan rukunin tukuna.');
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; padding:16px; text-align:center; grid-column:1/-1;">${emptyText}</p>`;
      return;
    }

    const emptyP = container.querySelector('p');
    if (emptyP && container.children.length === 1 && !emptyP.classList.contains('public-media-card')) {
      emptyP.remove();
    }

    const existingCards = Array.from(container.querySelectorAll('.public-media-card'));

    // Initial mount if empty
    if (existingCards.length === 0) {
      container.innerHTML = items.map(m => renderMediaItemHTML(m)).join('');
      initRenderedMedia(container);
      return;
    }

    // Collect currently mounted keys and IDs
    const mountedKeySet = new Set();
    existingCards.forEach(c => {
      const k = c.getAttribute('data-media-key');
      const id = c.getAttribute('data-media-id');
      if (k) mountedKeySet.add(k);
      if (id) mountedKeySet.add(id);
    });

    // Check for genuinely new items (not yet mounted)
    const newItemsToPrepend = [];
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const key = getMediaDeduplicationKey(item);
      const idStr = String(item.id || '');
      if (!mountedKeySet.has(key) && !mountedKeySet.has(idStr)) {
        newItemsToPrepend.unshift(item);
        mountedKeySet.add(key);
        if (idStr) mountedKeySet.add(idStr);
      }
    }

    if (newItemsToPrepend.length > 0) {
      const newHtml = newItemsToPrepend.map(m => renderMediaItemHTML(m)).join('');
      container.insertAdjacentHTML('afterbegin', newHtml);
      initRenderedMedia(container);
    }

    // Check for deleted items
    const validKeySet = new Set(items.map(m => getMediaDeduplicationKey(m)));
    const validIdSet = new Set(items.map(m => String(m.id || '')));
    existingCards.forEach(c => {
      const cardKey = c.getAttribute('data-media-key');
      const cardId = c.getAttribute('data-media-id');
      if (cardKey && !validKeySet.has(cardKey) && (!cardId || !validIdSet.has(cardId))) {
        c.remove();
      }
    });
  }

  function renderPublicHomeMedia(filterType = 'all') {
    if (!homeMediaGrid) return;
    const items = filterType === 'all' 
      ? publicMediaItems 
      : publicMediaItems.filter(m => {
          if (filterType === 'voicenote' || filterType === 'audio') {
            return m.type === 'voicenote' || m.type === 'audio';
          }
          return m.type === filterType;
        });
    syncMediaGrid(homeMediaGrid, items);
  }

  function renderTvMedia() {
    const tvMediaGrid = document.getElementById('tvMediaGrid');
    if (!tvMediaGrid) return;
    const media = publicMediaItems.filter(m => m.type === 'video' || m.type === 'photo');
    syncMediaGrid(tvMediaGrid, media);
  }

"""
    app_content = app_content[:idx_start] + new_media_pipeline + app_content[idx_end:]
    print("[app.js] Successfully upgraded media rendering, player, and sync pipeline.")
    with open('public/js/app.js', 'w', encoding='utf-8') as f:
        f.write(app_content)
else:
    print(f"[app.js] Warning: block boundaries not found! start={idx_start}, end={idx_end}")

print("Finished updating app.js.")
