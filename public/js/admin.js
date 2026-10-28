/**
 * Arab Hausa Radio TV - Admin Dashboard Scripts (v11)
 * Modern Blue-and-White Theme & Sidebar Tab Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginCard = document.getElementById('loginCard');
  const dashboardPanel = document.getElementById('dashboardPanel');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('adminLoginForm');
  const loginFeedback = document.getElementById('loginFeedback');
  const adminUserGreeting = document.getElementById('adminUserGreeting');
  const pageTitleText = document.getElementById('pageTitleText');

  // Sidebar Tab Switcher
  const sidebarItems = document.querySelectorAll('.sidebar-nav-item');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');

  const tabTitles = {
    'tab-overview': 'Dashboard Overview',
    'tab-streams': 'Radio & TV Stream Management',
    'tab-schedule': 'Programme Guide Management',
    'tab-news': 'News & Articles Management',
    'tab-media': 'Media & Podcast Uploads',
    'tab-users': 'User & Listener Management',
    'tab-settings': 'Station & Website Settings',
    'tab-logs': 'System Activity Logs'
  };

  function switchTab(tabId) {
    sidebarItems.forEach((btn) => {
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
  }

  window.switchTab = switchTab;

  sidebarItems.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Check login state (works on both PHP session and static HTML client)
  const isLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true' || (dashboardPanel && dashboardPanel.style.display !== 'none');

  function setLoggedInUI(username) {
    if (loginCard) loginCard.style.display = 'none';
    if (dashboardPanel) dashboardPanel.style.display = 'flex';
    if (adminUserGreeting) adminUserGreeting.textContent = username || 'Admin';
    loadCurrentSettings();
    loadAdminSchedule();
    loadAdminNews();
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

  // Login Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      loginFeedback.style.display = 'block';
      loginFeedback.style.color = 'var(--admin-primary)';
      loginFeedback.textContent = 'Ana tantancewa...';

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
          loginFeedback.style.color = '#18c77a';
          loginFeedback.textContent = 'An yi nasara! Ana shiga...';
          setTimeout(() => setLoggedInUI(username), 400);
          return;
        }
      } catch (err) {}

      if (validAdmin) {
        sessionStorage.setItem('admin_logged_in', 'true');
        sessionStorage.setItem('admin_user', username);
        loginFeedback.style.color = '#18c77a';
        loginFeedback.textContent = 'An yi nasara! Ana shiga...';
        setTimeout(() => setLoggedInUI(username), 400);
      } else {
        loginFeedback.style.color = '#ff3045';
        loginFeedback.textContent = 'Kuskure: Sunan mai amfani ko kalmar sirri ba daidai ba ne.';
      }
    });
  }

  // Logout Handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      sessionStorage.removeItem('admin_logged_in');
      sessionStorage.removeItem('admin_user');
      try { await fetch('/api/admin-auth?action=logout', { method: 'POST' }); } catch (e) {}
      setLoggedOutUI();
    });
  }

  // Stream Settings Save
  const streamSettingsForm = document.getElementById('streamSettingsForm');
  const settingsSaveStatus = document.getElementById('settingsSaveStatus');

  if (streamSettingsForm) {
    streamSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      settingsSaveStatus.textContent = 'Ana adanawa...';
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
          settingsSaveStatus.textContent = '✅ An adana saituna cikin nasara!';
          settingsSaveStatus.style.color = '#18c77a';
          const ovShow = document.getElementById('overviewCurrentShow');
          if (ovShow) ovShow.textContent = payload.current_show;
          const ovTicker = document.getElementById('overviewTickerText');
          if (ovTicker) ovTicker.textContent = payload.breaking_news;
          setTimeout(() => { settingsSaveStatus.textContent = ''; }, 3000);
        } else {
          settingsSaveStatus.textContent = '❌ Kuskure wajen adanawa.';
          settingsSaveStatus.style.color = '#ff3045';
        }
      } catch (err) {
        settingsSaveStatus.textContent = '❌ Kuskuren hanyar sadarwa.';
        settingsSaveStatus.style.color = '#ff3045';
      }
    });
  }

  // Load and Render Schedule in Admin
  const schedWrapper = document.getElementById('scheduleTableWrapper');
  async function loadAdminSchedule() {
    if (!schedWrapper) return;
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      if (data.success && data.schedule) {
        if (data.schedule.length === 0) {
          schedWrapper.innerHTML = '<p style="color:var(--admin-text-muted);padding:14px;">Babu shirye-shirye a yanzu.</p>';
          return;
        }
        let html = '<table class="admin-table"><thead><tr><th>Lokaci</th><th>Shiri</th><th>Mai Gabatarwa</th><th>Nau\'i</th><th>Aiki</th></tr></thead><tbody>';
        data.schedule.forEach((s) => {
          html += `<tr>
            <td>${escapeHtml(s.time_slot)}</td>
            <td><strong>${escapeHtml(s.title)}</strong></td>
            <td>${escapeHtml(s.host)}</td>
            <td><span style="background:var(--admin-light-blue); color:var(--admin-primary); padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">${escapeHtml(s.broadcast_type)}</span></td>
            <td><button class="btn-danger" onclick="deleteSchedule(${s.id})">Goge</button></td>
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
    if (!confirm('Shin kana so ka goge wannan shiri?')) return;
    try {
      const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadAdminSchedule();
    } catch (e) {
      alert('Kuskure wajen gogewa');
    }
  };

  // Add Schedule Form
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
        alert('Kuskure wajen sanya shiri');
      }
    });
  }

  // Load and Render News in Admin
  const newsWrapper = document.getElementById('newsTableWrapper');
  async function loadAdminNews() {
    if (!newsWrapper) return;
    try {
      const res = await fetch('/api/news');
      const data = await res.json();
      if (data.success && data.news) {
        if (data.news.length === 0) {
          newsWrapper.innerHTML = '<p style="color:var(--admin-text-muted);padding:14px;">Babu labarai a yanzu.</p>';
          return;
        }
        let html = '<table class="admin-table"><thead><tr><th>ID</th><th>Kanun Labari</th><th>Rukuni</th><th>Marubuci</th><th>Aiki</th></tr></thead><tbody>';
        data.news.forEach((n) => {
          html += `<tr>
            <td>#${n.id}</td>
            <td><strong>${escapeHtml(n.title)}</strong></td>
            <td><span style="background:var(--admin-light-blue); color:var(--admin-primary); padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">${escapeHtml(n.category)}</span></td>
            <td>${escapeHtml(n.author)}</td>
            <td><button class="btn-danger" onclick="deleteNews(${n.id})">Goge</button></td>
          </tr>`;
        });
        html += '</tbody></table>';
        newsWrapper.innerHTML = html;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  window.deleteNews = async function (id) {
    if (!confirm('Shin kana so ka goge wannan labari?')) return;
    try {
      const res = await fetch(`/api/news?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadAdminNews();
    } catch (e) {
      alert('Kuskure wajen gogewa');
    }
  };

  // Publish News Form
  const pubNewsForm = document.getElementById('publishNewsForm');
  if (pubNewsForm) {
    pubNewsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: document.getElementById('news_title').value,
        title_ar: document.getElementById('news_title_ar').value,
        category: document.getElementById('news_category').value,
        author: document.getElementById('news_author').value,
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
          pubNewsForm.reset();
          loadAdminNews();
        }
      } catch (err) {
        alert('Kuskure wajen buga labari');
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
