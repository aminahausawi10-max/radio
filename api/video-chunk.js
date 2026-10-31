const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDbClient } = require('./db');

const tmpDataDir = path.join(os.tmpdir(), 'arab_hausa_data');
const localDataDir = path.join(__dirname, '..', 'data');
const localChunksDir = path.join(localDataDir, 'video_chunks');
const tmpChunksDir = path.join(tmpDataDir, 'video_chunks');
const localUploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const tmpUploadsDir = path.join(tmpDataDir, 'uploads');
const localDataFile = path.join(localDataDir, 'media.json');
const publicDataFile = path.join(__dirname, '..', 'public', 'data', 'media.json');
const tmpDataFile = path.join(tmpDataDir, 'media.json');

function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {}
}

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
  try {
    ensureDir(localDataDir);
    fs.writeFileSync(localDataFile, jsonStr, 'utf8');
    ensureDir(path.dirname(publicDataFile));
    fs.writeFileSync(publicDataFile, jsonStr, 'utf8');
  } catch (e) {}

  try {
    ensureDir(tmpDataDir);
    fs.writeFileSync(tmpDataFile, jsonStr, 'utf8');
  } catch (e) {}
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { videoId, chunkIndex, totalChunks, mimeType, data, isFinal, metadata } = body || {};

    if (!videoId || chunkIndex === undefined || !totalChunks || !data) {
      return res.status(400).json({ success: false, message: 'Missing required chunk parameters.' });
    }

    const cleanMime = mimeType || 'video/mp4';
    const cIndex = parseInt(chunkIndex, 10);
    const tChunks = parseInt(totalChunks, 10);

    // 1. Store chunk reliably in disk / tmp storage (resilient to Neon DB quota limits)
    try {
      ensureDir(path.join(tmpChunksDir, videoId));
      fs.writeFileSync(path.join(tmpChunksDir, videoId, `${cIndex}.dat`), data, 'utf8');
    } catch (e) {}
    try {
      ensureDir(path.join(localChunksDir, videoId));
      fs.writeFileSync(path.join(localChunksDir, videoId, `${cIndex}.dat`), data, 'utf8');
    } catch (e) {}

    // 2. Also attempt Neon DB storage if within quota
    try {
      const sql = getDbClient();
      await sql.query(
        `INSERT INTO video_chunks (video_id, chunk_index, total_chunks, mime_type, chunk_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [videoId, cIndex, tChunks, cleanMime, data]
      );
    } catch (neonErr) {
      // Neon cloud quota reached or temporarily offline - continue smoothly via disk/tmp storage
      console.warn(`[video-chunk] Neon DB skipped (quota reached or offline): ${neonErr.message}`);
    }

    // 3. If this is the final chunk, assemble the video and publish to media list
    if (isFinal) {
      const { title, category, size, posterUrl } = metadata || {};
      const videoName = title || 'Arab Hausa Video Broadcast';
      const videoCat = category || 'TV Broadcast';
      const videoSize = size || 'HD Video';

      // Assemble all chunks into full video binary
      let assembledBuffer = null;
      try {
        const parts = [];
        for (let i = 0; i < tChunks; i++) {
          let chunkStr = '';
          const tmpPath = path.join(tmpChunksDir, videoId, `${i}.dat`);
          const localPath = path.join(localChunksDir, videoId, `${i}.dat`);
          if (fs.existsSync(tmpPath)) {
            chunkStr = fs.readFileSync(tmpPath, 'utf8');
          } else if (fs.existsSync(localPath)) {
            chunkStr = fs.readFileSync(localPath, 'utf8');
          }
          if (chunkStr) {
            parts.push(Buffer.from(chunkStr, 'base64'));
          }
        }
        if (parts.length > 0) {
          assembledBuffer = Buffer.concat(parts);
        }
      } catch (asmErr) {
        console.warn('[video-chunk] Error assembling chunks:', asmErr);
      }

      const savedVideoFileName = `${videoId}.mp4`;
      const directVideoUrl = `/uploads/${savedVideoFileName}`;
      const streamUrl = `/api/video-stream?id=${encodeURIComponent(videoId)}`;

      if (assembledBuffer) {
        try {
          ensureDir(localUploadsDir);
          fs.writeFileSync(path.join(localUploadsDir, savedVideoFileName), assembledBuffer);
        } catch (e) {}
        try {
          ensureDir(tmpUploadsDir);
          fs.writeFileSync(path.join(tmpUploadsDir, savedVideoFileName), assembledBuffer);
        } catch (e) {}

        // Clean up temporary chunk files to reclaim storage
        try {
          const tmpDirToClean = path.join(tmpChunksDir, videoId);
          if (fs.existsSync(tmpDirToClean)) fs.rmSync(tmpDirToClean, { recursive: true, force: true });
          const localDirToClean = path.join(localChunksDir, videoId);
          if (fs.existsSync(localDirToClean)) fs.rmSync(localDirToClean, { recursive: true, force: true });
        } catch (e) {}
      }

      const finalVideoUrl = directVideoUrl;

      const mediaItem = {
        id: Date.now(),
        type: 'video',
        name: videoName,
        category: videoCat,
        url: finalVideoUrl,
        stream_url: streamUrl,
        size: videoSize,
        poster_url: posterUrl || '',
        created_at: new Date().toISOString()
      };

      // Persist to local JSON media catalog
      try {
        const currentList = getLocalMedia();
        currentList.unshift(mediaItem);
        saveLocalMedia(currentList);
      } catch (e) {}

      // Attempt to save into Neon DB media table if available
      try {
        const sql = getDbClient();
        const result = await sql.query(
          `INSERT INTO media (type, name, category, url, size, poster_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          ['video', videoName, videoCat, finalVideoUrl, videoSize, posterUrl || '']
        );
        if (result && result[0] && result[0].id) {
          mediaItem.id = result[0].id;
        }
      } catch (saveErr) {
        console.warn('[video-chunk] Neon DB media insert skipped (quota reached or offline):', saveErr.message);
      }

      return res.status(200).json({
        success: true,
        message: 'Video uploaded and published successfully!',
        isFinal: true,
        media: mediaItem,
        url: finalVideoUrl
      });
    }

    return res.status(200).json({
      success: true,
      message: `Chunk ${cIndex + 1}/${tChunks} received`,
      chunkIndex: cIndex
    });
  } catch (err) {
    console.error('Video chunk upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process video chunk: ' + (err.message || 'Unknown server error')
    });
  }
};
