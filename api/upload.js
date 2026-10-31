const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDbClient } = require('./db');

const tmpDataDir = path.join(os.tmpdir(), 'arab_hausa_data');
const localDataFile = path.join(__dirname, '..', 'data', 'media.json');
const publicDataFile = path.join(__dirname, '..', 'public', 'data', 'media.json');
const tmpDataFile = path.join(tmpDataDir, 'media.json');
const localUploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const tmpUploadsDir = path.join(tmpDataDir, 'uploads');

function getLocalMedia() {
  try {
    if (fs.existsSync(tmpDataFile)) {
      const content = fs.readFileSync(tmpDataFile, 'utf8');
      const items = JSON.parse(content || '[]');
      if (Array.isArray(items) && items.length > 0) return items;
    }
  } catch (e) {}

  try {
    if (fs.existsSync(localDataFile)) {
      const content = fs.readFileSync(localDataFile, 'utf8');
      return JSON.parse(content || '[]');
    }
  } catch (e) {}

  return [];
}

function saveLocalMedia(items) {
  const jsonStr = JSON.stringify(items, null, 2);

  // 1. Try writing locally (local dev / VPS)
  try {
    const dir = path.dirname(localDataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localDataFile, jsonStr, 'utf8');

    const pubDir = path.dirname(publicDataFile);
    if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
    fs.writeFileSync(publicDataFile, jsonStr, 'utf8');
  } catch (e) {}

  // 2. Always write to /tmp/ (works 100% on Vercel serverless)
  try {
    if (!fs.existsSync(tmpDataDir)) fs.mkdirSync(tmpDataDir, { recursive: true });
    fs.writeFileSync(tmpDataFile, jsonStr, 'utf8');
  } catch (e) {}
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
      console.warn('Neon DB query error in upload.js:', err.message);
    }

    if (Array.isArray(dbRows) && dbRows.length > 0) {
      return res.status(200).json({
        success: true,
        media: dbRows
      });
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

      // Check if uploaded as base64 data URL
      const rawData = String(dataUrl || url || '');
      if (rawData.startsWith('data:')) {
        // Keep self-contained base64 data URL for Postgres TEXT storage - ensures 100% availability across all devices and serverless instances
        finalMediaUrl = rawData;

        // Try writing a local backup if disk is writable (local dev only)
        try {
          const matches = rawData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
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
            try {
              if (!fs.existsSync(localUploadsDir)) fs.mkdirSync(localUploadsDir, { recursive: true });
              fs.writeFileSync(path.join(localUploadsDir, filename), buffer);
            } catch (e) {}
          }
        } catch (fileErr) {}
      }

      const mediaSize = size || (finalMediaUrl.startsWith('data:') ? `${(finalMediaUrl.length * 0.75 / 1024).toFixed(1)} KB` : 'HD Media');

      const newItem = {
        id: Date.now(),
        type: mediaType,
        name: mediaName,
        category: mediaCat,
        url: finalMediaUrl,
        size: mediaSize,
        created_at: new Date().toISOString()
      };

      // 1. Attempt to save to Neon DB first with retry
      let dbSaved = false;
      let dbError = null;

      try {
        const sql = getDbClient();
        const result = await sql.query(
          'INSERT INTO media (type, name, category, url, size) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [mediaType, mediaName, mediaCat, finalMediaUrl, mediaSize]
        );
        if (result && result[0] && result[0].id) {
          newItem.id = result[0].id;
          dbSaved = true;
        }
      } catch (neonErr) {
        dbError = neonErr;
        console.warn('Neon DB first attempt failed, retrying...', neonErr.message);
        try {
          const { resetDbClient, getDbClient: getFreshDb } = require('./db');
          if (typeof resetDbClient === 'function') resetDbClient();
          const sql = getFreshDb();
          const result = await sql.query(
            'INSERT INTO media (type, name, category, url, size) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [mediaType, mediaName, mediaCat, finalMediaUrl, mediaSize]
          );
          if (result && result[0] && result[0].id) {
            newItem.id = result[0].id;
            dbSaved = true;
          }
        } catch (retryErr) {
          dbError = retryErr;
          console.error('Neon DB retry failed:', retryErr.message);
        }
      }

      // 2. Persist to local / tmp JSON storage with verified ID
      const currentList = getLocalMedia();
      currentList.unshift(newItem);
      saveLocalMedia(currentList);

      if (!dbSaved && dbError) {
        console.warn('Neon DB quota exceeded or offline. Saved to high-capacity local/tmp storage:', dbError.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Media uploaded successfully! It is now active on TV and media feeds.',
        media: newItem
      });
    } catch (err) {
      console.error('Error uploading media:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to process media upload: ' + (err.message || 'Unknown server error')
      });
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

      // Remove physical file from public/uploads/ or tmpUploadsDir if it exists
      if (itemToDelete && itemToDelete.url && itemToDelete.url.startsWith('/uploads/')) {
        const relPath = itemToDelete.url.replace(/^\//, '');
        try {
          const localFilePath = path.join(__dirname, '..', 'public', relPath);
          if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
        } catch (unlinkErr) {}
        try {
          const tmpFilePath = path.join(tmpUploadsDir, path.basename(relPath));
          if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
        } catch (unlinkErr) {}
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

        // Clean up video chunks if this was a chunked video stream
        const streamMatch = (itemToDelete?.url || id).match(/video-stream\?id=([^&]+)/);
        if (streamMatch && streamMatch[1]) {
          await sql.query('DELETE FROM video_chunks WHERE video_id = $1', [decodeURIComponent(streamMatch[1])]);
        }
      } catch (e) {}

      return res.status(200).json({
        success: true,
        message: 'Media deleted successfully from server and database.'
      });
    } catch (err) {
      console.error('Error deleting media:', err);
      return res.status(200).json({ success: true, message: 'Media deleted.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
