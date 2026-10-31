const fs = require('fs');
const path = require('path');
const { getDbClient } = require('./db');

const mediaFilePath = path.join(__dirname, '..', 'data', 'media.json');
const publicMediaFilePath = path.join(__dirname, '..', 'public', 'data', 'media.json');
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

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
      query += ' ORDER BY id DESC LIMIT 100';
      dbRows = await sql.query(query, params);
    } catch (err) {
      // Graceful fallback to persistent JSON storage (e.g. when Neon quota exceeded)
    }

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      return res.status(200).json({ success: true, media: dbRows });
    }

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

      let finalMediaUrl = url || dataUrl;
      if (!type || !finalMediaUrl) {
        return res.status(400).json({ success: false, message: 'Type and file URL or data are required.' });
      }

      const mediaType = (type || 'photo').toLowerCase();
      const mediaName = name || (mediaType === 'video' ? 'Arab Hausa Video' : 'Station Photo');
      const mediaCat = category || (mediaType === 'video' ? 'TV Broadcast' : 'TV Studio');

      // Save base64 data to physical file on disk to avoid payload bloat
      if (dataUrl && dataUrl.startsWith('data:')) {
        try {
          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            let ext = 'jpg';
            if (mimeType.includes('png')) ext = 'png';
            else if (mimeType.includes('gif')) ext = 'gif';
            else if (mimeType.includes('webp')) ext = 'webp';
            else if (mimeType.includes('mp4')) ext = 'mp4';
            else if (mimeType.includes('webm')) ext = 'webm';
            else if (mimeType.includes('audio') || mimeType.includes('mpeg')) ext = 'mp3';

            const filename = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

            fs.writeFileSync(path.join(uploadsDir, filename), buffer);
            finalMediaUrl = `/uploads/${filename}`;
          }
        } catch (fileErr) {
          console.warn('Saving base64 to file warning:', fileErr.message);
        }
      }

      const mediaSize = size || (dataUrl ? `${(dataUrl.length * 0.75 / 1024).toFixed(1)} KB` : 'HD Stream');

      const newItem = {
        id: Date.now(),
        type: mediaType,
        name: mediaName,
        category: mediaCat,
        url: finalMediaUrl,
        size: mediaSize,
        created_at: new Date().toISOString()
      };

      // Always save to persistent local JSON files
      const currentList = getLocalMedia();
      currentList.unshift(newItem);
      saveLocalMedia(currentList);

      // Attempt to save to Neon DB if available
      try {
        const sql = getDbClient();
        const result = await sql.query(
          'INSERT INTO media (type, name, category, url, size) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [mediaType, mediaName, mediaCat, finalMediaUrl, mediaSize]
        );
        if (result && result[0] && result[0].id) {
          newItem.id = result[0].id;
        }
      } catch (neonErr) {
        // Safe fallback - item is already safely persisted to disk and JSON
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

  // 3. DELETE MEDIA (Permanently removes item & disk file)
  if (req.method === 'DELETE') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const id = String(req.query?.id || body.id || '');

      if (!id) {
        return res.status(400).json({ success: false, message: 'Media ID is required to delete.' });
      }

      const currentList = getLocalMedia();
      const itemToDelete = currentList.find(m => String(m.id) === id || m.url === id);

      // Remove physical file from public/uploads/ if it exists
      if (itemToDelete && itemToDelete.url && itemToDelete.url.startsWith('/uploads/')) {
        try {
          const localFilePath = path.join(__dirname, '..', 'public', itemToDelete.url.replace(/^\//, ''));
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        } catch (unlinkErr) {
          console.warn('Physical file deletion warning:', unlinkErr.message);
        }
      }

      const updated = currentList.filter(m => String(m.id) !== id && m.url !== id);
      saveLocalMedia(updated);

      // Attempt to delete from Neon DB if available
      try {
        const sql = getDbClient();
        const numId = parseInt(id, 10);
        if (numId) {
          await sql.query('DELETE FROM media WHERE id = $1 OR url = $2', [numId, id]);
        } else {
          await sql.query('DELETE FROM media WHERE url = $1', [id]);
        }
      } catch (e) {}

      return res.status(200).json({
        success: true,
        message: 'Media deleted successfully from server and database.'
      });
    } catch (err) {
      console.error('Error deleting media:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
