/**
 * Arab Hausa Radio TV - Main Application Engine (Liquid Glass v7)
 * Multi-Page View Controller: Home, Radio, Live TV, Schedule, News
 */

document.addEventListener('DOMContentLoaded', () => {

  // --- High-Capacity Persistent Media Storage Engine (IndexedDB + Storage Sync) ---
  const AppMediaStore = {
    dbPromise: null,
    init() {
      if (this.dbPromise) return this.dbPromise;
      this.dbPromise = new Promise((resolve) => {
        if (!window.indexedDB) return resolve(null);
        try {
          const req = indexedDB.open('ArabHausaMediaStore', 2);
          req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('media')) {
              db.createObjectStore('media', { keyPath: 'id' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
      return this.dbPromise;
    },
    async getAll() {
      const db = await this.init();
      if (!db) {
        try { return JSON.parse(localStorage.getItem('arab_hausa_uploaded_media') || '[]'); } catch (e) { return []; }
      }
      return new Promise((resolve) => {
        try {
          const tx = db.transaction('media', 'readonly');
          const store = tx.objectStore('media');
          const req = store.getAll();
          req.onsuccess = () => {
            const list = req.result || [];
            try {
              const ls = JSON.parse(localStorage.getItem('arab_hausa_uploaded_media') || '[]');
              const map = new Map();
              ls.forEach(item => map.set(String(item.id), item));
              list.forEach(item => {
                if (!item.url && item.fileBlob) {
                  try { item.url = URL.createObjectURL(item.fileBlob); } catch(e) {}
                }
                map.set(String(item.id), item);
              });
              resolve(Array.from(map.values()).sort((a,b) => (b.id||0) - (a.id||0)));
            } catch(e) {
              list.forEach(item => {
                if (!item.url && item.fileBlob) {
                  try { item.url = URL.createObjectURL(item.fileBlob); } catch(e) {}
                }
              });
              resolve(list.sort((a,b) => (b.id||0) - (a.id||0)));
            }
          };
          req.onerror = () => {
            try { resolve(JSON.parse(localStorage.getItem('arab_hausa_uploaded_media') || '[]')); } catch(e) { resolve([]); }
          };
        } catch(e) {
          try { resolve(JSON.parse(localStorage.getItem('arab_hausa_uploaded_media') || '[]')); } catch(err) { resolve([]); }
        }
      });
    }
  };

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

  // Universal Media State & Grid Containers
  const homeMediaGrid = document.getElementById('homeMediaGrid');
  const tvMediaGrid = document.getElementById('tvMediaGrid');
  const radioMediaGrid = document.getElementById('radioMediaGrid');
  const mediaFilterBtns = document.querySelectorAll('.public-filter-btn[data-media-filter]');
  let publicMediaItems = [];

  function normalizeMediaType(type, mediaType, url) {
    const raw = String(type || mediaType || '').trim().toLowerCase().replace(/[\s\-_]/g, '');
    const rawUrl = String(url || '').toLowerCase();
    if (raw === 'voicenote' || raw === 'audio' || raw === 'voice' || rawUrl.match(/\.(webm|mp3|m4a|wav|aac|ogg)($|\?)/i)) {
      return 'voicenote';
    }
    if (raw === 'video' || rawUrl.match(/\.(mp4|webm|m3u8|mov)($|\?)/i) || rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be') || rawUrl.includes('facebook.com') || rawUrl.includes('fb.watch')) {
      return 'video';
    }
    if (raw === 'photo' || raw === 'image' || rawUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i)) {
      return 'photo';
    }
    return raw || 'photo';
  }

  // Dynamic Content Containers
  window.updateLiveTicker = function(text) {
    const tickerEl = document.getElementById('tickerMarquee');
    if (!tickerEl || !text) return;
    const clean = String(text).trim();
    tickerEl.innerHTML = '<span class="ticker-item">' + clean + ' &nbsp;•&nbsp;</span><span class="ticker-item">' + clean + ' &nbsp;•&nbsp;</span>';
  };

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
    programs: document.getElementById('page-programs'),
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
    if (pageName === 'home' || pageName === 'tv' || pageName === 'programs') {
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
    if (pageName === 'programs') {
      renderProgramsMedia();
    }
    if (pageName === 'radio') {
      renderRadioVoiceNotes();
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

  // Resilient API Fetch Helper with automatic PHP fallback, No-Cache Enforcement & Fast Timeout Protection
  function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
    if (typeof options === 'number') {
      timeoutMs = options;
      options = {};
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const opts = {
      cache: 'no-store',
      ...options,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...(options.headers || {})
      },
      signal: controller.signal
    };
    return fetch(url, opts).finally(() => clearTimeout(timer));
  }

  async function apiFetch(endpoint, options = {}) {
    const timeout = options.timeout || 4000;
    const fetchOpts = {
      cache: 'no-store',
      ...options,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        ...(options.headers || {})
      }
    };

    const cleanBase = endpoint.split('?')[0].replace(/\.php$/i, '');
    const query = endpoint.includes('?') ? '?' + endpoint.split('?')[1] : '';
    const phpEndpoint = cleanBase + '.php' + query;

    // 1. Direct /api/<name>.php (Bypasses Nginx 403 directory block on DirectAdmin/cPanel)
    try {
      const res = await fetchWithTimeout('/api/' + phpEndpoint, fetchOpts, timeout);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && (data.success || Array.isArray(data))) return data;
      }
    } catch (e) {}

    // 2. Direct /api-php/<name>.php
    try {
      const resPhp = await fetchWithTimeout('/api-php/' + phpEndpoint, fetchOpts, timeout);
      if (resPhp && resPhp.ok) {
        const dataPhp = await resPhp.json().catch(() => null);
        if (dataPhp && (dataPhp.success || Array.isArray(dataPhp))) return dataPhp;
      }
    } catch (e) {}

    // 3. Static JSON Feed /data/<name>.json
    try {
      const resStatic = await fetchWithTimeout('/data/' + cleanBase + '.json?t=' + Date.now(), fetchOpts, 2500);
      if (resStatic && resStatic.ok) {
        const dataStatic = await resStatic.json().catch(() => null);
        if (dataStatic) {
          if (cleanBase === 'news' && Array.isArray(dataStatic)) return { success: true, news: dataStatic };
          if (cleanBase === 'schedule' && Array.isArray(dataStatic)) return { success: true, schedule: dataStatic };
          if (cleanBase === 'settings' && typeof dataStatic === 'object') return { success: true, settings: dataStatic };
          if (cleanBase === 'media' && Array.isArray(dataStatic)) return { success: true, media: dataStatic };
        }
      }
    } catch (e) {}

    // 4. Extensionless /api/<name>
    try {
      const resClean = await fetchWithTimeout('/api/' + endpoint, fetchOpts, timeout);
      if (resClean && resClean.ok) {
        const dataClean = await resClean.json().catch(() => null);
        if (dataClean && (dataClean.success || Array.isArray(dataClean))) return dataClean;
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
          const lang = getActiveLanguage();
          const t = (window.translations && window.translations[lang]) || {};
          const isCustomBreaking = s.breaking_news && 
            !s.breaking_news.includes('Muna tare gida da waje') && 
            !s.breaking_news.includes('No 54 Guda Abdullahi') &&
            !s.breaking_news.includes('Farm Center') &&
            !s.breaking_news.includes('arab-hausa-rtv.com.ng');
          const txt = isCustomBreaking ? s.breaking_news : (t.tickerText || s.breaking_news);
          if (txt && typeof window.updateLiveTicker === 'function') {
            window.updateLiveTicker(txt);
          }
        }

        if (s.tv_stream_url && tvPlayer) {
          setupLiveTvPlayer(s.tv_stream_url);
        }
        const isTvLive = (s.tv_is_live === 'true' || s.tv_is_live === true);
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

  // 3. Fetch Daily Schedule (Persistently cached for 0ms instant display, 100% Language Aware)
  async function loadSchedule() {
    // 0ms instant render from local cache on refresh
    let localSched = [];
    try {
      const cached = JSON.parse(localStorage.getItem('arab_hausa_cached_schedule') || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        localSched = cached;
        renderSchedule(localSched);
      }
    } catch(e) {}

    try {
      const data = await apiFetch('schedule?t=' + Date.now());
      if (data && data.success && Array.isArray(data.schedule) && data.schedule.length > 0) {
        try { localStorage.setItem('arab_hausa_cached_schedule', JSON.stringify(data.schedule)); } catch(e) {}
        renderSchedule(data.schedule);
        return;
      }
    } catch (e) {
      console.warn('Schedule fetch failed, falling back:', e);
    }

    if (localSched.length > 0 && localSched.some(s => s && s.title)) {
      renderSchedule(localSched);
      return;
    }

    // Clean slate: show clean empty state instead of resurrecting old sample placeholders
    try { localStorage.removeItem('arab_hausa_cached_schedule'); } catch(e) {}
    renderSchedule([]);
  }

  function renderSchedule(list) {
    if (!scheduleContainer) return;
    const lang = getActiveLanguage();
    if (!list || list.length === 0) {
      const emptySched = lang === 'en' ? 'No scheduled programs yet. The broadcasting timetable will appear here.' : 'Babu shirye-shiryen da aka tsara tukuna. Jadawalin zai bayyana a nan.';
      scheduleContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.92rem; padding:32px 16px; text-align:center; grid-column:1/-1;">⏰ ${emptySched}</p>`;
      return;
    }
    const t = (window.translations && window.translations[lang]) || {};
    const liveText = t.badgeLive || (lang === 'en' ? 'LIVE' : (lang === 'ar' ? 'مباشر' : (lang === 'fr' ? 'EN DIRECT' : (lang === 'ff' ? 'KAI TSAYE' : (lang === 'yo' ? 'LẸKÙN-UNRẸRẸ' : (lang === 'sw' ? 'MOJA KWA MOJA' : 'KAI TSAYE'))))));

    scheduleContainer.innerHTML = list.map(item => `
      <div class="liquid-glass-card schedule-item">
        <div class="schedule-time">⏰ ${escapeHtml(item.time_slot)}</div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>🎙️ ${escapeHtml(item.host)}</p>
        ${item.description ? `<p style="margin-top:4px; font-size:0.8rem; color:var(--text-muted);">${escapeHtml(item.description)}</p>` : ''}
        <span class="schedule-badge ${(item.broadcast_type || 'radio').toLowerCase() === 'tv' ? 'badge-tv' : 'badge-radio'}">
          ${escapeHtml(item.broadcast_type || 'RADIO')} ${item.is_live ? `• ${liveText}` : ''}
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

  // 4. Fetch News Articles (Admin uploads appear immediately in real-time across all languages & 0ms on refresh, 100% Language Aware)
  async function loadNews() {
    // 0ms instant cached news render on refresh
    let localNews = [];
    try {
      const cached = JSON.parse(localStorage.getItem('arab_hausa_cached_news') || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        localNews = cached;
        renderNews(localNews);
        renderHomeNewsPreview(localNews.slice(0, 3));
      }
    } catch(e) {}

    let newsItems = [];
    try {
      const data = await apiFetch('news?t=' + Date.now());
      if (data && data.success && Array.isArray(data.news) && data.news.length > 0) {
        newsItems = data.news;
      }
    } catch (e) {}

    if (newsItems.length === 0) {
      try {
        const pRes = await fetchWithTimeout('/api/posts.php?t=' + Date.now(), { cache: 'no-store' }, 3500);
        if (pRes && pRes.ok) {
          const pData = await pRes.json().catch(() => null);
          if (Array.isArray(pData) && pData.length > 0) {
            newsItems = pData.map(p => ({
              id: p.id,
              title: p.title,
              category: p.category || 'LABARAI',
              content: p.content,
              author: p.author || 'Arab Hausa Editorial Desk',
              image_url: p.photo || p.image_url || '',
              media_url: p.video || p.audio || p.media_url || '',
              created_at: p.created_at
            }));
          }
        }
      } catch (e) {}
    }

    // Server database articles take absolute priority in ALL languages (Hausa, English, Arabic, etc.)
    if (newsItems.length > 0) {
      try {
        localStorage.setItem('arab_hausa_cached_news', JSON.stringify(newsItems));
      } catch(e) {}
      renderNews(newsItems);
      renderHomeNewsPreview(newsItems.slice(0, 3));
      return;
    }

    if (localNews.length > 0 && localNews.some(n => n && n.title)) {
      renderNews(localNews);
      renderHomeNewsPreview(localNews.slice(0, 3));
      return;
    }

    // Clean slate: show clean empty state instead of resurrecting old sample placeholders
    try { localStorage.removeItem('arab_hausa_cached_news'); } catch(e) {}
    renderNews([]);
    renderHomeNewsPreview([]);
  }

  function cleanNewsText(text) {
    if (!text) return '';
    return String(text).replace(/^#+\s*/, '').trim();
  }

  // Full News Article Reader Modal Setup
  const newsReaderModal = document.getElementById('newsReaderModal');
  const closeNewsReaderBtn = document.getElementById('closeNewsReaderBtn');
  const readerModalCategory = document.getElementById('readerModalCategory');
  const readerModalTitle = document.getElementById('readerModalTitle');
  const readerModalTitleAr = document.getElementById('readerModalTitleAr');
  const readerModalAuthor = document.getElementById('readerModalAuthor');
  const readerModalDate = document.getElementById('readerModalDate');
  const readerModalMediaWrap = document.getElementById('readerModalMediaWrap');
  const readerModalBody = document.getElementById('readerModalBody');

  function openNewsReaderModal(art) {
    if (!newsReaderModal) return;
    const displayTitle = cleanNewsText(art.title);
    if (readerModalCategory) readerModalCategory.textContent = art.category || 'LABARAI';
    if (readerModalTitle) readerModalTitle.textContent = displayTitle;
    if (readerModalTitleAr) {
      if (art.title_ar) {
        readerModalTitleAr.textContent = cleanNewsText(art.title_ar);
        readerModalTitleAr.style.display = 'block';
      } else {
        readerModalTitleAr.style.display = 'none';
      }
    }
    if (readerModalAuthor) readerModalAuthor.textContent = `✍️ ${art.author || 'Arab Hausa Editorial Desk'}`;
    if (readerModalDate) readerModalDate.textContent = `📅 ${new Date(art.created_at || Date.now()).toLocaleDateString()}`;
    
    if (readerModalMediaWrap) {
      if (art.image_url) {
        readerModalMediaWrap.innerHTML = `<img src="${art.image_url}" alt="${escapeHtml(displayTitle)}" style="width:100%; max-height:280px; object-fit:cover; border-radius:var(--radius-sm); margin-bottom:12px;">`;
      } else if (art.media_url) {
        if (art.media_url.endsWith('.mp4') || art.media_url.includes('video') || art.media_url.includes('m3u8')) {
          readerModalMediaWrap.innerHTML = `<video controls playsinline src="${art.media_url}" style="width:100%; max-height:280px; border-radius:var(--radius-sm); margin-bottom:12px;"></video>`;
        } else {
          readerModalMediaWrap.innerHTML = `<audio controls src="${art.media_url}" style="width:100%; margin-bottom:12px;"></audio>`;
        }
      } else {
        readerModalMediaWrap.innerHTML = '';
      }
    }

    if (readerModalBody) {
      readerModalBody.textContent = cleanNewsText(art.content || '');
    }

    newsReaderModal.style.display = 'flex';
  }

  if (closeNewsReaderBtn && newsReaderModal) {
    closeNewsReaderBtn.addEventListener('click', () => {
      newsReaderModal.style.display = 'none';
    });
    newsReaderModal.addEventListener('click', (e) => {
      if (e.target === newsReaderModal) {
        newsReaderModal.style.display = 'none';
      }
    });
  }

  function renderNews(list) {
    if (!newsContainer) return;
    const lang = getActiveLanguage();
    if (!list || list.length === 0) {
      const emptyNews = lang === 'en' ? 'No news articles published yet. New articles published from the Admin Portal will appear here.' : 'Babu labaran da aka wallafa tukuna. Sabbin labarai za su bayyana a nan.';
      newsContainer.innerHTML = `<p style="color:var(--text-muted); font-size:0.92rem; padding:32px 16px; text-align:center; grid-column:1/-1;">📰 ${emptyNews}</p>`;
      return;
    }
    const t = (window.translations && window.translations[lang]) || {};
    const readMoreTxt = t.newsReadMore || (lang === 'en' ? 'Read Full Article ▾' : 'Karanta Cikakken Labari ▾');
    const showLessTxt = t.newsShowLess || (lang === 'en' ? 'Show Less ▴' : 'Rufe Labarin ▴');
    const defaultTag = t.newsTagDefault || (lang === 'en' ? 'NEWS' : 'LABARAI');

    newsContainer.innerHTML = list.map((art, index) => {
      const displayTitle = cleanNewsText(art.title);
      const rawContent = cleanNewsText(art.content || '');
      const isLong = rawContent.length > 130;
      const snippet = isLong ? rawContent.substring(0, 130).trim() + '...' : rawContent;

      const resolvedImg = art.image_url || art.photo || '';
      const resolvedMedia = art.media_url || art.video || art.audio || '';
      const imgHtml = resolvedImg ? `<img src="${escapeHtml(resolvedImg)}" alt="${escapeHtml(displayTitle)}" class="news-art-thumbnail" loading="lazy">` : '';
      const mediaHtml = resolvedMedia ? (
        resolvedMedia.endsWith('.mp4') || resolvedMedia.includes('m3u8') || resolvedMedia.includes('video')
          ? `<video controls playsinline class="news-art-video" src="${escapeHtml(resolvedMedia)}"></video>`
          : `<audio controls class="news-art-audio" src="${escapeHtml(resolvedMedia)}"></audio>`
      ) : '';

      return `
        <article class="liquid-glass-card news-card" data-news-idx="${index}" tabindex="0" role="button" aria-expanded="false" title="Touch to view remaining news">
          ${imgHtml}
          ${mediaHtml}
          <div class="news-body-content">
            <span class="news-tag">${escapeHtml(art.category || defaultTag)}</span>
            <h3 class="news-title">${escapeHtml(displayTitle)}</h3>
            ${art.title_ar ? `<h4 class="news-title-ar" dir="rtl">${escapeHtml(cleanNewsText(art.title_ar))}</h4>` : ''}
            <div class="news-text-container">
              <p class="news-snippet">${escapeHtml(snippet)}</p>
              <div class="news-full-text" style="display:none;">${escapeHtml(rawContent)}</div>
              ${isLong ? `
                <button type="button" class="news-expand-btn" data-expanded="false" aria-label="Toggle full article">
                  <span class="expand-btn-text">${escapeHtml(readMoreTxt)}</span>
                </button>
              ` : ''}
            </div>
          </div>
          <div class="news-meta">
            <span>✍️ ${escapeHtml(art.author || 'Arab Hausa Editorial Desk')}</span>
            <span>📅 ${new Date(art.created_at || Date.now()).toLocaleDateString()}</span>
          </div>
        </article>
      `;
    }).join('');

    // Attach click and touch listeners to each news card
    newsContainer.querySelectorAll('.news-card').forEach((card, idx) => {
      const art = list[idx];
      const expandBtn = card.querySelector('.news-expand-btn');
      const snippetEl = card.querySelector('.news-snippet');
      const fullTextEl = card.querySelector('.news-full-text');

      const toggleExpand = () => {
        if (!fullTextEl) return;
        const isExp = card.classList.contains('is-expanded');
        if (isExp) {
          // Collapse
          if (snippetEl) snippetEl.style.display = 'block';
          fullTextEl.style.display = 'none';
          if (expandBtn) {
            expandBtn.setAttribute('data-expanded', 'false');
            const txt = expandBtn.querySelector('.expand-btn-text');
            if (txt) txt.textContent = readMoreTxt;
          }
          card.setAttribute('aria-expanded', 'false');
          card.classList.remove('is-expanded');
        } else {
          // Expand: show remaining news
          if (snippetEl) snippetEl.style.display = 'none';
          fullTextEl.style.display = 'block';
          if (expandBtn) {
            expandBtn.setAttribute('data-expanded', 'true');
            const txt = expandBtn.querySelector('.expand-btn-text');
            if (txt) txt.textContent = showLessTxt;
          }
          card.setAttribute('aria-expanded', 'true');
          card.classList.add('is-expanded');
        }
      };

      // Tapping anywhere on the card or snippet toggles expand/collapse
      card.addEventListener('click', (e) => {
        // Prevent toggle if interacting with video, audio, or links
        if (e.target.closest('video, audio, a, input, select')) return;
        toggleExpand();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleExpand();
        }
      });
    });
  }

  function renderHomeNewsPreview(list) {
    if (!homeNewsPreviewGrid) return;
    const lang = getActiveLanguage();
    const t = (window.translations && window.translations[lang]) || {};
    const defaultTag = t.newsTagDefault || (lang === 'en' ? 'NEWS' : 'LABARAI');
    const readMoreTxt = t.newsReadMore || (lang === 'en' ? 'Read Full Article ▾' : 'Karanta Cikakken Labari ▾');
    const showLessTxt = t.newsShowLess || (lang === 'en' ? 'Show Less ▴' : 'Rufe Labarin ▴');

    homeNewsPreviewGrid.innerHTML = list.map((art, index) => {
      const displayTitle = cleanNewsText(art.title);
      const rawContent = cleanNewsText(art.content || '');
      const isLong = rawContent.length > 100;
      const snippet = isLong ? rawContent.substring(0, 100).trim() + '...' : rawContent;
      const imgHtml = art.image_url ? `<img src="${art.image_url}" alt="${escapeHtml(displayTitle)}" class="news-art-thumbnail" style="max-height:160px; margin-bottom:8px;" loading="lazy">` : '';

      return `
        <article class="liquid-glass-card news-card home-news-card" data-home-news-idx="${index}" style="padding:14px; margin-bottom:10px; cursor:pointer;" tabindex="0" role="button" aria-expanded="false" title="Touch to view remaining news">
          ${imgHtml}
          <span class="feature-pill" style="font-size:0.68rem; padding:3px 8px; margin-bottom:6px; display:inline-flex;">${escapeHtml(art.category || defaultTag)}</span>
          <h4 style="font-size:0.95rem; font-weight:800; color:var(--dark-navy); margin:0 0 4px 0;">${escapeHtml(displayTitle)}</h4>
          <div class="news-text-container">
            <p class="news-snippet" style="font-size:0.8rem; color:var(--text-muted); margin:0 0 4px 0; line-height:1.4;">${escapeHtml(snippet)}</p>
            <div class="news-full-text" style="display:none; font-size:0.82rem; color:var(--dark-navy); margin:0 0 6px 0; line-height:1.5;">${escapeHtml(rawContent)}</div>
            ${isLong ? `
              <button type="button" class="news-expand-btn" data-expanded="false" style="padding:3px 10px; font-size:0.7rem; margin:4px 0 6px 0;">
                <span class="expand-btn-text">${escapeHtml(readMoreTxt)}</span>
              </button>
            ` : ''}
          </div>
          <span style="font-size:0.72rem; color:var(--neon-cyan);">📅 ${new Date(art.created_at || Date.now()).toLocaleDateString()}</span>
        </article>
      `;
    }).join('');

    homeNewsPreviewGrid.querySelectorAll('.home-news-card').forEach((card) => {
      const expandBtn = card.querySelector('.news-expand-btn');
      const snippetEl = card.querySelector('.news-snippet');
      const fullTextEl = card.querySelector('.news-full-text');

      const toggleHomeExpand = () => {
        if (!fullTextEl) return;
        const isExp = card.classList.contains('is-expanded');
        if (isExp) {
          if (snippetEl) snippetEl.style.display = 'block';
          fullTextEl.style.display = 'none';
          if (expandBtn) {
            expandBtn.setAttribute('data-expanded', 'false');
            const txt = expandBtn.querySelector('.expand-btn-text');
            if (txt) txt.textContent = readMoreTxt;
          }
          card.classList.remove('is-expanded');
        } else {
          if (snippetEl) snippetEl.style.display = 'none';
          fullTextEl.style.display = 'block';
          if (expandBtn) {
            expandBtn.setAttribute('data-expanded', 'true');
            const txt = expandBtn.querySelector('.expand-btn-text');
            if (txt) txt.textContent = showLessTxt;
          }
          card.classList.add('is-expanded');
        }
      };

      card.addEventListener('click', (e) => {
        if (e.target.closest('video, audio, a')) return;
        toggleHomeExpand();
      });
    });
  }

  // 4b. Universal Video Player & Photo Gallery Engine

  function getActiveMediaFilter() {
    const activeBtn = document.querySelector('.public-filter-btn.active[data-media-filter]');
    return activeBtn ? (activeBtn.getAttribute('data-media-filter') || 'all') : 'all';
  }
  let hlsInstances = [];

  function showVideoFallback(videoEl, url) {
    if (!videoEl || !url) return;
    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = url;
    }
  }

  // Universal Video Player Setup (Smooth Playback from 0:00 to End, No Interruption, No Looping)
  function setupVideoElement(videoEl, url) {
    if (!videoEl || !url) return;
    if (videoEl.dataset.playerInitialized === 'true') return;
    videoEl.dataset.playerInitialized = 'true';

    videoEl.loop = false; // Strictly prevent unexpected looping
    videoEl.preload = 'metadata'; // Fast metadata start: decodes first frame immediately and plays without delay
    videoEl.playsInline = true;

    // Auto-extract first frame as thumbnail to eliminate black box
    videoEl.addEventListener('loadeddata', function() {
      if (!videoEl.getAttribute('poster') || videoEl.getAttribute('poster') === '/images/hero-card-full.png') {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(640, videoEl.videoWidth || 640);
          canvas.height = Math.round((canvas.width * (videoEl.videoHeight || 360)) / (videoEl.videoWidth || 640));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          videoEl.poster = canvas.toDataURL('image/jpeg', 0.82);
        } catch (e) {}
      }
    });

    // Prevent network hiccups from restarting video from 0:00
    // Smooth streaming: Allow browser to buffer naturally without aborting TCP range streams
    videoEl.addEventListener('waiting', function() {
      console.log('[Video Player] Buffering stream at ' + videoEl.currentTime.toFixed(1) + 's...');
    });

    videoEl.addEventListener('playing', function() {
      // Resumed smoothly once buffer threshold reached
    });

    videoEl.addEventListener('error', function(e) {
      console.warn('[Video Player] Playback notice:', videoEl.error ? videoEl.error.message : e);
    });

    // Ensure clean completion when video reaches the end
    videoEl.addEventListener('ended', function() {
      // Finished cleanly - stays paused at the end!
    });

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
      }
    } else {
      if (videoEl.getAttribute('src') !== url) {
        videoEl.src = url;
      }
    }
  }

  // Setup Live TV Main Player with HLS or Camera Broadcast
  function setupLiveTvPlayer(streamUrl) {
    if (!tvPlayer) return;
    setupVideoElement(tvPlayer, streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  }

  // Real-time Live Broadcast sync (Red & blue blinking lights only show when video is live)
  try {
    const liveChannel = new BroadcastChannel('arab_hausa_live_channel');
    liveChannel.onmessage = (event) => {
      const homeSpotlight = document.getElementById('homeLiveTvSpotlight');
      const navLiveDot = document.getElementById('bottomNavTvLiveDot');
      const tvHeaderBeacon = document.getElementById('tvHeaderBeacon');
      const tvPlayerLiveTag = document.getElementById('tvPlayerLiveTag');

      if (event.data && event.data.type === 'camera_live_start') {
        if (homeSpotlight) homeSpotlight.style.display = 'block';
        if (navLiveDot) navLiveDot.style.display = 'inline-flex';
        if (tvHeaderBeacon) tvHeaderBeacon.style.display = 'inline-flex';
        if (tvPlayerLiveTag) tvPlayerLiveTag.style.display = 'inline-flex';
      } else if (event.data && event.data.type === 'camera_live_stop') {
        if (homeSpotlight) homeSpotlight.style.display = 'none';
        if (navLiveDot) navLiveDot.style.display = 'none';
        if (tvHeaderBeacon) tvHeaderBeacon.style.display = 'none';
        if (tvPlayerLiveTag) tvPlayerLiveTag.style.display = 'none';
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

  function isValidPublicMedia(m) {
    if (!m) return false;
    const u = String(m.url || m.stream_url || '');
    if (!u || u === '/images/logo.png') return false;
    return true;
  }

  function getLocalMediaStore() {
    try {
      const data = localStorage.getItem('arab_hausa_uploaded_media');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Deduplication Key Generator: Strict URL keying guarantees no duplicate cards across local & DB items
  function getMediaDeduplicationKey(m) {
    if (!m) return '';
    const u = (m.url || m.stream_url || '').trim().toLowerCase();
    if (u) return 'url:' + u;
    return 'id:' + String(m.id || m.name || Math.random());
  }

  function mergeMediaList(newItems, filterType = null) {
    if (!Array.isArray(newItems)) return;
    const activeFilter = filterType || getActiveMediaFilter();

    const mediaMap = new Map();

    // Authoritative server database records (single source of truth)
    newItems.forEach(m => {
      if (isValidPublicMedia(m)) {
        const norm = normalizeMediaType(m.type, m.media_type, m.url || m.stream_url);
        mediaMap.set(getMediaDeduplicationKey(m), {
          ...m,
          type: norm,
          media_type: norm === 'voicenote' ? 'Voice Note' : (norm === 'video' ? 'Video' : 'Photo'),
          duration: m.duration || null
        });
      }
    });

    // Chronological order (newest first)
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

    renderPublicHomeMedia(activeFilter);
    renderTvMedia();
    renderProgramsMedia();
    renderRadioVoiceNotes();
  }

  window.retryLoadPublicMedia = function() {
    loadPublicMedia();
  };

  async function loadPublicMedia(filterType = null) {
    const currentFilter = filterType || getActiveMediaFilter();

    // 1. Instant Cache Render: 0ms immediate display on page load/refresh from synchronous storage
    let localItems = [];
    try {
      const lsRaw = localStorage.getItem('arab_hausa_uploaded_media');
      if (lsRaw) localItems = JSON.parse(lsRaw);
    } catch (e) {}

    if (Array.isArray(localItems) && localItems.length > 0) {
      publicMediaItems = localItems.map(m => {
        const norm = normalizeMediaType(m.type, m.media_type, m.url || m.stream_url);
        return {
          ...m,
          type: norm,
          media_type: norm === 'voicenote' ? 'Voice Note' : (norm === 'video' ? 'Video' : 'Photo')
        };
      }).filter(isValidPublicMedia).sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime() || (Number(a.id) || 0);
        const timeB = new Date(b.created_at || 0).getTime() || (Number(b.id) || 0);
        return timeB - timeA;
      });
      renderPublicHomeMedia(currentFilter);
      renderTvMedia();
      renderRadioVoiceNotes();
    }

    // 2. Fetch from Permanent Database via /api/upload and /api/media (with resilient PHP fallbacks)
    let fetchFailed = false;
    try {
      const [uploadRes, mediaRes, staticRes] = await Promise.allSettled([
        apiFetch('upload?t=' + Date.now(), { timeout: 4500 }),
        fetchWithTimeout('/api/media?t=' + Date.now(), { cache: 'no-store' }, 4500).then(async r => {
          if (r && r.ok) return r.json();
          const rPhp = await fetchWithTimeout('/api-php/media.php?t=' + Date.now(), { cache: 'no-store' }, 3000);
          return rPhp && rPhp.ok ? rPhp.json() : null;
        }).catch(() => null),
        fetchWithTimeout('/data/media.json?t=' + Date.now(), { cache: 'no-store' }, 2500).then(r => r && r.ok ? r.json() : null)
      ]);

      let serverItems = [];
      if (uploadRes.status === 'fulfilled' && uploadRes.value && Array.isArray(uploadRes.value.media)) {
        uploadRes.value.media.forEach(item => {
          const normType = normalizeMediaType(item.type, item.media_type, item.url || item.stream_url);
          serverItems.push({
            ...item,
            type: normType,
            media_type: normType === 'voicenote' ? 'Voice Note' : (normType === 'video' ? 'Video' : 'Photo'),
            duration: item.duration || null
          });
        });
      }
      if (mediaRes.status === 'fulfilled' && Array.isArray(mediaRes.value) && mediaRes.value.length > 0) {
        mediaRes.value.forEach(item => {
          const normType = normalizeMediaType(item.type, item.media_type, item.url || item.stream_url);
          serverItems.push({
            id: item.id,
            type: normType,
            media_type: normType === 'voicenote' ? 'Voice Note' : (normType === 'video' ? 'Video' : 'Photo'),
            name: item.name || item.title || (normType === 'voicenote' ? 'Muryar Saƙo' : 'Media'),
            title: item.title || item.name || (normType === 'voicenote' ? 'Muryar Saƙo' : 'Media'),
            category: item.category || item.caption || (normType === 'voicenote' ? 'Sauti' : 'Media'),
            caption: item.caption || item.category || (normType === 'voicenote' ? 'Sauti' : 'Media'),
            destination: item.destination || 'tv',
            url: item.url || item.stream_url,
            stream_url: item.stream_url || item.url,
            poster_url: item.poster_url || '',
            duration: item.duration || null,
            size: item.size || 'HD Media',
            created_at: item.created_at
          });
        });
      }
      if (staticRes.status === 'fulfilled' && Array.isArray(staticRes.value) && staticRes.value.length > 0) {
        staticRes.value.forEach(item => {
          const normType = normalizeMediaType(item.type, item.media_type, item.url || item.stream_url);
          serverItems.push({
            ...item,
            type: normType,
            media_type: normType === 'voicenote' ? 'Voice Note' : (normType === 'video' ? 'Video' : 'Photo'),
            duration: item.duration || null
          });
        });
      }

      if (serverItems.length > 0) {
        mergeMediaList(serverItems, currentFilter);
      } else if (uploadRes.status === 'fulfilled' && uploadRes.value && Array.isArray(uploadRes.value.media)) {
        // Authoritative empty state from server (all media deleted or reset)
        publicMediaItems = [];
        try { localStorage.setItem('arab_hausa_uploaded_media', '[]'); } catch(e) {}
        renderPublicHomeMedia(currentFilter);
        renderTvMedia();
        renderProgramsMedia();
        renderRadioVoiceNotes();
      } else if (publicMediaItems.length === 0) {
        fetchFailed = (uploadRes.status === 'rejected' || !uploadRes.value) && (mediaRes.status === 'rejected' || !mediaRes.value);
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
        renderRadioVoiceNotes();
      }
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'arab_hausa_uploaded_media' || e.key === 'arab_hausa_media_sync') {
      loadPublicMedia();
    } else if (e.key === 'arab_hausa_news_sync') {
      loadNews();
    } else if (e.key === 'arab_hausa_schedule_sync') {
      loadSchedule();
    }
  });

  window.addEventListener('media-uploaded', () => {
    loadPublicMedia();
  });

  window.addEventListener('schedule-updated', () => {
    loadSchedule();
  });

  window.addEventListener('news-updated', () => {
    loadNews();
  });

  // Render HTML for a Single Media Item (100% Multi-Language Aware)
  function renderMediaItemHTML(m) {
    if (!m) return '';
    const lang = getActiveLanguage();
    const t = (window.translations && window.translations[lang]) || {};
    const dateLocales = { ar: 'ar-EG', fr: 'fr-FR', en: 'en-US', ha: 'ha-NG', ff: 'fr-SN', yo: 'yo-NG', sw: 'sw-KE' };
    const createdDate = new Date(m.created_at || Date.now()).toLocaleDateString(dateLocales[lang] || 'ha-NG');
    const mediaUrl = String(m.url || m.stream_url || '');
    const posterUrl = m.poster_url || '';

    const badgePhoto = t.badgePhoto || (lang === 'en' ? 'PHOTO' : (lang === 'ar' ? 'صورة' : (lang === 'fr' ? 'PHOTO' : (lang === 'ff' ? 'NATE' : (lang === 'yo' ? 'FÓTÒ' : (lang === 'sw' ? 'PICHA' : 'HOTO'))))));
    const badgeVideo = t.badgeVideo || (lang === 'en' ? 'VIDEO' : (lang === 'ar' ? 'فيديو' : (lang === 'fr' ? 'VIDÉO' : (lang === 'ff' ? 'WIDEYO' : (lang === 'yo' ? 'FÍDÍÒ' : (lang === 'sw' ? 'VIDEO' : 'BIDIYO'))))));
    const badgeAudio = t.badgeAudio || (lang === 'en' ? 'AUDIO' : (lang === 'ar' ? 'صوتي' : (lang === 'fr' ? 'AUDIO' : (lang === 'ff' ? 'SAWTI' : (lang === 'yo' ? 'OHUN' : (lang === 'sw' ? 'SAUTI' : 'SAUTI'))))));
    const voiceNoteLabel = t.badgeVoiceNote || (lang === 'en' ? 'Voice Note Dispatch' : (lang === 'ar' ? 'تسجيل صوتي' : (lang === 'fr' ? 'Message vocal' : (lang === 'ff' ? 'Ɗaɗol Haala' : (lang === 'yo' ? 'Àgbékalẹ̀ Ohùn' : (lang === 'sw' ? 'Ujumbe wa Sauti' : 'Muryar Saƙo'))))));

    const isLive = m.category === 'Kai Tsaye' || m.category === 'Live' || m.category === 'TV Broadcast';
    const displayCategory = isLive ? (t.badgeLive ? t.badgeLive : (lang === 'en' ? 'Live Broadcast' : 'Kai Tsaye')) : (m.category || (lang === 'en' ? 'Studio' : 'Tashar'));

    const dedupKey = getMediaDeduplicationKey(m);
    const itemType = normalizeMediaType(m.type, m.media_type, mediaUrl);

    if (itemType === 'photo') {
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

    if (itemType === 'video') {
      // Check YouTube Embed
      const ytMatch = mediaUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
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
      const isFb = /facebook\.com|fb\.watch/i.test(mediaUrl);
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

    if (itemType === 'voicenote') {
      const storedDuration = m.duration && isFinite(m.duration) && Number(m.duration) > 0 ? Number(m.duration) : '';
      const displayDurationText = storedDuration ? `${Math.floor(storedDuration / 60)}:${Math.floor(storedDuration % 60) < 10 ? '0' : ''}${Math.floor(storedDuration % 60)}` : '--:--';

      return `
        <div class="public-media-card voice-note-card" data-media-id="${m.id || ''}" data-media-key="${escapeHtml(dedupKey)}">
          <div class="public-media-preview voice-preview" style="height:140px; background:linear-gradient(135deg, #0B162C 0%, #172554 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden; border-radius:12px 12px 0 0;">
            <span class="public-media-badge" style="background:#C59B27; color:#0B162C; font-weight:800;">${badgeAudio}</span>
            <button class="voice-play-toggle-btn" aria-label="Play voice note" style="width:58px; height:58px; border-radius:50%; background:#C59B27; border:none; color:#0B162C; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 6px 18px rgba(197,155,39,0.35); transition:transform 0.15s ease, background 0.15s ease; outline:none; z-index:2;">
              <svg class="play-icon" width="26" height="26" viewBox="0 0 24 24" fill="#0B162C"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
              <svg class="pause-icon" width="26" height="26" viewBox="0 0 24 24" fill="#0B162C" style="display:none;"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            </button>
            <div class="voice-wave-visualizer" style="display:flex; align-items:flex-end; gap:3px; height:18px; margin-top:8px;">
              <span class="bar" style="width:3px; height:6px; background:#FBBF24; border-radius:2px;"></span>
              <span class="bar" style="width:3px; height:12px; background:#FBBF24; border-radius:2px;"></span>
              <span class="bar" style="width:3px; height:18px; background:#FBBF24; border-radius:2px;"></span>
              <span class="bar" style="width:3px; height:10px; background:#FBBF24; border-radius:2px;"></span>
              <span class="bar" style="width:3px; height:14px; background:#FBBF24; border-radius:2px;"></span>
              <span class="bar" style="width:3px; height:8px; background:#FBBF24; border-radius:2px;"></span>
            </div>
            <span style="color:#FBBF24; font-size:0.75rem; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; margin-top:6px;">${voiceNoteLabel}</span>
          </div>
          <div class="public-media-body" style="padding:14px;">
            <audio class="voice-audio-element" preload="metadata" playsinline data-stored-duration="${storedDuration}" src="${escapeHtml(mediaUrl)}" style="display:none;"></audio>
            <div class="voice-progress-container" style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
              <span class="voice-time-current" style="font-size:0.75rem; color:var(--text-muted); font-variant-numeric:tabular-nums; min-width:32px;">0:00</span>
              <div class="voice-timeline-track" style="flex:1; height:6px; background:rgba(255,255,255,0.14); border-radius:3px; position:relative; cursor:pointer;">
                <div class="voice-timeline-bar" style="width:0%; height:100%; background:#C59B27; border-radius:3px; transition:width 0.1s linear;"></div>
              </div>
              <span class="voice-time-duration" style="font-size:0.75rem; color:var(--text-muted); font-variant-numeric:tabular-nums; min-width:32px;">${displayDurationText}</span>
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

      const getDuration = () => {
        if (audioEl.duration && isFinite(audioEl.duration) && audioEl.duration > 0) {
          return audioEl.duration;
        }
        const stored = parseFloat(audioEl.dataset.storedDuration);
        if (!isNaN(stored) && stored > 0) return stored;
        return 0;
      };

      const resolveWebMDuration = () => {
        if (audioEl.duration === Infinity) {
          audioEl.currentTime = 1e101;
          audioEl.ontimeupdate = function() {
            this.ontimeupdate = null;
            this.currentTime = 0;
            const dur = getDuration();
            if (dur && durTimeEl) durTimeEl.textContent = formatTime(dur);
          };
        }
      };

      const setPlayingUI = (playing) => {
        if (playIcon) playIcon.style.display = playing ? 'none' : 'block';
        if (pauseIcon) pauseIcon.style.display = playing ? 'block' : 'none';
        if (toggleBtn) {
          toggleBtn.style.transform = playing ? 'scale(1.08)' : 'scale(1)';
          toggleBtn.style.background = playing ? '#EAB308' : '#C59B27';
        }
        const waveBars = card.querySelectorAll('.voice-wave-visualizer .bar');
        waveBars.forEach((b, idx) => {
          if (playing) {
            b.style.animation = `voiceWaveAnim 0.7s infinite ease-in-out ${idx * 0.1}s alternate`;
          } else {
            b.style.animation = 'none';
          }
        });
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
        const dur = getDuration();
        if (!dur || dur <= 0) return;
        const pct = Math.min(100, Math.max(0, (audioEl.currentTime / dur) * 100));
        if (bar) bar.style.width = `${pct}%`;
        if (currTimeEl) currTimeEl.textContent = formatTime(audioEl.currentTime);
      });

      audioEl.addEventListener('loadedmetadata', () => {
        const dur = getDuration();
        if (dur && durTimeEl) durTimeEl.textContent = formatTime(dur);
        if (audioEl.duration === Infinity) resolveWebMDuration();
      });
      if (audioEl.readyState >= 1) {
        const dur = getDuration();
        if (dur && durTimeEl) durTimeEl.textContent = formatTime(dur);
        if (audioEl.duration === Infinity) resolveWebMDuration();
      }

      audioEl.addEventListener('error', () => {
        if (errorEl) errorEl.style.display = 'block';
        setPlayingUI(false);
      });

      const seekAudio = (e) => {
        e.stopPropagation();
        const rect = track.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clickPos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const dur = getDuration();
        if (dur && dur > 0) {
          audioEl.currentTime = clickPos * dur;
          if (bar) bar.style.width = `${clickPos * 100}%`;
          if (currTimeEl) currTimeEl.textContent = formatTime(audioEl.currentTime);
        }
      };

      if (track) {
        track.addEventListener('click', seekAudio);
        track.addEventListener('touchstart', seekAudio, { passive: true });
      }
    });
  }

  function isAnyMediaPlaying(container) {
    if (!container) return false;
    const videos = container.querySelectorAll('video');
    for (const v of videos) {
      if (!v.paused && !v.ended && v.currentTime > 0) return true;
    }
    const audios = container.querySelectorAll('audio');
    for (const a of audios) {
      if (!a.paused && !a.ended && a.currentTime > 0) return true;
    }
    return false;
  }

  // Surgical Non-Destructive DOM Reconciliation (Preserves active playback while guaranteeing exact DB catalog)
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
    const hasUnmanagedCard = existingCards.some(c => !c.getAttribute('data-media-key'));

    // Full clean reconciliation if fresh mount, unmanaged cards present, or no media actively playing
    if (existingCards.length === 0 || hasUnmanagedCard || !isAnyMediaPlaying(container)) {
      const targetKeys = items.map(m => getMediaDeduplicationKey(m)).join('|');
      const currentKeys = existingCards.map(c => c.getAttribute('data-media-key') || '').join('|');
      if (targetKeys !== currentKeys || hasUnmanagedCard) {
        container.innerHTML = items.map(m => renderMediaItemHTML(m)).join('');
        initRenderedMedia(container);
      }
      return;
    }

    // Media is actively playing: Surgical non-destructive DOM reconciliation
    const mountedKeySet = new Set();
    existingCards.forEach(c => {
      const k = c.getAttribute('data-media-key');
      const id = c.getAttribute('data-media-id');
      if (k) mountedKeySet.add(k);
      if (id) mountedKeySet.add(id);
    });

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

  function renderPublicHomeMedia(filterType = null) {
    const grid = document.getElementById('homeMediaGrid') || homeMediaGrid;
    if (!grid) return;
    const activeFilter = filterType || getActiveMediaFilter();
    let items = publicMediaItems;
    if (activeFilter && activeFilter !== 'all') {
      items = publicMediaItems.filter(m => {
        const t = normalizeMediaType(m.type, m.media_type, m.url || m.stream_url);
        if (activeFilter === 'voicenote' || activeFilter === 'audio') {
          return t === 'voicenote';
        }
        return t === activeFilter;
      });
    }
    syncMediaGrid(grid, items);
  }

  function renderTvMedia() {
    const grid = document.getElementById('tvMediaGrid') || tvMediaGrid;
    if (!grid) return;
    const media = publicMediaItems.filter(m => {
      const t = normalizeMediaType(m.type, m.media_type, m.url || m.stream_url);
      const isTv = (m.destination !== 'programs');
      return isTv && (t === 'video' || t === 'photo');
    });
    syncMediaGrid(grid, media);
  }

  function renderProgramsMedia() {
    const grid = document.getElementById('programsMediaGrid');
    if (!grid) return;
    const programsVideos = publicMediaItems.filter(m => {
      const t = normalizeMediaType(m.type, m.media_type, m.url || m.stream_url);
      const isPrograms = (m.destination === 'programs');
      return isPrograms && (t === 'video');
    });
    syncMediaGrid(grid, programsVideos, 'Babu wani bidiyo da aka ɗora a sashin Programs tukunna.');
  }

  function renderRadioVoiceNotes() {
    const grid = document.getElementById('radioMediaGrid') || radioMediaGrid;
    if (!grid) return;
    const voiceNotes = publicMediaItems.filter(m => {
      const t = normalizeMediaType(m.type, m.media_type, m.url || m.stream_url);
      return t === 'voicenote';
    });
    syncMediaGrid(grid, voiceNotes);
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

  // 7. Listen for Language Change Event (100% Comprehensive Instant Language Switch)
  window.addEventListener('languageChanged', (e) => {
    const { lang, t } = e.detail;
    // Update active button state in settings
    document.querySelectorAll('.lang-btn-option').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    // Update active modal cards
    document.querySelectorAll('.lang-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-lang') === lang);
    });

    // Update header badge
    const headerLangLabel = document.getElementById('headerLangLabel');
    if (headerLangLabel) headerLangLabel.textContent = lang.toUpperCase();

    // Immediately refresh ticker
    if (t.tickerText && typeof window.updateLiveTicker === 'function') {
      window.updateLiveTicker(t.tickerText);
    }

    // Immediately refresh hero show title
    const localizedShow = t.heroShowTitle || t.show1Title;
    if (localizedShow) {
      if (currentShowText) currentShowText.textContent = localizedShow;
      if (homeShowTitle) homeShowTitle.textContent = localizedShow;
    }

    // Re-render schedule and news in the selected language while preserving real admin articles!
    const savedNews = (() => {
      try { return JSON.parse(localStorage.getItem('arab_hausa_cached_news') || '[]'); } catch(e) { return []; }
    })();
    if (Array.isArray(savedNews) && savedNews.length > 0) {
      renderNews(savedNews);
      renderHomeNewsPreview(savedNews.slice(0, 3));
    } else {
      renderNews(getLocalizedNews());
      renderHomeNewsPreview(getLocalizedNews().slice(0, 3));
    }

    const savedSched = (() => {
      try { return JSON.parse(localStorage.getItem('arab_hausa_cached_schedule') || '[]'); } catch(e) { return []; }
    })();
    if (Array.isArray(savedSched) && savedSched.length > 0) {
      renderSchedule(savedSched);
    } else {
      renderSchedule(getLocalizedSchedule());
    }
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

  // Real-Time High-Speed Event Sync (Zero Session Locks, Instant Non-Blocking Return)
  function initRealtimeUpdates() {
    let lastEventId = 0;

    function handleIncomingMedia(item) {
      if (!item || (!item.url && !item.stream_url) || !isValidPublicMedia(item)) return;
      const normType = normalizeMediaType(item.type, item.media_type, item.url || item.stream_url);
      const formatted = {
        id: item.id || Date.now(),
        type: normType,
        media_type: normType === 'voicenote' ? 'Voice Note' : (normType === 'video' ? 'Video' : 'Photo'),
        name: item.name || item.title || (normType === 'voicenote' ? 'Muryar Saƙo' : 'Media'),
        category: item.category || item.caption || (normType === 'voicenote' ? 'Sauti' : 'TV Broadcast'),
        destination: item.destination || 'tv',
        url: item.stream_url || item.url,
        stream_url: item.stream_url || item.url,
        poster_url: item.poster_url || '',
        duration: item.duration || null,
        size: item.size || 'HD Media',
        created_at: item.created_at || new Date().toISOString()
      };
      publicMediaItems = publicMediaItems.filter(m => isValidPublicMedia(m) && String(m.id) !== String(formatted.id) && m.url !== formatted.url && m.name !== formatted.name);
      publicMediaItems.unshift(formatted);
      try {
        localStorage.setItem('arab_hausa_uploaded_media', JSON.stringify(publicMediaItems));
      } catch(e) {}
      renderPublicHomeMedia();
      renderTvMedia();
      renderProgramsMedia();
      renderRadioVoiceNotes();
    }

    function handleIncomingDelete(ev) {
      const delId = String((ev.data && ev.data.id) || ev.id || '');
      if (!delId) return;
      publicMediaItems = publicMediaItems.filter(m => String(m.id) !== delId && String(m.url) !== delId);
      try {
        localStorage.setItem('arab_hausa_uploaded_media', JSON.stringify(publicMediaItems));
      } catch(e) {}
      renderPublicHomeMedia();
      renderTvMedia();
      renderProgramsMedia();
      renderRadioVoiceNotes();
    }

    function processEventBatch(events) {
      if (!Array.isArray(events) || events.length === 0) return;
      events.forEach(ev => {
        const evId = Number(ev.id) || 0;
        if (evId > lastEventId) lastEventId = evId;
        if (ev.type === 'media_uploaded') {
          handleIncomingMedia(ev.data || ev);
        } else if (ev.type === 'media_updated') {
          const updated = ev.data || ev;
          const uId = String(updated.id || '');
          publicMediaItems = publicMediaItems.map(m => {
            if (String(m.id) === uId || (updated.url && m.url === updated.url)) {
              return {
                ...m,
                ...updated,
                destination: updated.destination || m.destination || 'tv',
                name: updated.name || updated.title || m.name,
                title: updated.title || updated.name || m.title,
                category: updated.category || updated.caption || m.category
              };
            }
            return m;
          });
          try {
            localStorage.setItem('arab_hausa_uploaded_media', JSON.stringify(publicMediaItems));
          } catch(e) {}
          renderPublicHomeMedia();
          renderTvMedia();
          renderProgramsMedia();
          renderRadioVoiceNotes();
        } else if (ev.type === 'media_deleted') {
          handleIncomingDelete(ev);
        } else if (ev.type === 'post_published' || ev.type === 'post_deleted') {
          loadNews();
        } else if (ev.type === 'schedule_updated') {
          loadSchedule();
        }
      });
    }

    // 1. Zero-Latency Server-Sent Events (SSE) Live Feed with Auto-Reconnect
    let eventSource = null;
    function connectEventSource() {
      if (typeof window.EventSource === 'undefined') return;
      try {
        if (eventSource) eventSource.close();
        eventSource = new EventSource(`/api/events?stream=1&last_id=${lastEventId}`);
        
        eventSource.onmessage = (e) => {
          try {
            const ev = JSON.parse(e.data);
            if (ev) processEventBatch([ev]);
          } catch(err) {}
        };

        eventSource.addEventListener('media_uploaded', (e) => {
          try {
            const ev = JSON.parse(e.data);
            if (ev) processEventBatch([ev]);
          } catch(err) {}
        });

        eventSource.addEventListener('media_updated', (e) => {
          try {
            const ev = JSON.parse(e.data);
            if (ev) processEventBatch([ev]);
          } catch(err) {}
        });

        eventSource.addEventListener('media_deleted', (e) => {
          try {
            const ev = JSON.parse(e.data);
            if (ev) processEventBatch([ev]);
          } catch(err) {}
        });

        eventSource.addEventListener('post_published', (e) => {
          try {
            const ev = JSON.parse(e.data);
            if (ev) processEventBatch([ev]);
          } catch(err) {}
        });

        eventSource.onerror = () => {
          // EventSource will auto-reconnect; keep polling backup active
        };
      } catch(e) {}
    }

    connectEventSource();

    // 2. High-Performance Polling Safety Net: Ensures 100% reliability even if SSE is blocked by proxy
    setInterval(async () => {
      try {
        const res = await fetchWithTimeout('/data/events.json?t=' + Date.now(), 2000);
        if (res && res.ok) {
          const events = await res.json().catch(() => null);
          if (Array.isArray(events) && events.length > 0) {
            if (lastEventId === 0) {
              lastEventId = Math.max(...events.map(e => Number(e.id) || 0));
            } else {
              const newEvents = events.filter(e => (Number(e.id) || 0) > lastEventId);
              if (newEvents.length > 0) {
                processEventBatch(newEvents);
              }
            }
            return;
          }
        }
      } catch (err) {}

      // Fallback to PHP dispatcher if static file not available
      try {
        const res = await fetchWithTimeout('/api/events?poll=1&last_id=' + lastEventId + '&t=' + Date.now(), 2000);
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data && Array.isArray(data.events) && data.events.length > 0) {
            processEventBatch(data.events);
          }
        }
      } catch (err) {}
    }, 2500);
  }

  // 0ms Synchronous Startup Cache Render: Instant display before any async tasks
  try {
    const startupMedia = localStorage.getItem('arab_hausa_uploaded_media');
    if (startupMedia) {
      const parsed = JSON.parse(startupMedia);
      if (Array.isArray(parsed) && parsed.length > 0) {
        publicMediaItems = parsed.map(m => {
          const norm = normalizeMediaType(m.type, m.media_type, m.url || m.stream_url);
          return {
            ...m,
            type: norm,
            media_type: norm === 'voicenote' ? 'Voice Note' : (norm === 'video' ? 'Video' : 'Photo')
          };
        }).filter(isValidPublicMedia).sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime() || (Number(a.id) || 0);
          const timeB = new Date(b.created_at || 0).getTime() || (Number(b.id) || 0);
          return timeB - timeA;
        });
        try { localStorage.setItem('arab_hausa_uploaded_media', JSON.stringify(publicMediaItems)); } catch(e) {}
        renderPublicHomeMedia();
        renderTvMedia();
        renderRadioVoiceNotes();
      }
    }
  } catch(e) {}

  loadSettings();
  loadSchedule();
  loadNews();
  loadPublicMedia();
  initRealtimeUpdates();

  // Handle initial page load from URL hash now that all components & functions are ready
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

  // Auto-refresh feeds every 30 seconds as background polling safety net
  setInterval(() => {
    loadNews();
    loadPublicMedia();
    loadSettings();
    loadSchedule();
  }, 30000);
});
