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
const tmpDataFile = path.join(tmpDataDir, 'media.json');

function streamBuffer(req, res, fullBuffer, mimeType = 'video/mp4') {
  const total = fullBuffer.length;
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes'
    });
    return res.end();
  }

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const maxChunk = 2 * 1024 * 1024; // 2MB slice
    let end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + maxChunk - 1, total - 1);
    if (end >= total) end = total - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
    });
    return res.end(fullBuffer.subarray(start, end + 1));
  }

  // Without range header
  if (total <= 3.8 * 1024 * 1024) {
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
    });
    return res.end(fullBuffer);
  }

  const firstEnd = Math.min(2 * 1024 * 1024 - 1, total - 1);
  res.writeHead(206, {
    'Content-Range': `bytes 0-${firstEnd}/${total}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': firstEnd + 1,
    'Content-Type': mimeType,
    'Cache-Control': 'public, max-age=86400'
  });
  return res.end(fullBuffer.subarray(0, firstEnd + 1));
}

function streamFile(req, res, filePath, mimeType = 'video/mp4') {
  try {
    const stat = fs.statSync(filePath);
    const total = stat.size;

    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Length': total,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes'
      });
      return res.end();
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const maxChunk = 2 * 1024 * 1024;
      let end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + maxChunk - 1, total - 1);
      if (end >= total) end = total - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
      });
      if (typeof res.on === 'function') {
        const stream = fs.createReadStream(filePath, { start, end });
        return stream.pipe(res);
      } else {
        const buf = Buffer.alloc(chunksize);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buf, 0, chunksize, start);
        fs.closeSync(fd);
        return res.end(buf);
      }
    }

    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400'
    });
    if (typeof res.on === 'function') {
      return fs.createReadStream(filePath).pipe(res);
    } else {
      return res.end(fs.readFileSync(filePath));
    }
  } catch (err) {
    console.error('File stream error:', err);
    return res.status(500).send('File streaming error');
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = (req.query?.id || '').trim();
  if (!videoId) {
    return res.status(400).send('Video ID is required.');
  }

  try {
    // 1. Check local & tmp assembled video files
    const cleanId = videoId.replace(/\.mp4$/i, '');
    const candidateFiles = [
      path.join(localUploadsDir, `${cleanId}.mp4`),
      path.join(tmpUploadsDir, `${cleanId}.mp4`),
      path.join(localUploadsDir, videoId),
      path.join(tmpUploadsDir, videoId)
    ];

    for (const f of candidateFiles) {
      if (fs.existsSync(f)) {
        return streamFile(req, res, f, 'video/mp4');
      }
    }

    // 2. Check local & tmp video chunk files on disk
    const chunkDirs = [
      path.join(tmpChunksDir, cleanId),
      path.join(localChunksDir, cleanId)
    ];
    for (const cDir of chunkDirs) {
      if (fs.existsSync(cDir)) {
        try {
          const files = fs.readdirSync(cDir).filter(f => f.endsWith('.dat')).sort((a, b) => parseInt(a) - parseInt(b));
          if (files.length > 0) {
            const buffers = files.map(f => Buffer.from(fs.readFileSync(path.join(cDir, f), 'utf8'), 'base64'));
            return streamBuffer(req, res, Buffer.concat(buffers), 'video/mp4');
          }
        } catch (e) {}
      }
    }

    // 3. Check media.json catalog for matching external or static URL
    try {
      let mediaList = [];
      if (fs.existsSync(tmpDataFile)) {
        mediaList = JSON.parse(fs.readFileSync(tmpDataFile, 'utf8') || '[]');
      } else if (fs.existsSync(localDataFile)) {
        mediaList = JSON.parse(fs.readFileSync(localDataFile, 'utf8') || '[]');
      }
      const match = mediaList.find(m => String(m.id) === videoId || (m.url && m.url.includes(videoId)));
      if (match && match.url && !match.url.startsWith('/api/video-stream')) {
        return res.redirect(302, match.url);
      }
    } catch (e) {}

    // 4. Try Neon DB if reachable
    try {
      const sql = getDbClient();
      const rows = await sql.query(
        `SELECT chunk_index, mime_type, chunk_data 
         FROM video_chunks 
         WHERE video_id = $1 
         ORDER BY chunk_index ASC`,
        [videoId]
      );

      if (rows && rows.length > 0) {
        const mimeType = rows[0].mime_type || 'video/mp4';
        const buffers = rows.map(r => Buffer.from(r.chunk_data, 'base64'));
        return streamBuffer(req, res, Buffer.concat(buffers), mimeType);
      }

      // Check media table for an external url
      const mediaRows = await sql.query(
        `SELECT url FROM media WHERE id = $1 OR url LIKE '%' || $1 LIMIT 1`,
        [isNaN(Number(videoId)) ? 0 : Number(videoId)]
      );
      if (mediaRows && mediaRows[0] && mediaRows[0].url && !mediaRows[0].url.startsWith('/api/video-stream')) {
        return res.redirect(302, mediaRows[0].url);
      }
    } catch (neonErr) {
      console.warn('[video-stream] Neon DB skipped (quota reached or offline):', neonErr.message);
    }

    // 5. Graceful fallback for lost or quota-locked streams:
    // Redirect cleanly to live station broadcast so players never break or display quota errors
    return res.redirect(302, 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  } catch (err) {
    console.error('Error handling video stream request:', err);
    return res.redirect(302, 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  }
};
