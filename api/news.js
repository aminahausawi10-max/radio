const { getDbClient } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const sql = getDbClient();

  if (req.method === 'GET') {
    try {
      const category = req.query?.category || '';
      const search = req.query?.search || '';

      let query = 'SELECT id, title, title_ar, category, content, author, created_at FROM news';
      const params = [];
      const where = [];

      if (category && category !== 'All') {
        params.push(category);
        where.push(`category = $${params.length}`);
      }

      if (search) {
        params.push(`%${search}%`);
        where.push(`(title ILIKE $${params.length} OR content ILIKE $${params.length})`);
      }

      if (where.length > 0) query += ' WHERE ' + where.join(' AND ');
      query += ' ORDER BY id DESC LIMIT 20';

      const rows = await sql.query(query, params);
      return res.status(200).json({ success: true, news: rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    try {
      await sql.query(
        'INSERT INTO news (title, title_ar, category, content, author) VALUES ($1, $2, $3, $4, $5)',
        [data.title, data.title_ar || '', data.category || 'General', data.content, data.author || 'Arab Hausa Desk']
      );
      return res.status(200).json({ success: true, message: 'Article published' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query?.id || 0, 10);
    try {
      await sql.query('DELETE FROM news WHERE id = $1', [id]);
      return res.status(200).json({ success: true, message: 'Article deleted' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
