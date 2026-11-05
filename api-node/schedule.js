const fs = require('fs');
const path = require('path');
const { getDbClient } = require('./db');

const scheduleFile = path.join(__dirname, '..', 'data', 'schedule.json');

function getLocalSchedule() {
  try {
    if (fs.existsSync(scheduleFile)) {
      return JSON.parse(fs.readFileSync(scheduleFile, 'utf8') || '[]');
    }
  } catch (e) {}
  return [];
}

function saveLocalSchedule(items) {
  try {
    const dir = path.dirname(scheduleFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(scheduleFile, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');

  if (req.method === 'GET') {
    let dbRows = null;
    try {
      const sql = getDbClient();
      dbRows = await sql.query('SELECT id, time_slot, title, host, description, broadcast_type, is_live FROM schedule ORDER BY id ASC');
    } catch (err) {
      console.warn('Neon query failed (using persistent local schedule):', err.message);
    }

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      return res.status(200).json({ success: true, schedule: dbRows });
    }

    return res.status(200).json({ success: true, schedule: getLocalSchedule() });
  }

  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const newItem = {
      id: Date.now(),
      time_slot: data.time_slot,
      title: data.title,
      host: data.host || '',
      description: data.description || '',
      broadcast_type: data.broadcast_type || 'RADIO',
      is_live: data.is_live === true || data.is_live === 'true'
    };

    const current = getLocalSchedule();
    current.push(newItem);
    saveLocalSchedule(current);

    try {
      const sql = getDbClient();
      await sql.query(
        'INSERT INTO schedule (time_slot, title, host, description, broadcast_type, is_live) VALUES ($1, $2, $3, $4, $5, $6)',
        [newItem.time_slot, newItem.title, newItem.host, newItem.description, newItem.broadcast_type, newItem.is_live]
      );
    } catch (err) {}

    return res.status(200).json({ success: true, message: 'Program added to schedule successfully' });
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query?.id || 0, 10);
    const current = getLocalSchedule();
    const updated = current.filter(s => s.id !== id);
    saveLocalSchedule(updated);

    try {
      const sql = getDbClient();
      await sql.query('DELETE FROM schedule WHERE id = $1', [id]);
    } catch (e) {}

    return res.status(200).json({ success: true, message: 'Program removed successfully' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
