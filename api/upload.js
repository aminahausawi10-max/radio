const fs = require('fs');
const path = require('path');
const { getDbClient } = require('./db');

const mediaFilePath = path.join(__dirname, '..', 'data', 'media.json');
const publicMediaFilePath = path.join(__dirname, '..', 'public', 'data', 'media.json');

function getLocalMedia() {
  try {
    if (fs.existsSync(mediaFilePath)) {
      const content = fs.readFileSync(mediaFilePath, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (e) {
    console.warn('Error reading local media file:', e.message);
  }
  return [];
}

function saveLocalMedia(items) {
  try {
    const jsonStr = JSON.stringify(items, null, 2);
    const dir = path.dirname(mediaFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mediaFilePath, jsonStr, 'utf8');

    const publicDir = path.dirname(publicMediaFilePath);
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(publicMediaFilePath, jsonStr, 'utf8');
  } catch (e) {
    console.warn('Error saving local media file:', e.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET ALL MEDIA
  if (req.method === 'GET') {
    const type = req.query?.type || '';
    let dbRows = null;

    try {
      const sql = getDbClient();
      let query = 'SELECT id, type, name, category, url, size, created_at FROM media';
      const params = [];
      if (type && type !== 'all') {
        params.push(type);
        query += ' WHERE type = $1';
      }
      query += ' ORDER BY id DESC LIMIT 60';
      dbRows = await sql.query(query, params);
    } catch (err) {
      console.warn('Neon query failed (using persistent local file):', err.message);
    }

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      return res.status(200).json({ success: true, media: dbRows });
    }

    // Fallback to persistent local storage
    let localItems = getLocalMedia();
    if (type && type !== 'all') {
      localItems = localItems.filter(m => m.type === type);
    }
    localItems.sort((a, b) => (b.id || 0) - (a.id || 0));

    return res.status(200).json({
      success: true,
      media: localItems
    });
  }

  // 2. POST NEW MEDIA (UPLOAD PHOTO OR VIDEO FROM GALLERY)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { type, name, category, dataUrl, url, size } = body || {};

      const mediaUrl = url || dataUrl;
      if (!type || !mediaUrl) {
        return res.status(400).json({ success: false, message: 'Type and file URL or data are required.' });
      }

      const mediaType = (type || 'photo').toLowerCase();
      const mediaName = name || (mediaType === 'video' ? 'Arab Hausa Video' : 'Station Photo');
      const mediaCat = category || (mediaType === 'video' ? 'TV Broadcast' : 'TV Studio');
      const mediaSize = size || (dataUrl ? `${(dataUrl.length * 0.75 / 1024).toFixed(1)} KB` : 'Direct Stream');

      const newItem = {
        id: Date.now(),
        type: mediaType,
        name: mediaName,
        category: mediaCat,
        url: mediaUrl,
        size: mediaSize,
        created_at: new Date().toISOString()
      };

      // Always save to persistent local JSON file
      const currentList = getLocalMedia();
      currentList.unshift(newItem);
      saveLocalMedia(currentList);

      // Attempt to save to Neon DB if available
      try {
        const sql = getDbClient();
        const result = await sql.query(
          'INSERT INTO media (type, name, category, url, size) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [mediaType, mediaName, mediaCat, mediaUrl, mediaSize]
        );
        if (result && result[0]) {
          newItem.id = result[0].id;
        }
      } catch (neonErr) {
        console.warn('Neon insert skipped (saved locally):', neonErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Media uploaded successfully! It is now active on TV and media feeds.',
        media: newItem
      });
    } catch (err) {
      console.error('Error uploading media:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // 3. DELETE MEDIA
  if (req.method === 'DELETE') {
    const id = parseInt(req.query?.id || 0, 10);
    if (!id) {
      return res.status(400).json({ success: false, message: 'Media ID is required.' });
    }

    try {
      const currentList = getLocalMedia();
      const updated = currentList.filter(m => m.id !== id);
      saveLocalMedia(updated);

      try {
        const sql = getDbClient();
        await sql.query('DELETE FROM media WHERE id = $1', [id]);
      } catch (e) {}

      return res.status(200).json({ success: true, message: 'Media deleted successfully' });
    } catch (err) {
      console.error('Error deleting media:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
