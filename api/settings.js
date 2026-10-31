const fs = require('fs');
const path = require('path');
const { getDbClient } = require('./db');

const settingsFile = path.join(__dirname, '..', 'data', 'settings.json');

function getLocalSettings() {
  try {
    if (fs.existsSync(settingsFile)) {
      return JSON.parse(fs.readFileSync(settingsFile, 'utf8') || '{}');
    }
  } catch (e) {}
  return {
    radio_stream_url: 'https://stream.zeno.fm/4wvy4w9612zuv',
    radio_fallback_url: 'https://icecast.broadcast.com/live.aac',
    tv_stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    tv_is_live: 'true',
    current_show: 'Shirin Barka da Safe (Tare da Amina Hausawi)',
    breaking_news: 'LABARAN DUNIYA: An bude sabuwar kafar watsa labarai ta Arab Hausa Radio & TV kai tsaye a yanar gizo!'
  };
}

function saveLocalSettings(data) {
  try {
    const dir = path.dirname(settingsFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const current = getLocalSettings();
    const updated = { ...current, ...data };
    fs.writeFileSync(settingsFile, JSON.stringify(updated, null, 2), 'utf8');
  } catch (e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    let settings = null;
    try {
      const sql = getDbClient();
      const rows = await sql.query('SELECT setting_key, setting_value FROM settings');
      if (Array.isArray(rows) && rows.length > 0) {
        settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
      }
    } catch (err) {
      console.warn('Neon query failed (using persistent local settings):', err.message);
    }

    if (!settings) {
      settings = getLocalSettings();
    }

    return res.status(200).json({ success: true, settings });
  }

  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    saveLocalSettings(data);

    try {
      const sql = getDbClient();
      for (const [key, val] of Object.entries(data)) {
        if (key === 'action') continue;
        await sql.query(`
          INSERT INTO settings (setting_key, setting_value, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP;
        `, [key, String(val)]);
      }
    } catch (err) {
      console.warn('Neon update skipped (saved locally):', err.message);
    }

    return res.status(200).json({ success: true, message: 'Settings updated successfully' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
