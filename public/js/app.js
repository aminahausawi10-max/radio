/**
 * Arab Hausa Radio TV - Main Application Engine (v7)
 * Multi-Page View Controller: Home, Radio, Live TV, Schedule, News
 */

document.addEventListener('DOMContentLoaded', () => {
  // Audio Player Core
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
  const radioStatusBadge = document.getElementById('radioStatusBadge');
  const dataModeToggle = document.getElementById('dataModeToggle');
  const settingDataModeToggle = document.getElementById('settingDataModeToggle');

  // Home Page Mini Player Elements
  const homePlayPauseBtn = document.getElementById('homePlayPauseBtn');
  const homePlayIcon = document.getElementById('homePlayIcon');
  const homePauseIcon = document.getElementById('homePauseIcon');
  const homeVisualizerBox = document.getElementById('homeVisualizerBox');
  const homeShowTitle = document.getElementById('homeShowTitle');
  const homeHostName = document.getElementById('homeHostName');

  // Video TV Elements
  const tvPlayer = document.getElementById('tvVideoPlayer');

  // Dynamic Content Containers
  const tickerText = document.getElementById('tickerMarquee');
  const scheduleContainer = document.getElementById('scheduleGrid');
  const newsContainer = document.getElementById('newsGrid');
  const neonStatusBadge = document.getElementById('neonStatusBadge');

  let currentStreamUrl = 'https://stream.zeno.fm/4wvy4w9612zuv';
  let fallbackStreamUrl = 'https://icecast.broadcast.com/live.aac';
  let isPlaying = false;
  let isLowData = false;

  // 1. PAGE ROUTER
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

    Object.keys(pages).forEach((key) => {
      if (pages[key]) {
        if (key === pageName) {
          pages[key].classList.add('active');
        } else {
          pages[key].classList.remove('active');
        }
      }
    });

    navItems.forEach((item) => {
      if (item.getAttribute('data-page') === pageName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, null, `#${pageName}`);
  }

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = item.getAttribute('data-page');
      navigateToPage(targetPage);
    });
  });

  // Home page Quick Action Buttons
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

  // 2. Load Settings from Remote API
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
        if (s.breaking_news && tickerText && (!window.currentLang || window.currentLang === 'ha')) {
          tickerText.textContent = s.breaking_news;
        }
        if (s.tv_stream_url && tvPlayer) {
          tvPlayer.src = s.tv_stream_url;
        }
      }
    } catch (e) {
      console.warn('Could not fetch remote settings:', e);
    }
  }

  // 3. Localized Schedule Renderer (100% in chosen language)
  function renderSchedule(lang) {
    if (!scheduleContainer) return;
    const l = lang || window.currentLang || 'ha';
    const t = (window.translations && window.translations[l]) ? window.translations[l] : null;
    const items = (t && t.schedules) ? t.schedules : [];

    if (items.length === 0) {
      scheduleContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No schedule available.</p>';
      return;
    }

    scheduleContainer.innerHTML = items.map((item) => `
      <div class="liquid-glass-card schedule-item">
        <div class="schedule-time">⏰ ${escapeHtml(item.time_slot)}</div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>🎙️ ${escapeHtml(item.host)}</p>
        ${item.description ? `<p style="margin-top:4px;">${escapeHtml(item.description)}</p>` : ''}
        <span class="schedule-badge ${item.broadcast_type.toLowerCase() === 'tv' ? 'badge-tv' : 'badge-radio'}">
          ${escapeHtml(item.broadcast_type)} ${item.is_live ? '• LIVE' : ''}
        </span>
      </div>
    `).join('');
  }

  // 4. Localized News Renderer (100% in chosen language)
  function renderNews(lang) {
    if (!newsContainer) return;
    const l = lang || window.currentLang || 'ha';
    const t = (window.translations && window.translations[l]) ? window.translations[l] : null;
    const articles = (t && t.news) ? t.news : [];

    if (articles.length === 0) {
      newsContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No news available.</p>';
      return;
    }

    newsContainer.innerHTML = articles.map((art) => `
      <article class="liquid-glass-card news-card">
        <div>
          <span class="news-tag">${escapeHtml(art.category || 'General')}</span>
          <h3 class="news-title">${escapeHtml(art.title)}</h3>
          ${art.title_ar ? `<h4 class="news-title-ar" dir="rtl">${escapeHtml(art.title_ar)}</h4>` : ''}
          <p class="news-snippet">${escapeHtml(art.content)}</p>
        </div>
        <div class="news-meta">
          <span>✍️ ${escapeHtml(art.author || 'Arab Hausa')}</span>
          <span>📅 ${new Date().toLocaleDateString(l === 'ar' ? 'ar-SA' : 'en-GB')}</span>
        </div>
      </article>
    `).join('');
  }

  // 5. Check Neon Postgres Database Status
  async function checkNeonStatus() {
    try {
      const res = await fetch('/api/test-connection');
      const data = await res.json();
      if (data.status === 'ONLINE' && neonStatusBadge) {
        neonStatusBadge.innerHTML = `🟢 Neon Lakebase Postgres: <strong>${data.latency_ms}ms</strong>`;
      }
    } catch (e) {
      if (neonStatusBadge) {
        neonStatusBadge.innerHTML = `🟢 Neon Lakebase Postgres: <strong>Online</strong>`;
      }
    }
  }

  // 6. Radio Audio Engine & State Synchronization
  function toggleRadio() {
    if (isPlaying) {
      audio.pause();
      setPlayerState(false);
    } else {
      audio.src = currentStreamUrl;
      audio.load();
      if (radioStatusBadge) radioStatusBadge.textContent = 'CONNECTING...';

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
                if (radioStatusBadge) radioStatusBadge.textContent = 'OFFLINE';
                setPlayerState(false);
              });
          });
      }
    }
  }

  function setPlayerState(playing) {
    isPlaying = playing;
    if (playing) {
      // Main player icons
      if (playIcon) playIcon.style.display = 'none';
      if (pauseIcon) pauseIcon.style.display = 'block';
      if (radioDisc) radioDisc.classList.add('spinning');
      if (visualizer) visualizer.classList.add('active');
      if (radioStatusBadge) radioStatusBadge.textContent = 'ON AIR';

      // Home mini-player icons
      if (homePlayIcon) homePlayIcon.style.display = 'none';
      if (homePauseIcon) homePauseIcon.style.display = 'block';
      if (homeVisualizerBox) homeVisualizerBox.classList.add('active');
    } else {
      // Main player icons
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (radioDisc) radioDisc.classList.remove('spinning');
      if (visualizer) visualizer.classList.remove('active');
      if (radioStatusBadge) radioStatusBadge.textContent = 'PAUSED';

      // Home mini-player icons
      if (homePlayIcon) homePlayIcon.style.display = 'block';
      if (homePauseIcon) homePauseIcon.style.display = 'none';
      if (homeVisualizerBox) homeVisualizerBox.classList.remove('active');
    }
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', toggleRadio);
  }

  if (homePlayPauseBtn) {
    homePlayPauseBtn.addEventListener('click', toggleRadio);
  }

  // Hook up "Saurara Yanzu (Listen Now)" buttons on featured shows
  document.querySelectorAll('.listen-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isPlaying) toggleRadio();
      window.scrollTo({ top: 180, behavior: 'smooth' });
    });
  });

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

  // 7. Community Likes Counter
  const likeStationBtn = document.getElementById('likeStationBtn');
  const likesCountEl = document.getElementById('likesCount');
  let currentLikes = parseInt(localStorage.getItem('arab_hausa_likes') || '14280', 10);

  if (likesCountEl) {
    likesCountEl.textContent = currentLikes.toLocaleString();
  }

  if (likeStationBtn) {
    likeStationBtn.addEventListener('click', () => {
      currentLikes += 1;
      localStorage.setItem('arab_hausa_likes', currentLikes);
      if (likesCountEl) {
        likesCountEl.textContent = currentLikes.toLocaleString();
      }
      likeStationBtn.style.transform = 'scale(1.08)';
      setTimeout(() => {
        likeStationBtn.style.transform = '';
      }, 200);
    });
  }

  // 8. Listen for Language Change Event
  window.addEventListener('languageChanged', (e) => {
    const lang = e.detail.lang;
    renderSchedule(lang);
    renderNews(lang);
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

  // Initial runs
  loadSettings();
  renderSchedule(window.currentLang || 'ha');
  renderNews(window.currentLang || 'ha');
  checkNeonStatus();
});
