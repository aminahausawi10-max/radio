require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}

const { Client } = require('pg');

async function migrate() {
  const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('🔄 Connecting to Neon Postgres database for migration...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon successfully!');

    // Create Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ↳ Table created: settings');

    // Create News Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) DEFAULT '',
        category VARCHAR(50) DEFAULT 'General',
        content TEXT NOT NULL,
        author VARCHAR(100) DEFAULT 'Arab Hausa Editorial',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ↳ Table created: news');

    // Create Schedule Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        host VARCHAR(100) NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        broadcast_type VARCHAR(20) DEFAULT 'Radio',
        description TEXT,
        is_live BOOLEAN DEFAULT false
      );
    `);
    console.log('  ↳ Table created: schedules');

    // Create Admin Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ↳ Table created: admin_users');

    // Create Media Table for Public Videos, Photos, and Voice Notes
    await client.query(`
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'General',
        url TEXT NOT NULL,
        size VARCHAR(50) DEFAULT '',
        poster_url TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('  ↳ Table created: media');

    // Seed default settings
    const defaultSettings = [
      ["radio_stream_url", "https://stream.zeno.fm/4wvy4w9612zuv"],
      ["radio_fallback_url", "https://icecast.broadcast.com/live.aac"],
      ["tv_stream_url", "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"],
      ["station_name", "Arab Hausa Radio TV"],
      ["station_tagline", "Muryar Al'umma da Hadin Kan Kasashen Larabawa da Hausa"],
      ["current_show", "Shirin Barka da Safe tare da Amina Hausawi"],
      ["breaking_news", "LABARAN DUNIYA: An bude sabuwar kafar watsa labarai ta Arab Hausa Radio & TV kai tsaye!"],
      ["contact_whatsapp", "+2348000000000"],
      ["status_broadcast", "LIVE ON AIR"]
    ];

    for (const [key, val] of defaultSettings) {
      await client.query(`
        INSERT INTO settings (setting_key, setting_value)
        VALUES ($1, $2)
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
      `, [key, val]);
    }
    console.log('  ↳ Seeded default settings');

    // Seed news if empty
    const newsCheck = await client.query('SELECT COUNT(*) FROM news');
    if (parseInt(newsCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO news (title, title_ar, category, content, author) VALUES
        ('Kaddamar da Kafar Arab Hausa Radio TV a Yanar Gizo', 'إطلاق منصة راديو وتلفزيون عرب هوسا عبر الإنترنت', 'Broadcasting', 'An kaddamar da babban gidan rediyo da talabijin na Arab Hausa don hada kan al''ummar Hausawa da kasashen Larabawa ta hanyar watsa shirye-shirye masu inganci.', 'Amina Hausawi'),
        ('Sabon Tsarin Watsa Shirye-shiryen Addini da Al''adu', 'برامج ثقافية ودينية مشتركة بين العرب والهوسا', 'Culture', 'Gidan rediyon zai rika kawo muku shirye-shiryen tafsir, koyon harshen Larabci, da tarihin hadin gwiwar kasashen Afirka da na Larabawa.', 'Dr. Umar Farouq'),
        ('Ziyarar Hadin Gwiwa tsakanin Manyan Masana', 'لقاءات إعلامية وثقافية تجمع نخب المجتمع', 'Politics', 'Masana da manazarta sun yaba da wannan shiri na zamani wanda ke amfani da fasahar intanet mai saurin gaske wajen isar da sauti da hoto.', 'Arab Hausa News');
      `);
      console.log('  ↳ Seeded sample news articles');
    }

    // Seed schedule if empty
    const scheduleCheck = await client.query('SELECT COUNT(*) FROM schedules');
    if (parseInt(scheduleCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO schedules (title, host, time_slot, broadcast_type, description, is_live) VALUES
        ('Barka da Asuba & Al''kurani Mai Girma', 'Sheikh Ahmad Bello', '05:00 - 06:30', 'Radio', 'Karatun kurani da daddadan bayani kan hadin kan al''umma', false),
        ('Labaran Safe da Sharhi', 'Amina Hausawi', '07:00 - 08:30', 'Radio', 'Labaran duniya kai tsaye daga kasashen Larabawa da Afirka', true),
        ('Koyon Larabci Cikin Sauki', 'Malam Ibrahim Zaria', '10:00 - 11:00', 'TV', 'Darasi na musamman don koyon harshen Larabci', false),
        ('Bayan Fage: Tattaunawa kan Tattalin Arziki', 'Alhaji Mansur Arabi', '14:00 - 15:30', 'TV', 'Tattaunawa da masana kan huldar kasuwanci tsakanin Najeriya da kasashen Gulf', false),
        ('Zababbun Wakokin Gargajiya da na Larabawa', 'DJ Salisu', '20:00 - 22:00', 'Radio', 'Daren nishadi da daddadan kade-kade', false);
      `);
      console.log('  ↳ Seeded daily broadcast schedule');
    }

    // Seed default admin (Password: admin123)
    const adminCheck = await client.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(adminCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO admin_users (username, password_hash)
        VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa82280f1a61e3710');
      `);
      console.log('  ↳ Seeded default admin user (username: admin, default password: admin123)');
    }

    // Seed default media items if empty
    const mediaCheck = await client.query('SELECT COUNT(*) FROM media');
    if (parseInt(mediaCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO media (type, name, category, url, size) VALUES
        ('video', 'Arab Hausa TV HD Live Feed', 'TV Broadcast', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'HD Live Stream'),
        ('photo', 'Dakin Watsa Labarai na Arab Hausa TV', 'TV Studio', '/images/logo.png', '95 KB'),
        ('photo', 'Official Station QR Code (Mobile Access)', 'Station Photo Gallery', '/images/qr-code.png', '6.2 KB');
      `);
      console.log('  ↳ Seeded initial media items (videos and photos)');
    }

    console.log('✨ All migrations and seeds completed successfully on Neon Postgres!');
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
