/**
 * Arab Hausa Radio TV - Main Application Engine (Liquid Glass v7)
 * Multi-Page View Controller: Home, Radio, Live TV, Schedule, News
 */

document.addEventListener('DOMContentLoaded', () => {
  // Audio Player Elements
  const audio = new Audio();
  audio.preload = 'none';

  // Radio Page Elements
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const radioDisc = document.getElementById('radioDisc');
  const visualizer = document.getElementById('visualizerBox');
  const volumeSlider = document.getElementById('volumeSlider');
  const currentShowText = document.getElementById('currentShowText');
  const hostText = document.getElementById('hostText');
  const radioStatusBadge = document.getElementById('radioStatusBadge');
  const dataModeToggle = document.getElementById('dataModeToggle');
  const settingDataModeToggle = document.getElementById('settingDataModeToggle');

  // Home Page Elements
  const homeMiniPlayBtn = document.getElementById('homeMiniPlayBtn');
  const homePlayIcon = document.getElementById('homePlayIcon');
  const homePauseIcon = document.getElementById('homePauseIcon');
  const homeDiscThumb = document.getElementById('homeDiscThumb');
  const homeVisualizer = document.getElementById('homeVisualizer');
  const homeShowTitle = document.getElementById('homeShowTitle');
  const homeHostTitle = document.getElementById('homeHostTitle');
  const homeOnAirBadge = document.getElementById('homeOnAirBadge');
  const homeOpenFullRadioBtn = document.getElementById('homeOpenFullRadioBtn');
  const homeViewScheduleBtn = document.getElementById('homeViewScheduleBtn');
  const homeViewNewsBtn = document.getElementById('homeViewNewsBtn');
  const homeNewsPreviewGrid = document.getElementById('homeNewsPreviewGrid');
  const likeStationBtn = document.getElementById('likeStationBtn');
  const likeCountText = document.getElementById('likeCountText');
  const likeHeartIcon = document.getElementById('likeHeartIcon');

  // Video TV Elements
  const tvPlayer = document.getElementById('tvVideoPlayer');

  // Dynamic Content Containers
  const tickerText = document.getElementById('tickerMarquee');
  const scheduleContainer = document.getElementById('scheduleGrid');
  const newsContainer = document.getElementById('newsGrid');

  let currentStreamUrl = 'https://stream.zeno.fm/4wvy4w9612zuv';
  let fallbackStreamUrl = 'https://icecast.broadcast.com/live.aac';
  let isPlaying = false;
  let isLowData = false;

  // 1. PAGE ROUTER / MULTI-PAGE SWITCHER
  const pages = {
    home: document.getElementById('page-home'),
    radio: document.getElementById('page-radio'),
    tv: document.getElementById('page-tv'),
    schedule: document.getElementById('page-schedule'),
    news: document.getElementById('page-news')
  };

  const navItems = document.querySelectorAll('.bottom-nav-item');

  function navigateToPage(pageName) {
    if (!pages[pageName]) pageName = 'home';

    // Switch active page
    Object.keys(pages).forEach(key => {
      if (pages[key]) {
        if (key === pageName) {
          pages[key].classList.add('active');
        } else {
          pages[key].classList.remove('active');
        }
      }
    });

    // Update bottom nav active indicator
    navItems.forEach(item => {
      if (item.getAttribute('data-page') === pageName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update hash without triggering reload
    history.replaceState(null, null, `#${pageName}`);

    // Refresh database feeds when user navigates so new uploads appear immediately
    if (pageName === 'home' || pageName === 'tv') {
      loadPublicMedia();
    }
    if (pageName === 'news' || pageName === 'home') {
      loadNews();
    }
    if (pageName === 'schedule') {
      loadSchedule();
    }
    if (pageName === 'tv') {
      setupLiveTvPlayer();
      renderTvMedia();
    }
  }

  // Hook up bottom navigation clicks
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = item.getAttribute('data-page');
      navigateToPage(targetPage);
    });
  });

  // Quick Action Buttons on Home page
  const homeGoRadioBtn = document.getElementById('homeGoRadioBtn');
  if (homeGoRadioBtn) {
    homeGoRadioBtn.addEventListener('click', () => {
      navigateToPage('radio');
      if (!isPlaying) toggleRadio();
    });
  }

  const homeGoTvBtn = document.getElementById('homeGoTvBtn');
  if (homeGoTvBtn) {
    homeGoTvBtn.addEventListener('click', () => navigateToPage('tv'));
  }

  const homeTopWatchTvBtn = document.getElementById('homeTopWatchTvBtn');
  if (homeTopWatchTvBtn) {
    homeTopWatchTvBtn.addEventListener('click', () => navigateToPage('tv'));
  }

  if (homeOpenFullRadioBtn) {
    homeOpenFullRadioBtn.addEventListener('click', () => {
      navigateToPage('radio');
      if (!isPlaying) toggleRadio();
    });
  }

  if (homeViewScheduleBtn) {
    homeViewScheduleBtn.addEventListener('click', () => navigateToPage('schedule'));
  }

  if (homeViewNewsBtn) {
    homeViewNewsBtn.addEventListener('click', () => navigateToPage('news'));
  }

  // Brand Header Logo click goes to Home
  const brandHomeBtn = document.getElementById('brandHomeBtn');
  if (brandHomeBtn) {
    brandHomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPage('home');
    });
  }

  // Handle initial page load from hash
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && pages[initialHash]) {
    navigateToPage(initialHash);
  } else {
    navigateToPage('home');
  }

  window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '') || 'home';
    if (pages[hash]) navigateToPage(hash);
  });

  // Resilient API Fetch Helper with automatic PHP fallback
  async function apiFetch(endpoint, options = {}) {
    try {
      const res = await fetch(`/api/${endpoint}`, options);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success) return data;
      }
    } catch (e) {}

    try {
      const phpEndpoint = endpoint.includes('?') ? endpoint.replace('?', '.php?') : `${endpoint}.php`;
      const resPhp = await fetch(`/api-php/${phpEndpoint}`, options);
      if (resPhp.ok) {
        const dataPhp = await resPhp.json().catch(() => null);
        if (dataPhp && dataPhp.success) return dataPhp;
      }
    } catch (e) {}

    return null;
  }

  // 2. Fetch Station Settings & Stream URLs (Multi-Language Aware)
  async function loadSettings() {
    try {
      const data = await apiFetch('settings?t=' + Date.now());
      if (data && data.success && data.settings) {
        const s = data.settings;
        if (s.radio_stream_url) currentStreamUrl = s.radio_stream_url;
        if (s.radio_fallback_url) fallbackStreamUrl = s.radio_fallback_url;
        
        const lang = getActiveLanguage();
        const t = (window.translations && window.translations[lang]) || {};

        if (s.current_show) {
          if (lang === 'ha') {
            if (currentShowText) currentShowText.textContent = s.current_show;
            if (homeShowTitle) homeShowTitle.textContent = s.current_show;
          } else {
            const localizedShow = t.heroShowTitle || t.show1Title || s.current_show;
            if (currentShowText) currentShowText.textContent = localizedShow;
            if (homeShowTitle) homeShowTitle.textContent = localizedShow;
          }
        }

        if (tickerText) {
          if (lang === 'ha' && s.breaking_news) {
            tickerText.textContent = s.breaking_news;
          } else if (t.tickerText) {
            tickerText.textContent = t.tickerText;
          } else if (s.breaking_news) {
            tickerText.textContent = s.breaking_news;
          }
        }

        if (s.tv_stream_url && tvPlayer) {
          setupLiveTvPlayer(s.tv_stream_url);
        }
        const isTvLive = s.tv_is_live !== 'false';
        const homeSpotlight = document.getElementById('homeLiveTvSpotlight');
        const navLiveDot = document.getElementById('bottomNavTvLiveDot');
        const tvHeaderBeacon = document.getElementById('tvHeaderBeacon');
        const tvPlayerLiveTag = document.getElementById('tvPlayerLiveTag');
        if (homeSpotlight) homeSpotlight.style.display = isTvLive ? 'block' : 'none';
        if (navLiveDot) navLiveDot.style.display = isTvLive ? 'flex' : 'none';
        if (tvHeaderBeacon) tvHeaderBeacon.style.display = isTvLive ? 'inline-flex' : 'none';
        if (tvPlayerLiveTag) tvPlayerLiveTag.style.display = isTvLive ? 'inline-flex' : 'none';
      }
    } catch (e) {
      console.warn('Using default broadcast streams:', e);
    }
  }

  // Default Fallback Schedule
  const defaultSchedule = [
    { time_slot: '06:00 - 09:00', title: 'Shirin Barka da Safe', host: 'Amina Hausawi', broadcast_type: 'RADIO', is_live: true, description: 'Labarai, al\'adu, da tattaunawa ta safe.' },
    { time_slot: '09:00 - 12:00', title: 'Tattaunawa da Al\'umma', host: 'Ibrahim Danlami', broadcast_type: 'RADIO', is_live: false, description: 'Bunkasa ilimi da fahimtar al\'adun Hausa da Larabci.' },
    { time_slot: '12:00 - 15:00', title: 'Labaran Duniya Kai Tsaye', host: 'Arab Hausa News Desk', broadcast_type: 'TV', is_live: true, description: 'Cikakkun labaran duniya da koyar da al\'adun kasashen biyu.' },
    { time_slot: '15:00 - 18:00', title: 'Dandalin Matasa da Fasaha', host: 'Fatima Zahraddin', broadcast_type: 'RADIO', is_live: false, description: 'Fasahar zamani, kasuwanci, da al\'adun matasa.' },
    { time_slot: '18:00 - 21:00', title: 'Duniyar Musulunci & Tarihi', host: 'Dr. Ahmad Al-Hassan', broadcast_type: 'TV', is_live: true, description: 'Ilimantarwa kan tarihin addinin Musulunci da hadin kan kasashen Larabawa.' },
    { time_slot: '21:00 - 00:00', title: 'Shirin Dare: Wakokin Gargajiya', host: 'Salisu Mai Kaho', broadcast_type: 'RADIO', is_live: false, description: 'Wakoki, adabi, da tattaunawar nishadantarwa ta dare.' }
  ];

  function getActiveLanguage() {
    return window.currentLang || localStorage.getItem('arab_hausa_lang') || 'ha';
  }

  function getLocalizedSchedule() {
    const lang = getActiveLanguage();
    if (window.translations && window.translations[lang] && Array.isArray(window.translations[lang].schedules)) {
      return window.translations[lang].schedules;
    }
    return defaultSchedule;
  }

  function getLocalizedNews() {
    const lang = getActiveLanguage();
    if (window.translations && window.translations[lang] && Array.isArray(window.translations[lang].news)) {
      return window.translations[lang].news;
    }
    return defaultNews;
  }

  // 3. Fetch Daily Schedule (Language-Aware to prevent Hausa leak in English)
  async function loadSchedule() {
    const lang = getActiveLanguage();
    try {
      const data = await apiFetch('schedule?t=' + Date.now());
      if (lang === 'ha' && data && data.success && Array.isArray(data.schedule) && data.schedule.length > 0) {
        renderSchedule(data.schedule);
      } else {
        renderSchedule(getLocalizedSchedule());
      }
    } catch (e) {
      renderSchedule(getLocalizedSchedule());
    }
  }

  function renderSchedule(list) {
    if (!scheduleContainer) return;
    scheduleContainer.innerHTML = list.map(item => `
      <div class="liquid-glass-card schedule-item">
        <div class="schedule-time">⏰ ${escapeHtml(item.time_slot)}</div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>🎙️ ${escapeHtml(item.host)}</p>
        ${item.description ? `<p style="margin-top:4px; font-size:0.8rem; color:var(--text-muted);">${escapeHtml(item.description)}</p>` : ''}
        <span class="schedule-badge ${(item.broadcast_type || 'radio').toLowerCase() === 'tv' ? 'badge-tv' : 'badge-radio'}">
          ${escapeHtml(item.broadcast_type || 'RADIO')} ${item.is_live ? '• LIVE' : ''}
        </span>
      </div>
    `).join('');
  }

  // Default Fallback News
  const defaultNews = [
    { title: 'Bude Sabuwar Tashar Arab Hausa a Yanar Gizo', category: 'LABARAI', content: 'An kaddamar da cikakkiyar manhajar Arab Hausa Radio da TV don watsa shirye-shiryen kai tsaye zuwa ga al\'ummar Hausawa da kasashen Larabawa a fadin duniya.', author: 'Arab Hausa Editorial Desk', created_at: new Date().toISOString() },
    { title: 'Hadin Kan Al\'adun Hausawa da Kasashen Larabawa', category: 'AL\'ADU', content: 'Wani taron karawa juna sani ya gudana kan yadda kafafen yada labarai na zamani ke habaka fahimtar al\'adu, harshe, da kasuwanci a tsakanin Afirka da Gabas ta Tsakiya.', author: 'Sashen Al\'adu', created_at: new Date().toISOString() },
    { title: 'Shirye-shiryen Ilimantarwa da Koyar da Harshen Larabci', category: 'ILIMI', content: 'Tashar ta fara gabatar da sababbin dabarun koyar da harshen Larabci cikin sauki ta rediyo da talabijin don amfanin dalibai da masu sha\'awar ilimi.', author: 'Sashen Ilimi', created_at: new Date().toISOString() }
  ];

  // 4. Fetch News Articles (Language-Aware to prevent Hausa leak in English)
  async function loadNews() {
    const lang = getActiveLanguage();
    try {
      const data = await apiFetch('news?t=' + Date.now());
      if (lang === 'ha' && data && data.success && Array.isArray(data.news) && data.news.length > 0) {
        renderNews(data.news);
        renderHomeNewsPreview(data.news.slice(0, 3));
      } else {
        renderNews(getLocalizedNews());
        renderHomeNewsPreview(getLocalizedNews().slice(0, 2));
      }
    } catch (e) {
      renderNews(getLocalizedNews());
      renderHomeNewsPreview(getLocalizedNews().slice(0, 2));
    }
  }

  function renderNews(list) {
    if (!newsContainer) return;
    newsContainer.innerHTML = list.map(art => {
      const imgHtml = art.image_url ? `<img src="${art.image_url}" alt="${escapeHtml(art.title)}" class="news-art-thumbnail" loading="lazy">` : '';
      const mediaHtml = art.media_url ? (
        art.media_url.endsWith('.mp4') || art.media_url.includes('m3u8') || art.media_url.includes('video')
          ? `<video controls playsinline class="news-art-video" src="${art.media_url}"></video>`
          : `<audio controls class="news-art-audio" src="${art.media_url}"></audio>`
      ) : '';

      return `
        <article class="liquid-glass-card news-card">
          ${imgHtml}
          ${mediaHtml}
          <div>
            <span class="news-tag">${escapeHtml(art.category || 'LABARAI')}</span>
            <h3 class="news-title">${escapeHtml(art.title)}</h3>
            ${art.title_ar ? `<h4 class="news-title-ar" dir="rtl">${escapeHtml(art.title_ar)}</h4>` : ''}
            <p class="news-snippet">${escapeHtml(art.content ? art.content.substring(0, 160) : '')}...</p>
          </div>
          <div class="news-meta">
            <span>✍️ ${escapeHtml(art.author || 'Arab Hausa Editorial Desk')}</span>
            <span>📅 ${new Date(art.created_at || Date.now()).toLocaleDateString()}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  function renderHomeNewsPreview(list) {
    if (!homeNewsPreviewGrid) return;
    homeNewsPreviewGrid.innerHTML = list.map(art => {
      const imgHtml = art.image_url ? `<img src="${art.image_url}" alt="${escapeHtml(art.title)}" class="news-art-thumbnail" style="max-height:160px; margin-bottom:8px;" loading="lazy">` : '';

      return `
        <article class="liquid-glass-card" style="padding:14px; margin-bottom:10px;">
          ${imgHtml}
          <span class="feature-pill" style="font-size:0.68rem; padding:3px 8px; margin-bottom:6px; display:inline-flex;">${escapeHtml(art.category || 'LABARAI')}</span>
          <h4 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0 0 4px 0;">${escapeHtml(art.title)}</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); margin:0 0 8px 0; line-height:1.4;">${escapeHtml(art.content ? art.content.substring(0, 120) : '')}...</p>
          <span style="font-size:0.72rem; color:var(--neon-cyan);">📅 ${new Date(art.created_at || Date.now()).toLocaleDateString()}</span>
        </article>
      `;
    }).join('');
  }

  // 4b. Universal Video Player & Photo Gallery Engine
  const homeMediaGrid = document.getElementById('homeMediaGrid');
  const tvMediaGrid = document.getElementById('tvMediaGrid');
  const mediaFilterBtns = document.querySelectorAll('.public-filter-btn[data-media-filter]');
  let publicMediaItems = [];
  let hlsInstances = [];

  // Universal Video Player Setup (HLS.js, MP4, WebM, with error recovery)
  function setupVideoElement(videoEl, url) {
    if (!videoEl || !url) return;

    const isHls = url.includes('.m3u8') || url.includes('type=m3u8');

    if (isHls) {
      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60
        });
        hls.loadSource(url);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.ERROR, function(event, data) {
          if (data.fatal) {
            switch(data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('HLS Network error, recovering...', data);
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('HLS Media error, recovering...', data);
                hls.recoverMediaError();
                break;
              default:
                console.warn('Fatal HLS error, destroying...', data);
                hls.destroy();
                showVideoFallback(videoEl, url);
                break;
            }
          }
        });
        hlsInstances.push(hls);
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
      } else {
        showVideoFallback(videoEl, url);
      }
    } else {
      videoEl.src = url;
    }

    videoEl.addEventListener('error', function() {
      showVideoFallback(videoEl, url);
    }, { once: true });
  }

  function showVideoFallback(videoEl, url) {
    const parent = videoEl.parentElement;
    if (!parent || parent.querySelector('.video-fallback-banner')) return;
    const lang = getActiveLanguage();
    const banner = document.createElement('div');
    banner.className = 'video-fallback-banner';
    banner.innerHTML = `
      <div style="padding:14px; text-align:center; color:#fff; width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:8px;">
        <span style="font-size:2rem;">🎬</span>
        <p style="font-size:0.8rem; color:#f1f5f9; margin:0; line-height:1.3;">
          ${lang === 'en' ? 'Click below to watch this video stream directly:' : 'Danna kasa domin kallon bidiyon kai tsaye:'}
        </p>
        <a href="${url}" target="_blank" rel="noopener" style="display:inline-block; background:var(--neon-cyan); color:#050b14; padding:6px 14px; border-radius:20px; font-size:0.75rem; font-weight:800; text-decoration:none;">
          ▶ ${lang === 'en' ? 'Open Video Player' : 'Bude Bidiyon'}
        </a>
      </div>
    `;
    parent.appendChild(banner);
  }

  // Setup Live TV Main Player with HLS or Camera Broadcast
  function setupLiveTvPlayer(streamUrl) {
    if (!tvPlayer) return;
    setupVideoElement(tvPlayer, streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  }

  // Real-time Live Broadcast sync
  try {
    const liveChannel = new BroadcastChannel('arab_hausa_live_channel');
    liveChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'camera_live_start') {
        const homeSpotlight = document.getElementById('homeLiveTvSpotlight');
        const navLiveDot = document.getElementById('bottomNavTvLiveDot');
        const tvHeaderBeacon = document.getElementById('tvHeaderBeacon');
        const tvPlayerLiveTag = document.getElementById('tvPlayerLiveTag');
        if (homeSpotlight) homeSpotlight.style.display = 'block';
        if (navLiveDot) navLiveDot.style.display = 'flex';
        if (tvHeaderBeacon) tvHeaderBeacon.style.display = 'inline-flex';
        if (tvPlayerLiveTag) tvPlayerLiveTag.style.display = 'inline-flex';
      }
    };
  } catch (e) {}

  // TV Screen Cinema Fullscreen Action
  const tvCinemaFullscreenBtn = document.getElementById('tvCinemaFullscreenBtn');
  if (tvCinemaFullscreenBtn && tvPlayer) {
    tvCinemaFullscreenBtn.addEventListener('click', () => {
      if (tvPlayer.requestFullscreen) {
        tvPlayer.requestFullscreen().catch(() => {});
      } else if (tvPlayer.webkitEnterFullscreen) {
        tvPlayer.webkitEnterFullscreen();
      } else if (tvPlayer.webkitRequestFullscreen) {
        tvPlayer.webkitRequestFullscreen();
      }
    });
  }

  function getLocalMediaStore() {
    try {
      const data = localStorage.getItem('arab_hausa_uploaded_media');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async function loadPublicMedia(filterType = 'all') {
    // 1. Immediately render local uploads from admin gallery
    const localItems = getLocalMediaStore();
    if (localItems.length > 0) {
      publicMediaItems = localItems;
      renderPublicHomeMedia(filterType);
      renderTvMedia();
    }

    try {
      const data = await apiFetch('upload?t=' + Date.now());
      if (data && data.success && Array.isArray(data.media)) {
        const map = new Map();
        localItems.forEach(item => map.set(item.url || String(item.id), item));
        data.media.forEach(item => map.set(item.url || String(item.id), item));
        publicMediaItems = Array.from(map.values()).sort((a, b) => (b.id || 0) - (a.id || 0));
        renderPublicHomeMedia(filterType);
        renderTvMedia();
      }
    } catch (err) {
      console.warn('Using existing media items for public view:', err);
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'arab_hausa_uploaded_media') {
      loadPublicMedia();
    }
  });

  window.addEventListener('media-uploaded', () => {
    loadPublicMedia();
  });

  // Render HTML for a Single Media Item
  function renderMediaItemHTML(m) {
    const lang = getActiveLanguage();
    const createdDate = new Date(m.created_at || Date.now()).toLocaleDateString();

    if (m.type === 'photo') {
      return `
        <div class="public-media-card">
          <div class="public-media-preview clickable-photo" data-photo-url="${m.url}" data-photo-title="${escapeHtml(m.name)}" data-photo-meta="${escapeHtml(m.category || 'Photo')} • ${createdDate}">
            <span class="public-media-badge" style="background:var(--neon-gold); color:#000;">📸 ${lang === 'en' ? 'PHOTO' : 'HOTO'}</span>
            <img src="${m.url}" alt="${escapeHtml(m.name)}" loading="lazy">
          </div>
          <div class="public-media-body">
            <h4 class="public-media-title">${escapeHtml(m.name)}</h4>
            <div class="public-media-meta">
              <span class="category-tag">📸 ${escapeHtml(m.category || 'Studio')}</span>
              <span>📅 ${createdDate}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (m.type === 'video') {
      // Check YouTube
      const ytMatch = m.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
      if (ytMatch) {
        return `
          <div class="public-media-card">
            <div class="public-media-preview" style="height:210px;">
              <span class="public-media-badge" style="background:#ff0000;">YOUTUBE HD</span>
              <iframe src="https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="public-media-body">
              <h4 class="public-media-title">${escapeHtml(m.name)}</h4>
              <div class="public-media-meta">
                <span class="category-tag">📺 ${escapeHtml(m.category || 'Broadcast')}</span>
                <span>📅 ${createdDate}</span>
              </div>
            </div>
          </div>
        `;
      }

      // Check Vimeo
      const vmMatch = m.url.match(/vimeo\.com\/(\d+)/i);
      if (vmMatch) {
        return `
          <div class="public-media-card">
            <div class="public-media-preview" style="height:210px;">
              <span class="public-media-badge" style="background:#1ab7ea;">VIMEO HD</span>
              <iframe src="https://player.vimeo.com/video/${vmMatch[1]}" allowfullscreen></iframe>
            </div>
            <div class="public-media-body">
              <h4 class="public-media-title">${escapeHtml(m.name)}</h4>
              <div class="public-media-meta">
                <span class="category-tag">📺 ${escapeHtml(m.category || 'Broadcast')}</span>
                <span>📅 ${createdDate}</span>
              </div>
            </div>
          </div>
        `;
      }

      // Direct Video (HLS, MP4, WebM, base64)
      return `
        <div class="public-media-card">
          <div class="public-media-preview" style="height:210px;">
            <span class="public-media-badge" style="background:var(--neon-rose);">HD VIDEO</span>
            <video controls playsinline webkit-playsinline preload="metadata" poster="/images/logo.png" data-video-src="${m.url}"></video>
          </div>
          <div class="public-media-body">
            <h4 class="public-media-title">${escapeHtml(m.name)}</h4>
            <div class="public-media-meta">
              <span class="category-tag">📺 ${escapeHtml(m.category || 'Broadcast')}</span>
              <span>📅 ${createdDate}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (m.type === 'voicenote') {
      return `
        <div class="public-media-card">
          <div class="public-media-preview" style="height:150px; background:radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(15,23,42,0.95) 75%);">
            <span class="public-media-badge" style="background:var(--neon-gold); color:#000;">🎙️ AUDIO</span>
            <span style="font-size:3rem;">🎙️</span>
          </div>
          <div class="public-media-body">
            <audio controls src="${m.url}" style="width:100%; margin-bottom:8px;"></audio>
            <h4 class="public-media-title">${escapeHtml(m.name)}</h4>
            <div class="public-media-meta">
              <span class="category-tag">📻 ${escapeHtml(m.category || 'Audio Note')}</span>
              <span>📅 ${createdDate}</span>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  function initRenderedMedia(container) {
    if (!container) return;
    // 1. Initialize video tags with HLS and fallback
    const videos = container.querySelectorAll('video[data-video-src]');
    videos.forEach(v => {
      const src = v.getAttribute('data-video-src');
      if (src) setupVideoElement(v, src);
    });

    // 2. Attach click handlers to photos for fullscreen lightbox
    const photos = container.querySelectorAll('.clickable-photo');
    photos.forEach(p => {
      p.addEventListener('click', () => {
        const url = p.getAttribute('data-photo-url');
        const title = p.getAttribute('data-photo-title');
        const meta = p.getAttribute('data-photo-meta');
        openPhotoLightbox(url, title, meta);
      });
    });
  }

  // 1. Home Media Section
  function renderPublicHomeMedia(filterType = 'all') {
    if (!homeMediaGrid) return;
    const items = filterType === 'all' ? publicMediaItems : publicMediaItems.filter(m => m.type === filterType);
    const lang = getActiveLanguage();

    if (!items || items.length === 0) {
      homeMediaGrid.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; padding:16px; text-align:center; grid-column:1/-1;">${lang === 'en' ? 'No media uploads found in this category yet.' : 'Babu hotuna ko bidiyo da aka wallafa a wannan rukunin tukuna.'}</p>`;
      return;
    }

    homeMediaGrid.innerHTML = items.map(m => renderMediaItemHTML(m)).join('');
    initRenderedMedia(homeMediaGrid);
  }

  // 2. TV Media Section (Both Videos & Photos Joined Together)
  function renderTvMedia() {
    const tvMediaGrid = document.getElementById('tvMediaGrid');
    if (!tvMediaGrid) return;
    const media = publicMediaItems.filter(m => m.type === 'video' || m.type === 'photo');
    const lang = getActiveLanguage();

    if (!media || media.length === 0) {
      tvMediaGrid.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; padding:16px; text-align:center; grid-column:1/-1;">${lang === 'en' ? 'No video or photo uploads available right now.' : 'Babu hotuna ko bidiyo a halin yanzu.'}</p>`;
      return;
    }

    tvMediaGrid.innerHTML = media.map(m => renderMediaItemHTML(m)).join('');
    initRenderedMedia(tvMediaGrid);
  }

  // 4. Photo Lightbox Modal
  const photoLightboxModal = document.getElementById('photoLightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxMeta = document.getElementById('lightboxMeta');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');

  function openPhotoLightbox(url, title, meta) {
    if (!photoLightboxModal || !lightboxImg) return;
    lightboxImg.src = url;
    if (lightboxTitle) lightboxTitle.textContent = title || 'Arab Hausa Photo';
    if (lightboxMeta) lightboxMeta.textContent = meta || '';
    photoLightboxModal.style.display = 'flex';
  }

  function closePhotoLightbox() {
    if (photoLightboxModal) photoLightboxModal.style.display = 'none';
  }

  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closePhotoLightbox);
  if (photoLightboxModal) {
    photoLightboxModal.addEventListener('click', (e) => {
      if (e.target === photoLightboxModal) closePhotoLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePhotoLightbox();
  });

  // Hook up home media filter pills
  mediaFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      mediaFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-media-filter') || 'all';
      renderPublicHomeMedia(filter);
    });
  });



  // 5. Radio Play / Pause Controls (Synchronized between Radio Page & Home Mini Player)
  function toggleRadio() {
    if (isPlaying) {
      audio.pause();
      setPlayerState(false);
    } else {
      audio.src = currentStreamUrl;
      audio.load();
      if (radioStatusBadge) radioStatusBadge.textContent = 'CONNECTING...';
      if (homeOnAirBadge) homeOnAirBadge.textContent = 'CONNECTING...';
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setPlayerState(true))
          .catch((err) => {
            console.warn('Primary stream failed, attempting fallback...', err);
            audio.src = fallbackStreamUrl;
            audio.play()
              .then(() => setPlayerState(true))
              .catch((e) => {
                console.error('All radio streams unreachable:', e);
                if (radioStatusBadge) radioStatusBadge.textContent = 'STREAM OFFLINE';
                if (homeOnAirBadge) homeOnAirBadge.textContent = 'OFFLINE';
                setPlayerState(false);
              });
          });
      }
    }
  }

  function setPlayerState(playing) {
    isPlaying = playing;
    if (playing) {
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
      if (homePlayIcon) homePlayIcon.style.display = 'none';
      if (homePauseIcon) homePauseIcon.style.display = 'block';
      if (radioDisc) radioDisc.classList.add('spinning');
      if (homeDiscThumb) homeDiscThumb.classList.add('spinning');
      if (visualizer) visualizer.classList.add('active');
      if (homeVisualizer) homeVisualizer.classList.add('active');
      const currentL = getActiveLanguage();
      const tr = (window.translations && window.translations[currentL]) || {};
      if (radioStatusBadge) radioStatusBadge.textContent = tr.onAir || (currentL === 'en' ? 'LIVE ON AIR' : 'KAI TSAYE');
      if (homeOnAirBadge) homeOnAirBadge.textContent = tr.onAirMiniBadge || (currentL === 'en' ? 'LIVE ON AIR NOW' : 'KAI TSAYE A YANZU');
    } else {
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (homePlayIcon) homePlayIcon.style.display = 'block';
      if (homePauseIcon) homePauseIcon.style.display = 'none';
      if (radioDisc) radioDisc.classList.remove('spinning');
      if (homeDiscThumb) homeDiscThumb.classList.remove('spinning');
      if (visualizer) visualizer.classList.remove('active');
      if (homeVisualizer) homeVisualizer.classList.remove('active');
      const currentL = getActiveLanguage();
      if (radioStatusBadge) radioStatusBadge.textContent = currentL === 'en' ? 'PAUSED' : 'AN DAKATA';
      if (homeOnAirBadge) homeOnAirBadge.textContent = currentL === 'en' ? 'PAUSED' : 'AN DAKATA';
    }
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', toggleRadio);
  }

  if (homeMiniPlayBtn) {
    homeMiniPlayBtn.addEventListener('click', toggleRadio);
  }

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      audio.volume = e.target.value;
    });
  }

  function toggleLowData() {
    isLowData = !isLowData;
    const txt = isLowData ? '📶 Low-Data (48k)' : '🎵 HQ Audio (128k)';
    if (dataModeToggle) dataModeToggle.textContent = txt;
    if (settingDataModeToggle) settingDataModeToggle.textContent = txt;
    if (isPlaying) {
      toggleRadio();
      setTimeout(toggleRadio, 200);
    }
  }

  if (dataModeToggle) dataModeToggle.addEventListener('click', toggleLowData);
  if (settingDataModeToggle) settingDataModeToggle.addEventListener('click', toggleLowData);

  // 6. Interactive Community Like Button
  let stationLikes = parseInt(localStorage.getItem('arab_hausa_likes') || '1842', 10);
  let hasLiked = localStorage.getItem('arab_hausa_has_liked') === 'true';

  if (likeCountText) likeCountText.textContent = stationLikes.toLocaleString();
  if (hasLiked && likeStationBtn) {
    likeStationBtn.classList.add('like-button-active');
  }

  if (likeStationBtn) {
    likeStationBtn.addEventListener('click', () => {
      if (!hasLiked) {
        stationLikes += 1;
        hasLiked = true;
        localStorage.setItem('arab_hausa_likes', stationLikes);
        localStorage.setItem('arab_hausa_has_liked', 'true');
        if (likeCountText) likeCountText.textContent = stationLikes.toLocaleString();
        likeStationBtn.classList.add('like-button-active');
        if (likeHeartIcon) {
          likeHeartIcon.style.transform = 'scale(1.4)';
          setTimeout(() => { likeHeartIcon.style.transform = 'scale(1)'; }, 300);
        }
      }
    });
  }

  // 7. Listen for Language Change Event
  window.addEventListener('languageChanged', (e) => {
    const { lang, t } = e.detail;
    // Update active button state in settings
    document.querySelectorAll('.lang-btn-option').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Immediately refresh ticker
    if (tickerText && t.tickerText) {
      tickerText.textContent = t.tickerText;
    }

    // Immediately refresh hero show title
    const localizedShow = t.heroShowTitle || t.show1Title;
    if (localizedShow) {
      if (currentShowText) currentShowText.textContent = localizedShow;
      if (homeShowTitle) homeShowTitle.textContent = localizedShow;
    }

    // Re-render schedule and news in the selected language instantly!
    renderSchedule(getLocalizedSchedule());
    renderNews(getLocalizedNews());
    renderHomeNewsPreview(getLocalizedNews().slice(0, 2));
    renderPublicHomeMedia();
    renderTvMedia();

    // Update player badges if playing
    if (isPlaying) {
      if (radioStatusBadge) radioStatusBadge.textContent = t.onAir || (lang === 'en' ? 'LIVE ON AIR' : 'KAI TSAYE');
      if (homeOnAirBadge) homeOnAirBadge.textContent = t.onAirMiniBadge || (lang === 'en' ? 'LIVE ON AIR NOW' : 'KAI TSAYE A YANZU');
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  loadSettings();
  loadSchedule();
  loadNews();
  loadPublicMedia();

  // Auto-refresh feeds every 30 seconds so public users see new admin uploads in real-time
  setInterval(() => {
    loadNews();
    loadPublicMedia();
    loadSettings();
    loadSchedule();
  }, 30000);
});
