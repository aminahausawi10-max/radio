/**
 * Arab Hausa Radio TV - Main Application Engine (v11)
 * Multi-Page View Controller: Home, Radio, Live TV, Schedule, News
 * Modern Blue-and-White Design System
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

  // Home Page On-Air Player Elements
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
  const homeNewsPreviewGrid = document.getElementById('homeNewsPreviewGrid');

  // User Portal Elements
  const openUserPortalBtn = document.getElementById('openUserPortalBtn');
  const closeUserPortalBtn = document.getElementById('closeUserPortalBtn');
  const userPortalModal = document.getElementById('userPortalModal');
  const portalTabLogin = document.getElementById('portalTabLogin');
  const portalTabRegister = document.getElementById('portalTabRegister');
  const portalTabProfile = document.getElementById('portalTabProfile');
  const portalLoginView = document.getElementById('portalLoginView');
  const portalRegisterView = document.getElementById('portalRegisterView');
  const portalProfileView = document.getElementById('portalProfileView');
  const portalLoginForm = document.getElementById('portalLoginForm');
  const portalRegisterForm = document.getElementById('portalRegisterForm');
  const portalLogoutBtn = document.getElementById('portalLogoutBtn');
  const portalProfileName = document.getElementById('portalProfileName');
  const portalProfileEmail = document.getElementById('portalProfileEmail');
  const portalLoginStatus = document.getElementById('portalLoginStatus');
  const portalRegStatus = document.getElementById('portalRegStatus');

  // Drawer Elements
  const openSearchBtn = document.getElementById('openSearchBtn');
  const openMenuBtn = document.getElementById('openMenuBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const mobileDrawerOverlay = document.getElementById('mobileDrawerOverlay');
  const drawerSearchInput = document.getElementById('drawerSearchInput');
  const drawerSearchResults = document.getElementById('drawerSearchResults');

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

  // Home Page Quick Action Buttons
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

  const viewAllNewsBtn = document.getElementById('viewAllNewsBtn');
  if (viewAllNewsBtn) {
    viewAllNewsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToPage('news');
    });
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
        <h4 style="color:var(--dark-navy); margin: 4px 0;">${escapeHtml(item.title)}</h4>
        <p style="color:var(--primary-blue); font-weight:600; margin:0;">🎙️ ${escapeHtml(item.host)}</p>
        ${item.description ? `<p style="margin-top:6px; color:var(--text-color); font-size:0.85rem;">${escapeHtml(item.description)}</p>` : ''}
        <span class="schedule-badge ${item.broadcast_type.toLowerCase() === 'tv' ? 'badge-tv' : 'badge-radio'}">
          ${escapeHtml(item.broadcast_type)} ${item.is_live ? '• LIVE' : ''}
        </span>
      </div>
    `).join('');
  }

  // 4. Localized News Renderer (Both News Page & Home News Preview)
  function renderNews(lang) {
    const l = lang || window.currentLang || 'ha';
    const t = (window.translations && window.translations[l]) ? window.translations[l] : null;
    const articles = (t && t.news) ? t.news : [];

    if (newsContainer) {
      if (articles.length === 0) {
        newsContainer.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No news available.</p>';
      } else {
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
    }

    if (homeNewsPreviewGrid) {
      const previewArticles = articles.slice(0, 2);
      if (previewArticles.length > 0) {
        homeNewsPreviewGrid.innerHTML = previewArticles.map((art) => `
          <article class="liquid-glass-card news-card">
            <div>
              <span class="news-tag">${escapeHtml(art.category || 'General')}</span>
              <h3 class="news-title">${escapeHtml(art.title)}</h3>
              <p class="news-snippet">${escapeHtml(art.content.slice(0, 140))}...</p>
            </div>
            <div class="news-meta">
              <span>✍️ ${escapeHtml(art.author || 'Arab Hausa')}</span>
              <a href="#news" class="read-more-link" style="color:var(--primary-blue); font-weight:700; text-decoration:none;">Karin Bayani →</a>
            </div>
          </article>
        `).join('');

        homeNewsPreviewGrid.querySelectorAll('.read-more-link').forEach((link) => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage('news');
          });
        });
      }
    }
  }

  // 5. Radio Audio Engine & State Synchronization
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

      // Home on-air card icons & soundwave
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

      // Home on-air card icons & soundwave
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
      window.scrollTo({ top: 380, behavior: 'smooth' });
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

  // 6. Community Likes Counter
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

  // 7. USER PORTAL MODAL LOGIC
  function openUserPortal() {
    if (userPortalModal) userPortalModal.style.display = 'flex';
    checkListenerSession();
  }

  function closeUserPortal() {
    if (userPortalModal) userPortalModal.style.display = 'none';
  }

  if (openUserPortalBtn) openUserPortalBtn.addEventListener('click', openUserPortal);
  if (closeUserPortalBtn) closeUserPortalBtn.addEventListener('click', closeUserPortal);

  if (userPortalModal) {
    userPortalModal.addEventListener('click', (e) => {
      if (e.target === userPortalModal) closeUserPortal();
    });
  }

  function setPortalTab(tabName) {
    [portalTabLogin, portalTabRegister, portalTabProfile].forEach((btn) => btn?.classList.remove('active'));
    [portalLoginView, portalRegisterView, portalProfileView].forEach((v) => { if (v) v.style.display = 'none'; });

    if (tabName === 'login') {
      portalTabLogin?.classList.add('active');
      if (portalLoginView) portalLoginView.style.display = 'block';
    } else if (tabName === 'register') {
      portalTabRegister?.classList.add('active');
      if (portalRegisterView) portalRegisterView.style.display = 'block';
    } else if (tabName === 'profile') {
      portalTabProfile?.classList.add('active');
      if (portalProfileView) portalProfileView.style.display = 'block';
    }
  }

  if (portalTabLogin) portalTabLogin.addEventListener('click', () => setPortalTab('login'));
  if (portalTabRegister) portalTabRegister.addEventListener('click', () => setPortalTab('register'));
  if (portalTabProfile) portalTabProfile.addEventListener('click', () => setPortalTab('profile'));

  function checkListenerSession() {
    const userJson = localStorage.getItem('arab_hausa_listener');
    if (userJson) {
      try {
        const u = JSON.parse(userJson);
        if (portalProfileName) portalProfileName.textContent = `Barka da zuwa, ${u.name || 'Mai Sauraro'}!`;
        if (portalProfileEmail) portalProfileEmail.textContent = u.email || 'listener@arabhausa.com';
        setPortalTab('profile');
      } catch (e) {
        setPortalTab('login');
      }
    } else {
      setPortalTab('login');
    }
  }

  if (portalLoginForm) {
    portalLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('portalEmail').value.trim();
      const user = { name: email.split('@')[0], email };
      localStorage.setItem('arab_hausa_listener', JSON.stringify(user));
      if (portalLoginStatus) {
        portalLoginStatus.style.color = 'var(--success-green)';
        portalLoginStatus.textContent = 'An yi nasarar shiga!';
      }
      setTimeout(() => {
        if (portalLoginStatus) portalLoginStatus.textContent = '';
        checkListenerSession();
      }, 500);
    });
  }

  if (portalRegisterForm) {
    portalRegisterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('portalRegName').value.trim();
      const email = document.getElementById('portalRegEmail').value.trim();
      const user = { name, email };
      localStorage.setItem('arab_hausa_listener', JSON.stringify(user));
      if (portalRegStatus) {
        portalRegStatus.style.color = 'var(--success-green)';
        portalRegStatus.textContent = 'An bude asusu cikin nasara!';
      }
      setTimeout(() => {
        if (portalRegStatus) portalRegStatus.textContent = '';
        checkListenerSession();
      }, 500);
    });
  }

  if (portalLogoutBtn) {
    portalLogoutBtn.addEventListener('click', () => {
      localStorage.removeItem('arab_hausa_listener');
      setPortalTab('login');
    });
  }

  // 8. MOBILE DRAWER & SEARCH LOGIC
  function openDrawer() {
    if (mobileDrawerOverlay) mobileDrawerOverlay.classList.add('active');
  }

  function closeDrawer() {
    if (mobileDrawerOverlay) mobileDrawerOverlay.classList.remove('active');
  }

  if (openSearchBtn) {
    openSearchBtn.addEventListener('click', () => {
      openDrawer();
      setTimeout(() => { drawerSearchInput?.focus(); }, 150);
    });
  }

  if (openMenuBtn) openMenuBtn.addEventListener('click', openDrawer);
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);

  if (mobileDrawerOverlay) {
    mobileDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === mobileDrawerOverlay) closeDrawer();
    });
  }

  document.querySelectorAll('.drawer-nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      const page = link.getAttribute('data-page');
      if (page) {
        e.preventDefault();
        navigateToPage(page);
        closeDrawer();
      }
    });
  });

  if (drawerSearchInput) {
    drawerSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!drawerSearchResults) return;

      if (!query) {
        drawerSearchResults.innerHTML = '';
        return;
      }

      const l = window.currentLang || 'ha';
      const t = (window.translations && window.translations[l]) ? window.translations[l] : null;
      const news = (t && t.news) ? t.news : [];
      const schedules = (t && t.schedules) ? t.schedules : [];

      const matchedNews = news.filter((n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
      const matchedSched = schedules.filter((s) => s.title.toLowerCase().includes(query) || s.host.toLowerCase().includes(query));

      if (matchedNews.length === 0 && matchedSched.length === 0) {
        drawerSearchResults.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; padding:8px 0;">Babu sakamako da ya dace da bincikenka.</p>';
        return;
      }

      let html = '';
      if (matchedSched.length > 0) {
        html += '<p style="font-size:0.75rem; font-weight:800; color:var(--primary-blue); margin:6px 0 2px;">SHIRYE-SHIRYE:</p>';
        matchedSched.forEach((s) => {
          html += `<div style="padding:6px 8px; background:var(--light-blue); border-radius:6px; font-size:0.82rem; margin-bottom:4px;">
            <strong>${escapeHtml(s.title)}</strong> (${escapeHtml(s.time_slot)}) - ${escapeHtml(s.host)}
          </div>`;
        });
      }

      if (matchedNews.length > 0) {
        html += '<p style="font-size:0.75rem; font-weight:800; color:var(--primary-blue); margin:8px 0 2px;">LABARAI:</p>';
        matchedNews.forEach((n) => {
          html += `<div style="padding:6px 8px; background:#ffffff; border:1px solid var(--border-color); border-radius:6px; font-size:0.82rem; margin-bottom:4px; cursor:pointer;" class="search-news-item">
            <strong>${escapeHtml(n.title)}</strong>
          </div>`;
        });
      }

      drawerSearchResults.innerHTML = html;
      drawerSearchResults.querySelectorAll('.search-news-item').forEach((item) => {
        item.addEventListener('click', () => {
          navigateToPage('news');
          closeDrawer();
        });
      });
    });
  }

  // 9. Listen for Language Change Event
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
});
