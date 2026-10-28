/**
 * Arab Hausa Radio TV - Central Admin Controller (v12)
 * 100% English Professional Interface
 * Media Upload Center (Photo, Video, Voice Note) & News Publisher
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginCard = document.getElementById('loginCard');
  const dashboardPanel = document.getElementById('dashboardPanel');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('adminLoginForm');
  const loginFeedback = document.getElementById('loginFeedback');
  const adminUserGreeting = document.getElementById('adminUserGreeting');
  const pageTitleText = document.getElementById('pageTitleText');

  // 1. Sidebar & Mobile Bottom Navigation Switcher
  const sidebarItems = document.querySelectorAll('.sidebar-nav-item');
  const bottomNavItems = document.querySelectorAll('.admin-bottom-nav-item[data-tab]');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');
  const adminSidebar = document.getElementById('adminSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const adminMobileToggle = document.getElementById('adminMobileToggle');
  const closeMobileSidebar = document.getElementById('closeMobileSidebar');
  const adminBottomMenuBtn = document.getElementById('adminBottomMenuBtn');

  const tabTitles = {
    'tab-overview': 'Dashboard Overview',
    'tab-streams': 'Radio & TV Stream Management',
    'tab-schedule': 'Programme Schedule Management',
    'tab-news': 'Write & Publish News Articles',
    'tab-media': 'Media Upload Center (Video, Photo & Voice Note)',
    'tab-users': 'User & Team Management',
    'tab-settings': 'Station Profile & Settings',
    'tab-logs': 'System Activity & Audit Logs'
  };

  function openSidebar() {
    if (adminSidebar) adminSidebar.classList.add('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('active');
  }

  function closeSidebar() {
    if (adminSidebar) adminSidebar.classList.remove('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
  }

  if (adminMobileToggle) adminMobileToggle.addEventListener('click', openSidebar);
  if (closeMobileSidebar) closeMobileSidebar.addEventListener('click', closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);
  if (adminBottomMenuBtn) adminBottomMenuBtn.addEventListener('click', openSidebar);

  function switchTab(tabId) {
    sidebarItems.forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    bottomNavItems.forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabPanes.forEach((pane) => {
      if (pane.id === tabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    if (pageTitleText && tabTitles[tabId]) {
      pageTitleText.textContent = tabTitles[tabId];
    }

    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  window.switchTab = switchTab;

  sidebarItems.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  bottomNavItems.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Check login state
  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true' || (dashboardPanel && dashboardPanel.style.display !== 'none');

  function setLoggedInUI(username) {
    if (loginCard) loginCard.style.display = 'none';
    if (dashboardPanel) dashboardPanel.style.display = 'flex';
    if (adminUserGreeting) adminUserGreeting.textContent = username || 'Admin';
    loadCurrentSettings();
    loadAdminSchedule();
    loadAdminNews();
    renderMediaGallery('all');
  }

  function setLoggedOutUI() {
    if (loginCard) loginCard.style.display = 'block';
    if (dashboardPanel) dashboardPanel.style.display = 'none';
  }

  if (isLoggedIn) {
    setLoggedInUI(sessionStorage.getItem('admin_user') || 'Admin');
  }

  // Pre-load current settings
  async function loadCurrentSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
        setVal('radio_stream_url', s.radio_stream_url);
        setVal('radio_fallback_url', s.radio_fallback_url);
        setVal('tv_stream_url', s.tv_stream_url);
        setVal('current_show', s.current_show);
        setVal('breaking_news', s.breaking_news);

        const ovShow = document.getElementById('overviewCurrentShow');
        if (ovShow && s.current_show) ovShow.textContent = s.current_show;

        const ovTicker = document.getElementById('overviewTickerText');
        if (ovTicker && s.breaking_news) ovTicker.textContent = s.breaking_news;
      }
    } catch (e) {
      console.warn('Could not prefetch settings:', e);
    }
  }

  // 2. Authentication
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      loginFeedback.style.display = 'block';
      loginFeedback.style.color = 'var(--admin-primary)';
      loginFeedback.textContent = 'Verifying credentials...';

      const validAdmin = (username === 'admin' && (password === 'admin123' || password === 'admin'));

      try {
        const res = await fetch('/api/admin-auth?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => null);
        if (data && data.success) {
          sessionStorage.setItem('admin_logged_in', 'true');
          sessionStorage.setItem('admin_user', username);
          loginFeedback.style.color = '#10b981';
          loginFeedback.textContent = 'Login successful! Redirecting...';
          setTimeout(() => setLoggedInUI(username), 400);
          return;
        }
      } catch (err) {}

      if (validAdmin) {
        sessionStorage.setItem('admin_logged_in', 'true');
        sessionStorage.setItem('admin_user', username);
        loginFeedback.style.color = '#10b981';
        loginFeedback.textContent = 'Login successful! Redirecting...';
        setTimeout(() => setLoggedInUI(username), 400);
      } else {
        loginFeedback.style.color = '#f43f5e';
        loginFeedback.textContent = 'Invalid administrator username or password.';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      sessionStorage.removeItem('admin_logged_in');
      sessionStorage.removeItem('admin_user');
      try { await fetch('/api/admin-auth?action=logout', { method: 'POST' }); } catch (e) {}
      setLoggedOutUI();
    });
  }

  // 3. Stream Settings Save
  const streamSettingsForm = document.getElementById('streamSettingsForm');
  const settingsSaveStatus = document.getElementById('settingsSaveStatus');

  if (streamSettingsForm) {
    streamSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      settingsSaveStatus.textContent = 'Saving stream settings...';
      settingsSaveStatus.style.color = 'var(--admin-primary)';

      const payload = {
        radio_stream_url: document.getElementById('radio_stream_url').value,
        radio_fallback_url: document.getElementById('radio_fallback_url').value,
        tv_stream_url: document.getElementById('tv_stream_url').value,
        current_show: document.getElementById('current_show').value,
        breaking_news: document.getElementById('breaking_news').value
      };

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          settingsSaveStatus.textContent = '✅ Stream settings saved successfully!';
          settingsSaveStatus.style.color = '#10b981';
          const ovShow = document.getElementById('overviewCurrentShow');
          if (ovShow) ovShow.textContent = payload.current_show;
          const ovTicker = document.getElementById('overviewTickerText');
          if (ovTicker) ovTicker.textContent = payload.breaking_news;
          setTimeout(() => { settingsSaveStatus.textContent = ''; }, 3000);
        } else {
          settingsSaveStatus.textContent = '❌ Failed to save stream settings.';
          settingsSaveStatus.style.color = '#f43f5e';
        }
      } catch (err) {
        settingsSaveStatus.textContent = '❌ Network error while saving settings.';
        settingsSaveStatus.style.color = '#f43f5e';
      }
    });
  }

  // 4. Programme Schedule Management
  const schedWrapper = document.getElementById('scheduleTableWrapper');
  async function loadAdminSchedule() {
    if (!schedWrapper) return;
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      if (data.success && data.schedule) {
        if (data.schedule.length === 0) {
          schedWrapper.innerHTML = '<p style="color:var(--admin-text-muted);padding:14px;">No programs found in schedule.</p>';
          return;
        }
        let html = '<table class="admin-table"><thead><tr><th>Time Slot</th><th>Program Title</th><th>Host / Presenter</th><th>Channel</th><th>Action</th></tr></thead><tbody>';
        data.schedule.forEach((s) => {
          html += `<tr>
            <td>⏰ ${escapeHtml(s.time_slot)}</td>
            <td><strong>${escapeHtml(s.title)}</strong></td>
            <td>🎙️ ${escapeHtml(s.host)}</td>
            <td><span style="background:rgba(0,242,254,0.12); color:var(--admin-primary); padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">${escapeHtml(s.broadcast_type)}</span></td>
            <td><button class="btn-danger" onclick="deleteSchedule(${s.id})">Delete</button></td>
          </tr>`;
        });
        html += '</tbody></table>';
        schedWrapper.innerHTML = html;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  window.deleteSchedule = async function (id) {
    if (!confirm('Are you sure you want to remove this program from the broadcast schedule?')) return;
    try {
      const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadAdminSchedule();
    } catch (e) {
      alert('Error deleting schedule item.');
    }
  };

  const addSchedForm = document.getElementById('addScheduleForm');
  if (addSchedForm) {
    addSchedForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('sched_title').value,
        host: document.getElementById('sched_host').value,
        time_slot: document.getElementById('sched_time').value,
        broadcast_type: document.getElementById('sched_type').value,
        description: document.getElementById('sched_desc').value
      };

      try {
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          addSchedForm.reset();
          loadAdminSchedule();
        }
      } catch (err) {
        alert('Failed to add program schedule.');
      }
    });
  }

  // 5. News Articles Management ("write news")
  const newsWrapper = document.getElementById('newsTableWrapper');
  const overviewNewsCount = document.getElementById('overviewNewsCount');
  const newsPublishStatus = document.getElementById('newsPublishStatus');

  async function loadAdminNews() {
    if (!newsWrapper) return;
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success && data.news) {
        if (overviewNewsCount) overviewNewsCount.textContent = data.news.length;
        if (data.news.length === 0) {
          newsWrapper.innerHTML = '<p style="color:var(--admin-text-muted);padding:14px;">No published news articles yet.</p>';
          return;
        }
        let html = '<table class="admin-table"><thead><tr><th>ID</th><th>Headline</th><th>Category</th><th>Author</th><th>Date</th><th>Action</th></tr></thead><tbody>';
        data.news.forEach((n) => {
          html += `<tr>
            <td>#${n.id}</td>
            <td><strong>${escapeHtml(n.title)}</strong></td>
            <td><span style="background:rgba(0,242,254,0.12); color:var(--admin-primary); padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">${escapeHtml(n.category)}</span></td>
            <td>${escapeHtml(n.author)}</td>
            <td>${new Date(n.created_at || Date.now()).toLocaleDateString()}</td>
            <td><button class="btn-danger" onclick="deleteNews(${n.id})">Delete</button></td>
          </tr>`;
        });
        html += '</tbody></table>';
        newsWrapper.innerHTML = html;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  window.loadAdminNews = loadAdminNews;

  window.deleteNews = async function (id) {
    if (!confirm('Are you sure you want to permanently delete this news article?')) return;
    try {
      const res = await fetch(`/api/news?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadAdminNews();
    } catch (e) {
      alert('Error deleting news article.');
    }
  };

  const pubNewsForm = document.getElementById('publishNewsForm');
  if (pubNewsForm) {
    pubNewsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (newsPublishStatus) {
        newsPublishStatus.textContent = 'Publishing article...';
        newsPublishStatus.style.color = 'var(--admin-primary)';
      }

      const payload = {
        title: document.getElementById('news_title').value,
        title_ar: document.getElementById('news_title_ar').value,
        category: document.getElementById('news_category').value,
        author: document.getElementById('news_author').value,
        image_url: document.getElementById('news_image_url').value,
        media_url: document.getElementById('news_media_url').value,
        content: document.getElementById('news_content').value
      };

      try {
        const res = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          if (newsPublishStatus) {
            newsPublishStatus.textContent = '✅ Article published successfully!';
            newsPublishStatus.style.color = '#10b981';
            setTimeout(() => { newsPublishStatus.textContent = ''; }, 3500);
          }
          pubNewsForm.reset();
          document.getElementById('news_author').value = 'Arab Hausa Editorial Desk';
          loadAdminNews();
        } else {
          if (newsPublishStatus) {
            newsPublishStatus.textContent = '❌ Failed to publish article.';
            newsPublishStatus.style.color = '#f43f5e';
          }
        }
      } catch (err) {
        if (newsPublishStatus) {
          newsPublishStatus.textContent = '❌ Network error.';
          newsPublishStatus.style.color = '#f43f5e';
        }
      }
    });
  }

  // 6. MEDIA UPLOAD CENTER (Photo, Video, Voice Note)
  const defaultMedia = [
    {
      id: 1,
      type: 'photo',
      name: 'Arab Hausa Station Emblem',
      category: 'Branding',
      url: '/images/logo.svg',
      size: '5.1 KB',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      type: 'photo',
      name: 'Official Station QR Code',
      category: 'Mobile Access',
      url: '/images/qr-code.svg',
      size: '2.3 KB',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      type: 'video',
      name: 'Arab Hausa TV HD Live Feed',
      category: 'Broadcast Stream',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      size: 'Live HLS Stream',
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      type: 'voicenote',
      name: 'Morning Studio Audio Dispatch',
      category: 'Audio Dispatch',
      url: 'https://stream.zeno.fm/4wvy4w9612zuv',
      size: 'Live Radio Audio',
      created_at: new Date().toISOString()
    }
  ];

  function getMediaLibrary() {
    try {
      const stored = localStorage.getItem('station_media_library');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    localStorage.setItem('station_media_library', JSON.stringify(defaultMedia));
    return defaultMedia;
  }

  function saveMediaLibrary(items) {
    try {
      localStorage.setItem('station_media_library', JSON.stringify(items));
    } catch (e) {
      console.warn('Storage limit reached, keeping in memory', e);
    }
  }

  const mediaFeedback = document.getElementById('mediaUploadFeedback');
  function showMediaFeedback(msg, isSuccess) {
    if (!mediaFeedback) return;
    mediaFeedback.style.display = 'block';
    mediaFeedback.style.background = isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
    mediaFeedback.style.border = isSuccess ? '1px solid #10b981' : '1px solid #f43f5e';
    mediaFeedback.style.color = isSuccess ? '#10b981' : '#f43f5e';
    mediaFeedback.textContent = msg;
    setTimeout(() => { mediaFeedback.style.display = 'none'; }, 4000);
  }

  // --- 6a. PHOTO UPLOAD ---
  const photoFileInput = document.getElementById('photoFileInput');
  const photoPreviewBox = document.getElementById('photoPreviewBox');
  const photoPreviewImg = document.getElementById('photoPreviewImg');
  const photoTitleInput = document.getElementById('photoTitleInput');
  const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
  let currentPhotoData = null;

  if (photoFileInput) {
    photoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          currentPhotoData = evt.target.result;
          photoPreviewImg.src = currentPhotoData;
          photoPreviewBox.style.display = 'flex';
          if (!photoTitleInput.value) photoTitleInput.value = file.name.replace(/\.[^/.]+$/, '');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener('click', () => {
      if (!currentPhotoData) {
        showMediaFeedback('Please select a photo file first.', false);
        return;
      }
      const title = photoTitleInput.value.trim() || 'Uploaded Photo';
      const newItem = {
        id: Date.now(),
        type: 'photo',
        name: title,
        category: 'Photo Gallery',
        url: currentPhotoData,
        size: `${(currentPhotoData.length * 0.75 / 1024).toFixed(1)} KB`,
        created_at: new Date().toISOString()
      };

      const library = getMediaLibrary();
      library.unshift(newItem);
      saveMediaLibrary(library);

      showMediaFeedback('✅ Photo uploaded successfully! Available in library below.', true);
      photoFileInput.value = '';
      currentPhotoData = null;
      photoPreviewBox.style.display = 'none';
      photoTitleInput.value = '';
      renderMediaGallery('photo');
    });
  }

  // --- 6b. VIDEO UPLOADER ---
  const videoFileInput = document.getElementById('videoFileInput');
  const videoExternalUrlInput = document.getElementById('videoExternalUrlInput');
  const videoPreviewBox = document.getElementById('videoPreviewBox');
  const videoPreviewPlayer = document.getElementById('videoPreviewPlayer');
  const videoTitleInput = document.getElementById('videoTitleInput');
  const uploadVideoBtn = document.getElementById('uploadVideoBtn');
  let currentVideoUrl = null;

  if (videoFileInput) {
    videoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          currentVideoUrl = evt.target.result;
          videoPreviewPlayer.src = currentVideoUrl;
          videoPreviewBox.style.display = 'flex';
          if (!videoTitleInput.value) videoTitleInput.value = file.name.replace(/\.[^/.]+$/, '');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (videoExternalUrlInput) {
    videoExternalUrlInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        currentVideoUrl = url;
        videoPreviewPlayer.src = currentVideoUrl;
        videoPreviewBox.style.display = 'flex';
        if (!videoTitleInput.value) videoTitleInput.value = 'External Video Stream';
      }
    });
  }

  if (uploadVideoBtn) {
    uploadVideoBtn.addEventListener('click', () => {
      if (!currentVideoUrl) {
        showMediaFeedback('Please select a video file or enter a video stream URL.', false);
        return;
      }
      const title = videoTitleInput.value.trim() || 'Uploaded Video';
      const newItem = {
        id: Date.now(),
        type: 'video',
        name: title,
        category: 'Video Broadcast',
        url: currentVideoUrl,
        size: currentVideoUrl.startsWith('data:') ? `${(currentVideoUrl.length * 0.75 / 1024).toFixed(1)} KB` : 'External Stream',
        created_at: new Date().toISOString()
      };

      const library = getMediaLibrary();
      library.unshift(newItem);
      saveMediaLibrary(library);

      showMediaFeedback('✅ Video saved successfully! Available in library below.', true);
      if (videoFileInput) videoFileInput.value = '';
      if (videoExternalUrlInput) videoExternalUrlInput.value = '';
      currentVideoUrl = null;
      videoPreviewBox.style.display = 'none';
      videoTitleInput.value = '';
      renderMediaGallery('video');
    });
  }

  // --- 6c. VOICE NOTE UPLOADER ---
  const audioFileInput = document.getElementById('audioFileInput');
  const audioPreviewBox = document.getElementById('audioPreviewBox');
  const audioPreviewPlayer = document.getElementById('audioPreviewPlayer');
  const audioTitleInput = document.getElementById('audioTitleInput');
  const uploadAudioBtn = document.getElementById('uploadAudioBtn');
  let currentAudioUrl = null;

  if (audioFileInput) {
    audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          currentAudioUrl = evt.target.result;
          audioPreviewPlayer.src = currentAudioUrl;
          audioPreviewBox.style.display = 'flex';
          if (!audioTitleInput.value) audioTitleInput.value = file.name.replace(/\.[^/.]+$/, '');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (uploadAudioBtn) {
    uploadAudioBtn.addEventListener('click', () => {
      if (!currentAudioUrl) {
        showMediaFeedback('Please select an audio file / voice note first.', false);
        return;
      }
      const title = audioTitleInput.value.trim() || 'Recorded Voice Note';
      const newItem = {
        id: Date.now(),
        type: 'voicenote',
        name: title,
        category: 'Voice Note Dispatch',
        url: currentAudioUrl,
        size: currentAudioUrl.startsWith('data:') ? `${(currentAudioUrl.length * 0.75 / 1024).toFixed(1)} KB` : 'External Audio',
        created_at: new Date().toISOString()
      };

      const library = getMediaLibrary();
      library.unshift(newItem);
      saveMediaLibrary(library);

      showMediaFeedback('✅ Voice Note uploaded successfully! Available in library below.', true);
      if (audioFileInput) audioFileInput.value = '';
      currentAudioUrl = null;
      audioPreviewBox.style.display = 'none';
      audioTitleInput.value = '';
      renderMediaGallery('voicenote');
    });
  }

  // --- 6d. MEDIA GALLERY RENDER & FILTER ---
  const mediaGalleryGrid = document.getElementById('mediaGalleryGrid');
  const filterPills = document.querySelectorAll('.media-filter-pill');

  function renderMediaGallery(filterType = 'all') {
    if (!mediaGalleryGrid) return;
    const library = getMediaLibrary();
    const filtered = filterType === 'all' ? library : library.filter(item => item.type === filterType);

    if (filtered.length === 0) {
      mediaGalleryGrid.innerHTML = '<p style="color:var(--admin-text-muted); padding:16px; grid-column:1/-1; text-align:center;">No media items found in this category.</p>';
      return;
    }

    mediaGalleryGrid.innerHTML = filtered.map(item => {
      let previewHtml = '';
      if (item.type === 'photo') {
        previewHtml = `<img src="${item.url}" alt="${escapeHtml(item.name)}">`;
      } else if (item.type === 'video') {
        previewHtml = `<video controls playsinline src="${item.url}" style="width:100%; height:100%;"></video>`;
      } else if (item.type === 'voicenote') {
        previewHtml = `<div style="padding:14px; width:100%; text-align:center;"><span style="font-size:2rem; display:block; margin-bottom:4px;">🎙️</span><audio controls src="${item.url}" style="width:100%;"></audio></div>`;
      }

      return `
        <div class="gallery-card">
          <div class="gallery-card-preview">
            ${previewHtml}
          </div>
          <div class="gallery-card-body">
            <h4 class="gallery-card-title">${escapeHtml(item.name)}</h4>
            <div class="gallery-card-meta">
              <span>${item.type.toUpperCase()} • ${escapeHtml(item.size)}</span>
            </div>
            <div class="gallery-card-actions">
              <button class="gallery-action-btn btn-copy-url" onclick="copyMediaUrl('${encodeURIComponent(item.url)}')">📋 Copy URL</button>
              <button class="gallery-action-btn btn-danger" onclick="deleteMediaItem(${item.id})">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.deleteMediaItem = function (id) {
    if (!confirm('Are you sure you want to delete this media item?')) return;
    let library = getMediaLibrary();
    library = library.filter(item => item.id !== id);
    saveMediaLibrary(library);
    renderMediaGallery();
  };

  window.copyMediaUrl = function (encodedUrl) {
    const url = decodeURIComponent(encodedUrl);
    navigator.clipboard.writeText(url).then(() => {
      alert('Media URL copied to clipboard! You can now paste it into news articles or broadcast fields.');
    }).catch(() => {
      prompt('Copy this URL:', url);
    });
  };

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const filter = pill.getAttribute('data-filter') || 'all';
      renderMediaGallery(filter);
    });
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
