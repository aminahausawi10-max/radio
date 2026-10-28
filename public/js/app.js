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

  // 2. Fetch Station Settings & Stream URLs
  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        if (s.radio_stream_url) currentStreamUrl = s.radio_stream_url;
        if (s.radio_fallback_url) fallbackStreamUrl = s.radio_fallback_url;
        if (s.current_show) {
          if (currentShowText) currentShowText.textContent = s.current_show;
          if (homeShowTitle) homeShowTitle.textContent = s.current_show;
        }
        if (s.breaking_news && tickerText) tickerText.textContent = s.breaking_news;
        if (s.tv_stream_url && tvPlayer) {
          tvPlayer.src = s.tv_stream_url;
        }
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

  // 3. Fetch Daily Schedule
  async function loadSchedule() {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      const list = (data.success && Array.isArray(data.schedule) && data.schedule.length > 0) ? data.schedule : defaultSchedule;
      renderSchedule(list);
    } catch (e) {
      renderSchedule(defaultSchedule);
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
        <span class="schedule-badge ${item.broadcast_type.toLowerCase() === 'tv' ? 'badge-tv' : 'badge-radio'}">
          ${escapeHtml(item.broadcast_type)} ${item.is_live ? '• LIVE' : ''}
        </span>
      </div>
    `).join('');
  }

  // Default Fallback News
  const defaultNews = [
    { title: 'Bude Sabuwar Tashar Arab Hausa a Yanar Gizo', category: 'LABARAI', content: 'An kaddamar da cikakkiyar manhajar Arab Hausa Radio da TV don watsa shirye-shiryen kai tsaye zuwa ga al\'ummar Hausawa da kasashen Larabawa a fadin duniya.', author: 'Arab Hausa Desk', created_at: new Date().toISOString() },
    { title: 'Hadin Kan Al\'adun Hausawa da Kasashen Larabawa', category: 'AL\'ADU', content: 'Wani taron karawa juna sani ya gudana kan yadda kafafen yada labarai na zamani ke habaka fahimtar al\'adu, harshe, da kasuwanci a tsakanin Afirka da Gabas ta Tsakiya.', author: 'Sashen Al\'adu', created_at: new Date().toISOString() },
    { title: 'Shirye-shiryen Ilimantarwa da Koyar da Harshen Larabci', category: 'ILIMI', content: 'Tashar ta fara gabatar da sababbin dabarun koyar da harshen Larabci cikin sauki ta rediyo da talabijin don amfanin dalibai da masu sha\'awar ilimi.', author: 'Sashen Ilimi', created_at: new Date().toISOString() }
  ];

  // 4. Fetch News Articles
  async function loadNews() {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      const list = (data.success && Array.isArray(data.news) && data.news.length > 0) ? data.news : defaultNews;
      renderNews(list);
      renderHomeNewsPreview(list.slice(0, 2));
    } catch (e) {
      renderNews(defaultNews);
      renderHomeNewsPreview(defaultNews.slice(0, 2));
    }
  }

  function renderNews(list) {
    if (!newsContainer) return;
    newsContainer.innerHTML = list.map(art => `
      <article class="liquid-glass-card news-card">
        <div>
          <span class="news-tag">${escapeHtml(art.category || 'LABARAI')}</span>
          <h3 class="news-title">${escapeHtml(art.title)}</h3>
          ${art.title_ar ? `<h4 class="news-title-ar" dir="rtl">${escapeHtml(art.title_ar)}</h4>` : ''}
          <p class="news-snippet">${escapeHtml(art.content ? art.content.substring(0, 160) : '')}...</p>
        </div>
        <div class="news-meta">
          <span>✍️ ${escapeHtml(art.author || 'Arab Hausa')}</span>
          <span>📅 ${new Date(art.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
      </article>
    `).join('');
  }

  function renderHomeNewsPreview(list) {
    if (!homeNewsPreviewGrid) return;
    homeNewsPreviewGrid.innerHTML = list.map(art => `
      <article class="liquid-glass-card" style="padding:14px; margin-bottom:10px;">
        <span class="feature-pill" style="font-size:0.68rem; padding:3px 8px; margin-bottom:6px; display:inline-flex;">${escapeHtml(art.category || 'LABARAI')}</span>
        <h4 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0 0 4px 0;">${escapeHtml(art.title)}</h4>
        <p style="font-size:0.8rem; color:var(--text-muted); margin:0 0 8px 0; line-height:1.4;">${escapeHtml(art.content ? art.content.substring(0, 120) : '')}...</p>
        <span style="font-size:0.72rem; color:var(--neon-cyan);">📅 ${new Date(art.created_at || Date.now()).toLocaleDateString()}</span>
      </article>
    `).join('');
  }

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
      if (radioStatusBadge) radioStatusBadge.textContent = 'ON AIR';
      if (homeOnAirBadge) homeOnAirBadge.textContent = 'KAI TSAYE (LIVE)';
    } else {
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (homePlayIcon) homePlayIcon.style.display = 'block';
      if (homePauseIcon) homePauseIcon.style.display = 'none';
      if (radioDisc) radioDisc.classList.remove('spinning');
      if (homeDiscThumb) homeDiscThumb.classList.remove('spinning');
      if (visualizer) visualizer.classList.remove('active');
      if (homeVisualizer) homeVisualizer.classList.remove('active');
      if (radioStatusBadge) radioStatusBadge.textContent = 'PAUSED';
      if (homeOnAirBadge) homeOnAirBadge.textContent = 'PAUSED';
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
    const { lang } = e.detail;
    // Update active button state in settings
    document.querySelectorAll('.lang-btn-option').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
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
});
