const { getDbClient } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');

  const sql = getDbClient();

  if (req.method === 'GET') {
    try {
      const type = req.query?.type || '';
      let query = 'SELECT id, title, host, time_slot, broadcast_type, description, is_live FROM schedules';
      const params = [];
      if (type) {
        params.push(type);
        query += ' WHERE broadcast_type ILIKE $1';
      }
      query += ' ORDER BY id ASC';

      const rows = await sql.query(query, params);
      return res.status(200).json({ success: true, schedule: rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    try {
      await sql.query(
        'INSERT INTO schedules (title, host, time_slot, broadcast_type, description, is_live) VALUES ($1, $2, $3, $4, $5, $6)',
        [data.title, data.host, data.time_slot, data.broadcast_type || 'Radio', data.description || '', data.is_live ? true : false]
      );
      return res.status(200).json({ success: true, message: 'Program scheduled' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query?.id || 0, 10);
    try {
      await sql.query('DELETE FROM schedules WHERE id = $1', [id]);
      return res.status(200).json({ success: true, message: 'Program deleted' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
