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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Range');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};

  // 1. RESUME HANDSHAKE (GET /api/video-chunk?action=check&videoId=...)
  if (req.method === 'GET' || query.action === 'check') {
    const videoId = (query.videoId || '').replace(/[^a-zA-Z0-9_\-]/g, '');
    const totalChunks = parseInt(query.totalChunks || 0, 10);

    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Missing videoId' });
    }

    // Check if video is already assembled
    const exts = ['mp4', 'webm', 'mov', 'mkv'];
    for (const ext of exts) {
      const loc = path.join(localUploadsDir, `${videoId}.${ext}`);
      const tmp = path.join(tmpUploadsDir, `${videoId}.${ext}`);
      if (fs.existsSync(loc) || fs.existsSync(tmp)) {
        return res.status(200).json({
          success: true,
          alreadyCompleted: true,
          videoId,
          url: `/uploads/${videoId}.${ext}`,
          stream_url: `/api/video-stream?id=${encodeURIComponent(videoId)}`,
          message: 'Video already uploaded and completed'
        });
      }
    }

    const cDirs = [path.join(tmpChunksDir, videoId), path.join(localChunksDir, videoId)];
    const foundSet = new Set();
    for (const d of cDirs) {
      if (fs.existsSync(d)) {
        try {
          const files = fs.readdirSync(d);
          files.forEach(f => {
            const m = f.match(/^(\d+)\.dat$/);
            if (m) foundSet.add(parseInt(m[1], 10));
          });
        } catch (e) {}
      }
    }

    const uploadedChunks = Array.from(foundSet).sort((a, b) => a - b);
    return res.status(200).json({
      success: true,
      alreadyCompleted: false,
      videoId,
      uploadedChunks,
      uploadedCount: uploadedChunks.length,
      totalChunks
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const videoId = ((body && body.videoId) || query.videoId || '').replace(/[^a-zA-Z0-9_\-]/g, '');
    const action = (body && body.action) || query.action || 'upload';
    const isFinal = Boolean((body && body.isFinal) || action === 'complete');
    const totalChunks = parseInt((body && body.totalChunks) || query.totalChunks || 0, 10);
    const chunkIndex = parseInt((body && body.chunkIndex) !== undefined ? body.chunkIndex : query.chunkIndex, 10);

    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Missing videoId' });
    }

    // 2. ASSEMBLY ACTION (when all chunks are uploaded)
    if (isFinal || action === 'complete') {
      const metadata = (body && body.metadata) || body || {};
      const videoName = metadata.title || 'Arab Hausa Video Broadcast';
      const videoCat = metadata.category || 'TV Broadcast';
      const videoSize = metadata.size || 'HD Video';
      const posterUrl = metadata.posterUrl || '';
      const ext = (metadata.ext || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';

      let assembledBuffer = null;
      try {
        const parts = [];
        const missingChunks = [];
        for (let i = 0; i < totalChunks; i++) {
          const tmpPath = path.join(tmpChunksDir, videoId, `${i}.dat`);
          const localPath = path.join(localChunksDir, videoId, `${i}.dat`);
          if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 0) {
            parts.push(fs.readFileSync(tmpPath));
          } else if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
            parts.push(fs.readFileSync(localPath));
          } else {
            missingChunks.push(i);
          }
        }
        if (missingChunks.length > 0) {
          return res.status(200).json({
            success: false,
            message: `Cannot assemble video: ${missingChunks.length} chunks are missing`,
            missingChunks,
            totalChunks
          });
        }
        if (parts.length === totalChunks) {
          assembledBuffer = Buffer.concat(parts);
        }
      } catch (asmErr) {
        console.warn('[video-chunk] Error assembling chunks:', asmErr);
      }

      if (!assembledBuffer || assembledBuffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Video assembly paused: not all chunks are available on server'
        });
      }

      const savedVideoFileName = `${videoId}.${ext}`;
      const directVideoUrl = `/uploads/${savedVideoFileName}`;
      const streamUrl = `/api/video-stream?id=${encodeURIComponent(videoId)}`;

      try {
        ensureDir(localUploadsDir);
        fs.writeFileSync(path.join(localUploadsDir, savedVideoFileName), assembledBuffer);
      } catch (e) {}
      try {
        ensureDir(tmpUploadsDir);
        fs.writeFileSync(path.join(tmpUploadsDir, savedVideoFileName), assembledBuffer);
      } catch (e) {}

      // Clean up chunk files
      try {
        const tmpD = path.join(tmpChunksDir, videoId);
        if (fs.existsSync(tmpD)) fs.rmSync(tmpD, { recursive: true, force: true });
        const locD = path.join(localChunksDir, videoId);
        if (fs.existsSync(locD)) fs.rmSync(locD, { recursive: true, force: true });
      } catch (e) {}

      const mediaItem = {
        id: Date.now(),
        type: 'video',
        name: videoName,
        category: videoCat,
        url: directVideoUrl,
        stream_url: streamUrl,
        size: videoSize,
        poster_url: posterUrl || '',
        created_at: new Date().toISOString()
      };

      try {
        const currentList = getLocalMedia().filter(m => m.url !== directVideoUrl && m.name !== videoName);
        currentList.unshift(mediaItem);
        saveLocalMedia(currentList);
      } catch (e) {}

      // Optional DB insert
      try {
        const sql = getDbClient();
        await sql.query(
          `INSERT INTO media (type, name, category, url, stream_url, size, poster_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['video', videoName, videoCat, directVideoUrl, streamUrl, videoSize, posterUrl || '']
        );
      } catch (dbErr) {}

      return res.status(200).json({
        success: true,
        message: 'Video uploaded and published successfully!',
        isFinal: true,
        media: mediaItem,
        url: directVideoUrl,
        stream_url: streamUrl
      });
    }

    // 3. CHUNK UPLOAD
    if (isNaN(chunkIndex)) {
      return res.status(400).json({ success: false, message: 'Missing chunkIndex' });
    }

    // Handle incoming chunk buffer or base64 data
    let chunkBuf = null;
    if (Buffer.isBuffer(req.body)) {
      chunkBuf = req.body;
    } else if (body && body.data) {
      chunkBuf = Buffer.from(body.data, 'base64');
    }

    if (!chunkBuf) {
      return res.status(400).json({ success: false, message: 'Empty chunk data' });
    }

    try {
      ensureDir(path.join(tmpChunksDir, videoId));
      fs.writeFileSync(path.join(tmpChunksDir, videoId, `${chunkIndex}.dat`), chunkBuf);
    } catch (e) {}
    try {
      ensureDir(path.join(localChunksDir, videoId));
      fs.writeFileSync(path.join(localChunksDir, videoId, `${chunkIndex}.dat`), chunkBuf);
    } catch (e) {}

    return res.status(200).json({
      success: true,
      chunkIndex,
      videoId,
      message: `Chunk ${chunkIndex + 1} saved`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
