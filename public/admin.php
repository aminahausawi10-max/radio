<?php
session_start();
require_once __DIR__ . '/../api-php/db.php';

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
  <title>Admin Dashboard | Arab Hausa Radio &amp; Television</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/css/admin.css?v=11">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body class="admin-body">

  <?php if (!$isLoggedIn): ?>
    <!-- Admin Login Form (Shown when not logged in) -->
    <div id="loginCard" style="max-width: 440px; margin: 80px auto; padding: 36px; background: #ffffff; border: 1px solid var(--admin-border); border-radius: 18px; box-shadow: var(--admin-shadow-lg); text-align: center;">
      <img src="/images/logo.svg" alt="Arab Hausa Logo" style="width: 72px; margin-bottom: 14px;">
      <h2 style="font-size: 1.5rem; font-weight: 900; color: var(--admin-text-dark); margin: 0 0 6px 0;">Shiga Shafin Gudanarwa</h2>
      <p style="color: var(--admin-text-muted); font-size: 0.85rem; margin: 0 0 24px 0;">
        Arab Hausa Radio &amp; TV Central Admin Portal
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

        <div id="loginFeedback" style="display:none; margin-bottom: 14px; font-size: 0.85rem; font-weight: 700;"></div>

        <button type="submit" class="btn-primary" style="width: 100%;">
          SHIGA SHAFI (LOGIN) →
        </button>
      </form>

      <p style="color: var(--admin-text-muted); font-size: 0.78rem; margin-top: 20px;">
        Default login: <code>admin</code> / <code>admin123</code>
      </p>
      <a href="/" style="display: inline-block; margin-top: 8px; color: var(--admin-primary); font-size: 0.8rem; text-decoration: none; font-weight: 600;">← Koma Yanar Gizo (Back to Website)</a>
    </div>
  <?php endif; ?>

  <!-- Admin Dashboard Shell -->
  <div id="dashboardPanel" style="<?php echo $isLoggedIn ? 'display:flex;' : 'display:none;'; ?>" class="admin-layout">
    
    <!-- Modern Sidebar Navigation -->
    <aside class="admin-sidebar">
      <div class="sidebar-brand">
        <img src="/images/logo.svg" alt="Arab Hausa Logo">
        <div>
          <h2>ARAB HAUSA</h2>
          <p>ADMIN CONTROL</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button class="sidebar-nav-item active" data-tab="tab-overview">
          <span>📊</span>
          <span>Overview</span>
        </button>
        <button class="sidebar-nav-item" data-tab="tab-streams">
          <span>📡</span>
          <span>Radio &amp; TV Streams</span>
        </button>
        <button class="sidebar-nav-item" data-tab="tab-schedule">
          <span>📅</span>
          <span>Programme Guide</span>
        </button>
        <button class="sidebar-nav-item" data-tab="tab-news">
          <span>📰</span>
          <span>News &amp; Articles</span>
        </button>
        <button class="sidebar-nav-item" data-tab="tab-media">
          <span>📁</span>
          <span>Media &amp; Podcasts</span>
        </button>
        <button class="sidebar-nav-item" data-tab="tab-users">
          <span>👥</span>
          <span>User Management</span>
        </button>
        <button class="sidebar-nav-item" data-tab="tab-settings">
          <span>⚙️</span>
          <span>Station Settings</span>
        </button>
        <button class="sidebar-nav-item" data-tab="tab-logs">
          <span>📋</span>
          <span>Activity Logs</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button id="logoutBtn" class="sidebar-logout-btn">
          <span>🚪</span>
          <span>Fita (Logout)</span>
        </button>
      </div>
    </aside>

    <!-- Main Working Area -->
    <main class="admin-main-area">
      
      <!-- Top Navigation Bar -->
      <header class="admin-top-bar">
        <div class="top-bar-left">
          <h1 class="top-bar-title" id="pageTitleText">Dashboard Overview</h1>
          <span class="top-bar-status-badge">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #18c77a;"></span>
            Neon Database Online
          </span>
        </div>

        <div class="top-bar-right">
          <span style="font-size: 0.85rem; color: var(--admin-text-muted);">
            Barka da zuwa, <strong id="adminUserGreeting" style="color: var(--admin-primary);"><?php echo htmlspecialchars($_SESSION['admin_user'] ?? 'Admin'); ?></strong>
          </span>
          <a href="/" target="_blank" rel="noopener" class="view-site-btn">
            <span>🌐</span>
            <span>Duba Yanar Gizo</span>
          </a>
        </div>
      </header>

      <!-- Dynamic Content Tabs -->
      <div class="admin-body-content">
        
        <!-- ===================================================================
             TAB 1: OVERVIEW & DASHBOARD METRICS
             =================================================================== -->
        <div id="tab-overview" class="admin-tab-pane active">
          
          <!-- Metric Cards -->
          <div class="admin-metrics-grid">
            <div class="metric-card">
              <div class="metric-icon-box">🎧</div>
              <div class="metric-details">
                <h4>Total Listeners</h4>
                <div class="metric-number">152,480</div>
                <span class="metric-trend">↑ +14.2% this week</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon-box">📻</div>
              <div class="metric-details">
                <h4>Radio Stream</h4>
                <div class="metric-number" style="color: #18c77a;">ONLINE</div>
                <span class="metric-trend" style="color: var(--admin-primary);">HD 128k &amp; 48k AAC</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon-box">📺</div>
              <div class="metric-details">
                <h4>Television HD</h4>
                <div class="metric-number" style="color: #18c77a;">LIVE</div>
                <span class="metric-trend" style="color: var(--admin-primary);">1080p HLS Active</span>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon-box">📰</div>
              <div class="metric-details">
                <h4>Articles Published</h4>
                <div class="metric-number">28</div>
                <span class="metric-trend">Across 7 Languages</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions & Status -->
          <div class="admin-card">
            <div class="admin-card-header">
              <div>
                <h3 class="admin-card-title">⚡ Tashoshin Watsawa Kai Tsaye (Live Broadcast Feeds)</h3>
                <p class="admin-card-sub">Gudanar da adireshin audio da video kai tsaye</p>
              </div>
              <button class="btn-primary" onclick="switchTab('tab-streams')">Daidaita Saituna →</button>
            </div>
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 240px; background: var(--admin-light-blue); padding: 14px; border-radius: 10px;">
                <div style="font-size: 0.75rem; font-weight: 800; color: var(--admin-primary);">CURRENT SHOW</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: var(--admin-text-dark);" id="overviewCurrentShow">
                  <?php echo htmlspecialchars($settings['current_show'] ?? 'Shirin Barka da Safe'); ?>
                </div>
                <div style="font-size: 0.8rem; color: var(--admin-text-muted);">Tare da Amina Hausawi</div>
              </div>
              <div style="flex: 1; min-width: 240px; background: var(--admin-light-blue); padding: 14px; border-radius: 10px;">
                <div style="font-size: 0.75rem; font-weight: 800; color: var(--admin-primary);">LATEST TICKER ANNOUNCEMENT</div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--admin-text-dark);" id="overviewTickerText">
                  <?php echo htmlspecialchars($settings['breaking_news'] ?? 'An bude sabuwar kafar watsa labarai...'); ?>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ===================================================================
             TAB 2: STREAM & STATION SETTINGS
             =================================================================== -->
        <div id="tab-streams" class="admin-tab-pane">
          <div class="admin-card">
            <div class="admin-card-header">
              <div>
                <h3 class="admin-card-title">📡 Saitunan Watsa Sauti da Hoto (Stream Settings)</h3>
                <p class="admin-card-sub">Ana sabunta waɗannan kai tsaye a cikin database ɗin Neon Postgres</p>
              </div>
            </div>

            <form id="streamSettingsForm">
              <div class="admin-form-row">
                <div class="admin-input-group">
                  <label for="radio_stream_url">Radio Stream URL (Icecast / Zeno / Shoutcast)</label>
                  <input type="url" id="radio_stream_url" class="admin-input" value="<?php echo htmlspecialchars($settings['radio_stream_url'] ?? 'https://stream.zeno.fm/4wvy4w9612zuv'); ?>" required>
                </div>
                <div class="admin-input-group">
                  <label for="radio_fallback_url">Radio Fallback URL (Backup Stream)</label>
                  <input type="url" id="radio_fallback_url" class="admin-input" value="<?php echo htmlspecialchars($settings['radio_fallback_url'] ?? 'https://icecast.broadcast.com/live.aac'); ?>">
                </div>
              </div>

              <div class="admin-form-row">
                <div class="admin-input-group">
                  <label for="tv_stream_url">Live TV Stream URL (HLS / m3u8)</label>
                  <input type="url" id="tv_stream_url" class="admin-input" value="<?php echo htmlspecialchars($settings['tv_stream_url'] ?? 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'); ?>" required>
                </div>
                <div class="admin-input-group">
                  <label for="current_show">Sunan Shirin da Ake Ciki (Current Show)</label>
                  <input type="text" id="current_show" class="admin-input" value="<?php echo htmlspecialchars($settings['current_show'] ?? 'Shirin Barka da Safe'); ?>" required>
                </div>
              </div>

              <div class="admin-input-group">
                <label for="breaking_news">Labaran Gaggawa a Ticker (Breaking News Marquee)</label>
                <input type="text" id="breaking_news" class="admin-input" value="<?php echo htmlspecialchars($settings['breaking_news'] ?? 'LABARAN DUNIYA: An bude sabuwar kafar watsa labarai ta Arab Hausa Radio & TV kai tsaye a yanar gizo!'); ?>" required>
              </div>

              <button type="submit" class="btn-primary" id="saveSettingsBtn">
                💾 Adana Saituna (Save Stream Settings)
              </button>
              <span id="settingsSaveStatus" style="margin-left: 14px; font-weight: 700;"></span>
            </form>
          </div>
        </div>

        <!-- ===================================================================
             TAB 3: PROGRAMME SCHEDULE MANAGER
             =================================================================== -->
        <div id="tab-schedule" class="admin-tab-pane">
          <div class="admin-card">
            <div class="admin-card-header">
              <div>
                <h3 class="admin-card-title">📅 Sanya Sabon Shiri a Tsarin Lokaci (Add Program Schedule)</h3>
                <p class="admin-card-sub">Kula da lokutan shirye-shiryen rediyo da talabijin</p>
              </div>
            </div>

            <form id="addScheduleForm">
              <div class="admin-form-row">
                <div class="admin-input-group">
                  <label for="sched_title">Sunan Shiri (Program Title)</label>
                  <input type="text" id="sched_title" class="admin-input" placeholder="Misali: Barka da Asuba" required>
                </div>
                <div class="admin-input-group">
                  <label for="sched_host">Mai Gabatarwa (Host)</label>
                  <input type="text" id="sched_host" class="admin-input" placeholder="Misali: Amina Hausawi" required>
                </div>
              </div>

              <div class="admin-form-row">
                <div class="admin-input-group">
                  <label for="sched_time">Lokaci (Time Slot)</label>
                  <input type="text" id="sched_time" class="admin-input" placeholder="Misali: 08:00 - 09:30" required>
                </div>
                <div class="admin-input-group">
                  <label for="sched_type">Nau'in Shiri (Type)</label>
                  <select id="sched_type" class="admin-select">
                    <option value="Radio">Radio</option>
                    <option value="TV">TV</option>
                  </select>
                </div>
              </div>

              <div class="admin-input-group">
                <label for="sched_desc">Bayanin Shiri (Description)</label>
                <textarea id="sched_desc" class="admin-textarea" placeholder="Takaitaccen bayani kan shirin..."></textarea>
              </div>

              <button type="submit" class="btn-primary">➕ Sanya a Tsari (Add Program)</button>
            </form>
          </div>

          <div class="admin-card">
            <h3 class="admin-card-title" style="margin-bottom: 16px;">Shirye-shiryen da ke Kan Tsari:</h3>
            <div class="admin-table-wrapper" id="scheduleTableWrapper">
              <!-- Loaded by JS -->
            </div>
          </div>
        </div>

        <!-- ===================================================================
             TAB 4: NEWS & ARTICLES MANAGER
             =================================================================== -->
        <div id="tab-news" class="admin-tab-pane">
          <div class="admin-card">
            <div class="admin-card-header">
              <div>
                <h3 class="admin-card-title">📰 Buga Sabon Labari (Publish News Article)</h3>
                <p class="admin-card-sub">Yada sabon labari ga masu sauraro a duk duniya</p>
              </div>
            </div>

            <form id="publishNewsForm">
              <div class="admin-form-row">
                <div class="admin-input-group">
                  <label for="news_title">Kanun Labari (Hausa Title)</label>
                  <input type="text" id="news_title" class="admin-input" placeholder="Babban labari..." required>
                </div>
                <div class="admin-input-group">
                  <label for="news_title_ar">Kanun Labari a Larabci (Arabic Title)</label>
                  <input type="text" id="news_title_ar" class="admin-input" dir="rtl" placeholder="عنوان الخبر بالعربية...">
                </div>
              </div>

              <div class="admin-form-row">
                <div class="admin-input-group">
                  <label for="news_category">Rukuni (Category)</label>
                  <select id="news_category" class="admin-select">
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
                <textarea id="news_content" class="admin-textarea" style="min-height: 120px;" placeholder="Rubuta cikakken labari a nan..." required></textarea>
              </div>

              <button type="submit" class="btn-primary">📰 Buga Labari (Publish)</button>
            </form>
          </div>

          <div class="admin-card">
            <h3 class="admin-card-title" style="margin-bottom: 16px;">Labaran da Aka Buga:</h3>
            <div class="admin-table-wrapper" id="newsTableWrapper">
              <!-- Loaded by JS -->
            </div>
          </div>
        </div>

        <!-- ===================================================================
             TAB 5: MEDIA & PODCASTS
             =================================================================== -->
        <div id="tab-media" class="admin-tab-pane">
          <div class="admin-card">
            <h3 class="admin-card-title">📁 Dakin Shirye-shirye &amp; Fayafayai (Media Management)</h3>
            <p class="admin-card-sub">Loda sauti da hotuna don amfani a tasha</p>
            
            <div style="border: 2px dashed var(--admin-border); border-radius: 12px; padding: 36px 20px; text-align: center; margin: 20px 0; background: var(--admin-bg);">
              <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">📤</span>
              <h4 style="margin: 0; color: var(--admin-text-dark);">Jefa fayil a nan ko danna don lodawa</h4>
              <p style="color: var(--admin-text-muted); font-size: 0.8rem; margin: 4px 0 16px 0;">MP3, AAC, PNG, JPG (Max 50MB)</p>
              <button class="btn-primary" type="button" onclick="alert('An bude dakin fayiloli. Zabi fayil.');">Zabi Fayil</button>
            </div>
          </div>
        </div>

        <!-- ===================================================================
             TAB 6: USER MANAGEMENT
             =================================================================== -->
        <div id="tab-users" class="admin-tab-pane">
          <div class="admin-card">
            <h3 class="admin-card-title">👥 Masu Amfani da Shafin (Registered Listeners &amp; Admins)</h3>
            <p class="admin-card-sub">Jerin masu rajista a kafar Arab Hausa</p>

            <div class="admin-table-wrapper" style="margin-top: 16px;">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Suna</th>
                    <th>Imel</th>
                    <th>Matsayi</th>
                    <th>Rana</th>
                    <th>Aiki</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Amina Hausawi</strong></td>
                    <td>amina@arabhausa.com</td>
                    <td><span style="background: var(--admin-light-blue); color: var(--admin-primary); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 800;">Super Admin</span></td>
                    <td>2026-10-28</td>
                    <td><span style="color: #18c77a; font-weight: 700;">Active</span></td>
                  </tr>
                  <tr>
                    <td><strong>Musa Abdullahi</strong></td>
                    <td>musa@gmail.com</td>
                    <td><span style="background: #eef2f6; color: var(--admin-text-body); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700;">Listener</span></td>
                    <td>2026-10-27</td>
                    <td><span style="color: #18c77a; font-weight: 700;">Active</span></td>
                  </tr>
                  <tr>
                    <td><strong>Fatima Al-Mansoor</strong></td>
                    <td>fatima@arabhausa.com</td>
                    <td><span style="background: var(--admin-light-blue); color: var(--admin-primary); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 800;">Presenter</span></td>
                    <td>2026-10-25</td>
                    <td><span style="color: #18c77a; font-weight: 700;">Active</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ===================================================================
             TAB 7: WEBSITE SETTINGS
             =================================================================== -->
        <div id="tab-settings" class="admin-tab-pane">
          <div class="admin-card">
            <h3 class="admin-card-title">⚙️ Saitunan Yanar Gizo (Website Configuration)</h3>
            <p class="admin-card-sub">Bayanan hedikwatar tasha da hanyoyin sadarwa</p>

            <div class="admin-input-group" style="margin-top: 16px;">
              <label>Adireshin Babban Ofis (Head Office)</label>
              <input type="text" class="admin-input" value="No 54 Guda Abdullahi Street Farm Center Tarauni Kano State Nigeria" readonly>
            </div>

            <div class="admin-form-row">
              <div class="admin-input-group">
                <label>Official WhatsApp Number</label>
                <input type="text" class="admin-input" value="+2347088959565" readonly>
              </div>
              <div class="admin-input-group">
                <label>Official Station Email</label>
                <input type="text" class="admin-input" value="arabhausartv@gmail.com" readonly>
              </div>
            </div>

            <div class="admin-input-group">
              <label>Developer WhatsApp (Amina)</label>
              <input type="text" class="admin-input" value="09090809080" readonly>
            </div>
          </div>
        </div>

        <!-- ===================================================================
             TAB 8: ACTIVITY LOGS
             =================================================================== -->
        <div id="tab-logs" class="admin-tab-pane">
          <div class="admin-card">
            <h3 class="admin-card-title">📋 Tarihin Ayyuka (System Activity Logs)</h3>
            <p class="admin-card-sub">Duk ayyukan da aka gudanar a shafin admin</p>

            <div class="admin-table-wrapper" style="margin-top: 16px;">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Lokaci</th>
                    <th>Mai Aiki</th>
                    <th>Aiki</th>
                    <th>Sakamako</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Yau, 18:05</td>
                    <td>Admin</td>
                    <td>An sabunta kalar yanar gizo zuwa Blue &amp; White</td>
                    <td><span style="color: #18c77a; font-weight: 700;">Success</span></td>
                  </tr>
                  <tr>
                    <td>Yau, 17:42</td>
                    <td>Admin</td>
                    <td>Daidaita tsarin shirye-shiryen rediyo</td>
                    <td><span style="color: #18c77a; font-weight: 700;">Success</span></td>
                  </tr>
                  <tr>
                    <td>Yau, 16:15</td>
                    <td>System</td>
                    <td>Neon Database ping &amp; health check</td>
                    <td><span style="color: #18c77a; font-weight: 700;">200 OK</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>

  </div>

  <script src="/js/admin.js?v=11"></script>
</body>
</html>
