<?php
session_start();
require_once __DIR__ . '/../api/db.php';

$isLoggedIn = !empty($_SESSION['admin_logged_in']);
$db = getDB();
$settingsRows = $db->query("SELECT setting_key, setting_value FROM settings");
$settings = [];
if (!empty($settingsRows) && !isset($settingsRows['error'])) {
    foreach ($settingsRows as $r) {
        $settings[$r['setting_key']] = $r['setting_value'];
    }
}
?>
<!DOCTYPE html>
<html lang="ha">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard | Arab Hausa Radio TV</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/css/liquid-glass.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body>

  <div class="ambient-canvas"></div>
  <div class="liquid-blob-container">
    <div class="liquid-blob blob-1"></div>
    <div class="liquid-blob blob-2"></div>
  </div>

  <header class="site-header">
    <div class="header-container">
      <a href="/" class="brand-wrapper">
        <img src="/images/logo.svg" alt="Arab Hausa Logo" class="brand-logo-img">
        <div class="brand-text">
          <h1>ARAB HAUSA ADMIN</h1>
          <p>Tashar Kula da Watsa Labarai da Shirye-shirye</p>
        </div>
      </a>
      <div class="header-nav">
        <a href="/" class="nav-link">← Komawa Yanar Gizo (View Site)</a>
        <?php if ($isLoggedIn): ?>
          <button id="logoutBtn" class="feature-pill" style="cursor: pointer; color: var(--neon-rose); border-color: var(--neon-rose);">
            🚪 Fita (Logout)
          </button>
        <?php endif; ?>
      </div>
    </div>
  </header>

  <main class="admin-container">

    <?php if (!$isLoggedIn): ?>
      <!-- Admin Login Form -->
      <div class="liquid-glass-card admin-card" style="max-width: 480px; margin: 60px auto; text-align: center;">
        <img src="/images/logo.svg" alt="Arab Hausa Logo" style="width: 80px; margin-bottom: 16px;">
        <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 8px;">Shiga Shafin Admin</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px;">
          Wannan shafi na musamman ne ga masu gudanar da kafar Arab Hausa.
        </p>

        <form id="adminLoginForm">
          <div class="admin-input-group" style="text-align: left;">
            <label for="username">Sunan Mai Gudanarwa (Username)</label>
            <input type="text" id="username" class="admin-input" placeholder="admin" required autofocus>
          </div>

          <div class="admin-input-group" style="text-align: left;">
            <label for="password">Kalmar Sirri (Password)</label>
            <input type="password" id="password" class="admin-input" placeholder="••••••••" required>
          </div>

          <div id="loginFeedback" style="display:none; margin-bottom: 16px; font-size: 0.9rem;"></div>

          <button type="submit" class="liquid-moving-btn" style="width: 100%;">
            <span class="btn-wave"></span>
            SHIGA SHAFI (LOGIN)
          </button>
        </form>

        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 20px;">
          Tsohuwar kalmar sirri: <code>admin123</code>
        </p>
      </div>

    <?php else: ?>
      <!-- Logged-in Admin Management Panels -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="font-size: 1.8rem; font-weight: 800; color: #fff;">
          Barka da Zuwa, <span style="color: var(--neon-cyan);"><?php echo htmlspecialchars($_SESSION['admin_user'] ?? 'Admin'); ?></span>
        </h2>
        <div class="neon-status-pill">
          🟢 Neon Database: Connected
        </div>
      </div>

      <!-- 1. Stream & Station Configuration -->
      <div class="liquid-glass-card admin-card">
        <h3 class="section-title" style="margin-bottom: 20px;">Saitunan Watsa Sauti da Hoto (Stream Settings)</h3>
        <form id="streamSettingsForm">
          <div class="admin-row">
            <div class="admin-input-group">
              <label for="radio_stream_url">Radio Stream URL (Icecast / Shoutcast / HLS)</label>
              <input type="url" id="radio_stream_url" class="admin-input" value="<?php echo htmlspecialchars($settings['radio_stream_url'] ?? ''); ?>" required>
            </div>
            <div class="admin-input-group">
              <label for="radio_fallback_url">Radio Fallback URL</label>
              <input type="url" id="radio_fallback_url" class="admin-input" value="<?php echo htmlspecialchars($settings['radio_fallback_url'] ?? ''); ?>">
            </div>
          </div>

          <div class="admin-row">
            <div class="admin-input-group">
              <label for="tv_stream_url">Live TV Stream URL (HLS / m3u8)</label>
              <input type="url" id="tv_stream_url" class="admin-input" value="<?php echo htmlspecialchars($settings['tv_stream_url'] ?? ''); ?>" required>
            </div>
            <div class="admin-input-group">
              <label for="current_show">Sunan Shirin da Ake Ciki (Current Show)</label>
              <input type="text" id="current_show" class="admin-input" value="<?php echo htmlspecialchars($settings['current_show'] ?? ''); ?>" required>
            </div>
          </div>

          <div class="admin-input-group">
            <label for="breaking_news">Labaran Gaggawa a Ticker (Breaking News Marquee)</label>
            <input type="text" id="breaking_news" class="admin-input" value="<?php echo htmlspecialchars($settings['breaking_news'] ?? ''); ?>" required>
          </div>

          <button type="submit" class="btn-primary" id="saveSettingsBtn">💾 Adana Saituna (Save Settings)</button>
          <span id="settingsSaveStatus" style="margin-left: 14px; font-weight: 700;"></span>
        </form>
      </div>

      <!-- 2. Program Schedule Manager -->
      <div class="liquid-glass-card admin-card">
        <h3 class="section-title" style="margin-bottom: 20px;">Sanya Sabon Shiri a Tsarin Lokaci (Add Program Schedule)</h3>
        <form id="addScheduleForm">
          <div class="admin-row">
            <div class="admin-input-group">
              <label for="sched_title">Sunan Shiri (Program Title)</label>
              <input type="text" id="sched_title" class="admin-input" placeholder="Misali: Barka da Asuba" required>
            </div>
            <div class="admin-input-group">
              <label for="sched_host">Mai Gabatarwa (Host)</label>
              <input type="text" id="sched_host" class="admin-input" placeholder="Misali: Amina Hausawi" required>
            </div>
          </div>

          <div class="admin-row">
            <div class="admin-input-group">
              <label for="sched_time">Lokaci (Time Slot)</label>
              <input type="text" id="sched_time" class="admin-input" placeholder="Misali: 08:00 - 09:30" required>
            </div>
            <div class="admin-input-group">
              <label for="sched_type">Nau'in Shiri (Type)</label>
              <select id="sched_type" class="admin-input" style="background: rgba(15, 23, 42, 0.9);">
                <option value="Radio">Radio</option>
                <option value="TV">TV</option>
              </select>
            </div>
          </div>

          <div class="admin-input-group">
            <label for="sched_desc">Bayanin Shiri (Description)</label>
            <textarea id="sched_desc" class="admin-input admin-textarea" placeholder="Takaitaccen bayani..."></textarea>
          </div>

          <button type="submit" class="btn-primary">➕ Sanya a Tsari (Add Program)</button>
        </form>

        <h4 style="margin-top: 32px; color: var(--neon-gold);">Shirye-shiryen da ke Kan Tsari:</h4>
        <div id="scheduleTableWrapper" style="overflow-x: auto;">
          <!-- Loaded via AJAX -->
        </div>
      </div>

      <!-- 3. Publish News Article -->
      <div class="liquid-glass-card admin-card">
        <h3 class="section-title" style="margin-bottom: 20px;">Buga Sabon Labari (Publish News Article)</h3>
        <form id="publishNewsForm">
          <div class="admin-row">
            <div class="admin-input-group">
              <label for="news_title">Kanun Labari (Hausa Title)</label>
              <input type="text" id="news_title" class="admin-input" placeholder="Babban labari..." required>
            </div>
            <div class="admin-input-group">
              <label for="news_title_ar">Kanun Labari a Larabci (Arabic Title - Optional)</label>
              <input type="text" id="news_title_ar" class="admin-input" dir="rtl" placeholder="عنوان الخبر بالعربية...">
            </div>
          </div>

          <div class="admin-row">
            <div class="admin-input-group">
              <label for="news_category">Rukuni (Category)</label>
              <select id="news_category" class="admin-input" style="background: rgba(15, 23, 42, 0.9);">
                <option value="Broadcasting">Broadcasting</option>
                <option value="Culture">Culture</option>
                <option value="Politics">Politics</option>
                <option value="Religion">Religion</option>
                <option value="Economy">Economy</option>
              </select>
            </div>
            <div class="admin-input-group">
              <label for="news_author">Marubuci (Author)</label>
              <input type="text" id="news_author" class="admin-input" value="Amina Hausawi">
            </div>
          </div>

          <div class="admin-input-group">
            <label for="news_content">Cikakken Labari (Article Content)</label>
            <textarea id="news_content" class="admin-input admin-textarea" style="min-height: 120px;" placeholder="Rubuta cikakken labari a nan..." required></textarea>
          </div>

          <button type="submit" class="btn-primary">📰 Buga Labari (Publish)</button>
        </form>

        <h4 style="margin-top: 32px; color: var(--neon-gold);">Labaran da Aka Buga:</h4>
        <div id="newsTableWrapper" style="overflow-x: auto;">
          <!-- Loaded via AJAX -->
        </div>
      </div>

    <?php endif; ?>

  </main>

  <script src="/js/admin.js"></script>
</body>
</html>
