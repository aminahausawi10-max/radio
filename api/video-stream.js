const { getDbClient } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query?.id || '';
  if (!videoId) {
    return res.status(400).send('Video ID is required.');
  }

  try {
    const sql = getDbClient();
    const rows = await sql.query(
      `SELECT chunk_index, mime_type, chunk_data 
       FROM video_chunks 
       WHERE video_id = $1 
       ORDER BY chunk_index ASC`,
      [videoId]
    );

    if (!rows || rows.length === 0) {
      // Check if it exists in media table with an external url
      const mediaRows = await sql.query(
        `SELECT url FROM media WHERE id = $1 OR url LIKE '%' || $1 LIMIT 1`,
        [isNaN(Number(videoId)) ? 0 : Number(videoId)]
      );
      if (mediaRows && mediaRows[0] && mediaRows[0].url && !mediaRows[0].url.startsWith('/api/video-stream')) {
        return res.redirect(302, mediaRows[0].url);
      }
      return res.status(404).send('Video not found.');
    }

    const mimeType = rows[0].mime_type || 'video/mp4';
    const buffers = rows.map(r => Buffer.from(r.chunk_data, 'base64'));
    const fullBuffer = Buffer.concat(buffers);
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

    // Default response without range header
    if (total <= 3.8 * 1024 * 1024) {
      res.writeHead(200, {
        'Content-Length': total,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
      });
      return res.end(fullBuffer);
    }

    // For larger files requested without range, stream first 2MB slice with 206
    const firstEnd = Math.min(2 * 1024 * 1024 - 1, total - 1);
    res.writeHead(206, {
      'Content-Range': `bytes 0-${firstEnd}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': firstEnd + 1,
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400'
    });
    return res.end(fullBuffer.subarray(0, firstEnd + 1));
  } catch (err) {
    console.error('Error streaming video:', err);
    return res.status(500).send('Error streaming video: ' + (err.message || 'Server error'));
  }
};
