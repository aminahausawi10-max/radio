/**
 * Arab Hausa Radio TV - Admin Dashboard Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  // Login Handler
  const loginForm = document.getElementById('adminLoginForm');
  const loginFeedback = document.getElementById('loginFeedback');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      loginFeedback.style.display = 'block';
      loginFeedback.style.color = 'var(--neon-cyan)';
      loginFeedback.textContent = 'Ana tantancewa...';

      try {
        const res = await fetch('/api/admin-auth.php?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
          loginFeedback.style.color = 'var(--neon-emerald)';
          loginFeedback.textContent = 'An yi nasara! Ana shiga...';
          setTimeout(() => window.location.reload(), 600);
        } else {
          loginFeedback.style.color = 'var(--neon-rose)';
          loginFeedback.textContent = data.message || 'Kuskure: Sunan mai amfani ko kalmar sirri ba daidai ba ne.';
        }
      } catch (err) {
        loginFeedback.style.color = 'var(--neon-rose)';
        loginFeedback.textContent = 'Kuskuren hanyar sadarwa.';
      }
    });
  }

  // Logout Handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/admin-auth.php?action=logout', { method: 'POST' });
      window.location.reload();
    });
  }

  // Stream Settings Save
  const streamSettingsForm = document.getElementById('streamSettingsForm');
  const settingsSaveStatus = document.getElementById('settingsSaveStatus');

  if (streamSettingsForm) {
    streamSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      settingsSaveStatus.textContent = 'Ana adanawa...';
      settingsSaveStatus.style.color = 'var(--neon-cyan)';

      const payload = {
        radio_stream_url: document.getElementById('radio_stream_url').value,
        radio_fallback_url: document.getElementById('radio_fallback_url').value,
        tv_stream_url: document.getElementById('tv_stream_url').value,
        current_show: document.getElementById('current_show').value,
        breaking_news: document.getElementById('breaking_news').value
      };

      try {
        const res = await fetch('/api/settings.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          settingsSaveStatus.textContent = '✅ An adana saituna cikin nasara!';
          settingsSaveStatus.style.color = 'var(--neon-emerald)';
          setTimeout(() => { settingsSaveStatus.textContent = ''; }, 3000);
        } else {
          settingsSaveStatus.textContent = '❌ Kuskure wajen adanawa.';
          settingsSaveStatus.style.color = 'var(--neon-rose)';
        }
      } catch (err) {
        settingsSaveStatus.textContent = '❌ Kuskuren hanyar sadarwa.';
        settingsSaveStatus.style.color = 'var(--neon-rose)';
      }
    });
  }

  // Load and Render Schedule in Admin
  const schedWrapper = document.getElementById('scheduleTableWrapper');
  async function loadAdminSchedule() {
    if (!schedWrapper) return;
    try {
      const res = await fetch('/api/schedule.php');
      const data = await res.json();
      if (data.success && data.schedule) {
        if (data.schedule.length === 0) {
          schedWrapper.innerHTML = '<p style="color:var(--text-muted);padding:10px;">Babu shirye-shirye.</p>';
          return;
        }
        let html = '<table class="admin-table"><thead><tr><th>Lokaci</th><th>Shiri</th><th>Mai Gabatarwa</th><th>Nau\'i</th><th>Aiki</th></tr></thead><tbody>';
        data.schedule.forEach((s) => {
          html += `<tr>
            <td>${escapeHtml(s.time_slot)}</td>
            <td><strong>${escapeHtml(s.title)}</strong></td>
            <td>${escapeHtml(s.host)}</td>
            <td>${escapeHtml(s.broadcast_type)}</td>
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
      const res = await fetch(`/api/schedule.php?id=${id}`, { method: 'DELETE' });
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
        const res = await fetch('/api/schedule.php', {
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
      const res = await fetch('/api/news.php');
      const data = await res.json();
      if (data.success && data.news) {
        if (data.news.length === 0) {
          newsWrapper.innerHTML = '<p style="color:var(--text-muted);padding:10px;">Babu labarai.</p>';
          return;
        }
        let html = '<table class="admin-table"><thead><tr><th>ID</th><th>Kanun Labari</th><th>Rukuni</th><th>Marubuci</th><th>Aiki</th></tr></thead><tbody>';
        data.news.forEach((n) => {
          html += `<tr>
            <td>#${n.id}</td>
            <td><strong>${escapeHtml(n.title)}</strong></td>
            <td>${escapeHtml(n.category)}</td>
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
      const res = await fetch(`/api/news.php?id=${id}`, { method: 'DELETE' });
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
        const res = await fetch('/api/news.php', {
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

  loadAdminSchedule();
  loadAdminNews();
});
