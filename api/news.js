const fs = require('fs');
const path = require('path');
const { getDbClient } = require('./db');

const newsFile = path.join(__dirname, '..', 'data', 'news.json');

function getLocalNews() {
  try {
    if (fs.existsSync(newsFile)) {
      return JSON.parse(fs.readFileSync(newsFile, 'utf8') || '[]');
    }
  } catch (e) {}
  return [];
}

function saveLocalNews(items) {
  try {
    const dir = path.dirname(newsFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(newsFile, JSON.stringify(items, null, 2), 'utf8');
  } catch (e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');

  if (req.method === 'GET') {
    const category = req.query?.category || '';
    const search = req.query?.search || '';
    let dbRows = null;

    try {
      const sql = getDbClient();
      let query = 'SELECT id, title, title_ar, category, content, author, image_url, media_url, created_at FROM news';
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
      query += ' ORDER BY id DESC LIMIT 50';

      dbRows = await sql.query(query, params);
    } catch (err) {
      console.warn('Neon query failed (using persistent local news):', err.message);
    }

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      return res.status(200).json({ success: true, news: dbRows });
    }

    let localNews = getLocalNews();
    if (category && category !== 'All') {
      localNews = localNews.filter(n => n.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      localNews = localNews.filter(n => (n.title && n.title.toLowerCase().includes(s)) || (n.content && n.content.toLowerCase().includes(s)));
    }
    return res.status(200).json({ success: true, news: localNews });
  }

  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const newItem = {
      id: Date.now(),
      title: data.title,
      title_ar: data.title_ar || '',
      category: data.category || 'General',
      content: data.content,
      author: data.author || 'Arab Hausa Editorial Desk',
      image_url: data.image_url || '',
      media_url: data.media_url || '',
      created_at: new Date().toISOString()
    };

    const current = getLocalNews();
    current.unshift(newItem);
    saveLocalNews(current);

    try {
      const sql = getDbClient();
      await sql.query(
        'INSERT INTO news (title, title_ar, category, content, author, image_url, media_url) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [newItem.title, newItem.title_ar, newItem.category, newItem.content, newItem.author, newItem.image_url, newItem.media_url]
      );
    } catch (err) {}

    return res.status(200).json({ success: true, message: 'Article published successfully', article: newItem });
  }

  if (req.method === 'DELETE') {
    const id = parseInt(req.query?.id || 0, 10);
    const current = getLocalNews();
    const updated = current.filter(n => n.id !== id);
    saveLocalNews(updated);

    try {
      const sql = getDbClient();
      await sql.query('DELETE FROM news WHERE id = $1', [id]);
    } catch (e) {}

    return res.status(200).json({ success: true, message: 'Article deleted successfully' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
