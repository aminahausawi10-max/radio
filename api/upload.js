const { getDbClient } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const sql = getDbClient();

  // 1. GET ALL MEDIA (Photos, Videos, Voice Notes) FROM NEON POSTGRES
  if (req.method === 'GET') {
    try {
      const type = req.query?.type || '';
      let query = 'SELECT id, type, name, category, url, size, created_at FROM media';
      const params = [];

      if (type && type !== 'all') {
        params.push(type);
        query += ' WHERE type = $1';
      }

      query += ' ORDER BY id DESC LIMIT 60';
      const rows = await sql.query(query, params);

      return res.status(200).json({
        success: true,
        media: rows
      });
    } catch (err) {
      console.error('Error fetching media from Neon:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. POST NEW MEDIA (UPLOAD PHOTO, VIDEO, VOICE NOTE) TO NEON POSTGRES
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { type, name, category, dataUrl, url, size } = body || {};

      const mediaUrl = url || dataUrl;
      if (!type || !mediaUrl) {
        return res.status(400).json({ success: false, message: 'Type and file URL/data are required.' });
      }

      const mediaType = (type || 'photo').toLowerCase();
      const mediaName = name || (mediaType === 'video' ? 'Arab Hausa Video' : mediaType === 'voicenote' ? 'Voice Note Dispatch' : 'Station Photo');
      const mediaCat = category || 'General';
      const mediaSize = size || (dataUrl ? `${(dataUrl.length * 0.75 / 1024).toFixed(1)} KB` : 'Direct Stream');

      const result = await sql.query(
        'INSERT INTO media (type, name, category, url, size) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [mediaType, mediaName, mediaCat, mediaUrl, mediaSize]
      );

      const inserted = result[0] || {
        id: Date.now(),
        type: mediaType,
        name: mediaName,
        category: mediaCat,
        url: mediaUrl,
        size: mediaSize,
        created_at: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        message: 'Media uploaded and saved to database successfully',
        media: inserted
      });
    } catch (err) {
      console.error('Error inserting media into Neon:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // 3. DELETE MEDIA FROM NEON POSTGRES
  if (req.method === 'DELETE') {
    const id = parseInt(req.query?.id || 0, 10);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Media ID is required.' });
    }

    try {
      await sql.query('DELETE FROM media WHERE id = $1', [id]);
      return res.status(200).json({ success: true, message: 'Media deleted successfully' });
    } catch (err) {
      console.error('Error deleting media from Neon:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
