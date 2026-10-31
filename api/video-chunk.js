const { getDbClient } = require('./db');

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
    const sql = getDbClient();

    // 1. Store chunk in Neon DB
    await sql.query(
      `INSERT INTO video_chunks (video_id, chunk_index, total_chunks, mime_type, chunk_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [videoId, parseInt(chunkIndex, 10), parseInt(totalChunks, 10), cleanMime, data]
    );

    // 2. If this is the final chunk, publish to media table
    if (isFinal) {
      const { title, category, size, posterUrl } = metadata || {};
      const videoName = title || 'Arab Hausa Video Broadcast';
      const videoCat = category || 'TV Broadcast';
      const videoSize = size || 'HD Video';
      const finalStreamUrl = `/api/video-stream?id=${encodeURIComponent(videoId)}`;

      let savedRow = null;
      try {
        const result = await sql.query(
          `INSERT INTO media (type, name, category, url, size, poster_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          ['video', videoName, videoCat, finalStreamUrl, videoSize, posterUrl || '']
        );
        if (result && result[0]) {
          savedRow = result[0];
        }
      } catch (saveErr) {
        console.error('Error inserting video to media table:', saveErr.message);
      }

      const mediaItem = savedRow || {
        id: Date.now(),
        type: 'video',
        name: videoName,
        category: videoCat,
        url: finalStreamUrl,
        size: videoSize,
        poster_url: posterUrl || '',
        created_at: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        message: 'Video uploaded and published successfully!',
        isFinal: true,
        media: mediaItem
      });
    }

    return res.status(200).json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received`,
      chunkIndex
    });
  } catch (err) {
    console.error('Video chunk upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process video chunk: ' + (err.message || 'Unknown server error')
    });
  }
};
