const { getDbClient } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDbClient();

  if (req.method === 'GET') {
    try {
      const rows = await sql.query('SELECT setting_key, setting_value FROM settings');
      const settings = {};
      rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
      return res.status(200).json({ success: true, settings });
    } catch (err) {
      console.error('Error fetching settings:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    try {
      for (const [key, val] of Object.entries(data)) {
        if (key === 'action') continue;
        await sql.query(`
          INSERT INTO settings (setting_key, setting_value, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP;
        `, [key, String(val)]);
      }
      return res.status(200).json({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
      console.error('Error updating settings:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
