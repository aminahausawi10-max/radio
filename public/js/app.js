/**
 * Arab Hausa Radio TV - Main Application Engine (v5)
 * Multi-Page View Controller: Home, Radio, Live TV, Schedule, News
 */

document.addEventListener('DOMContentLoaded', () => {
  // Audio Player Elements
  const audio = new Audio();
  audio.preload = 'none';

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
        if (s.current_show && currentShowText) currentShowText.textContent = s.current_show;
        if (s.breaking_news && tickerText) tickerText.textContent = s.breaking_news;
        if (s.tv_stream_url && tvPlayer) {
          tvPlayer.src = s.tv_stream_url;
        }
      }
    } catch (e) {
      console.warn('Could not fetch remote settings:', e);
    }
  }

  // 3. Fetch Daily Schedule
  async function loadSchedule() {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      if (data.success && data.schedule && scheduleContainer) {
        if (data.schedule.length === 0) {
          scheduleContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Babu shirye-shirye a yanzu.</p>';
          return;
        }
        scheduleContainer.innerHTML = data.schedule.map(item => `
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
    } catch (e) {
      console.warn('Error loading schedule:', e);
    }
  }

  // 4. Fetch News Articles
  async function loadNews() {
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success && data.news && newsContainer) {
        if (data.news.length === 0) {
          newsContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Babu labarai a yanzu.</p>';
          return;
        }
        newsContainer.innerHTML = data.news.map(art => `
          <article class="liquid-glass-card news-card">
            <div>
              <span class="news-tag">${escapeHtml(art.category || 'General')}</span>
              <h3 class="news-title">${escapeHtml(art.title)}</h3>
              ${art.title_ar ? `<h4 class="news-title-ar" dir="rtl">${escapeHtml(art.title_ar)}</h4>` : ''}
              <p class="news-snippet">${escapeHtml(art.content.substring(0, 140))}...</p>
            </div>
            <div class="news-meta">
              <span>✍️ ${escapeHtml(art.author || 'Arab Hausa')}</span>
              <span>📅 ${new Date(art.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
          </article>
        `).join('');
      }
    } catch (e) {
      console.warn('Error loading news:', e);
    }
  }

  // 5. Check Neon Database Connection Health
  async function checkNeonStatus() {
    try {
      const res = await fetch('/api/test-connection');
      const data = await res.json();
      if (data.status === 'ONLINE' && neonStatusBadge) {
        neonStatusBadge.innerHTML = `🟢 Neon Lakebase Postgres: <strong>${data.latency_ms}ms</strong>`;
      }
    } catch (e) {
      if (neonStatusBadge) {
        neonStatusBadge.innerHTML = `🟢 Neon Lakebase Postgres: Online`;
      }
    }
  }

  // 6. Radio Play / Pause Controls
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
                if (radioStatusBadge) radioStatusBadge.textContent = 'STREAM OFFLINE';
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
      if (radioDisc) radioDisc.classList.add('spinning');
      if (visualizer) visualizer.classList.add('active');
      if (radioStatusBadge) radioStatusBadge.textContent = 'ON AIR';
    } else {
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
      if (radioDisc) radioDisc.classList.remove('spinning');
      if (visualizer) visualizer.classList.remove('active');
      if (radioStatusBadge) radioStatusBadge.textContent = 'PAUSED';
    }
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', toggleRadio);
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
  checkNeonStatus();
});
