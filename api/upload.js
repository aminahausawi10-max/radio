module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { type, name, category, dataUrl, url } = body || {};

      if (!type || (!dataUrl && !url)) {
        return res.status(400).json({ success: false, message: 'Type and file data or URL are required.' });
      }

      const mediaItem = {
        id: Date.now(),
        type: type || 'photo',
        name: name || 'Uploaded Media',
        category: category || 'General',
        url: url || dataUrl,
        created_at: new Date().toISOString(),
        size: dataUrl ? `${(dataUrl.length * 0.75 / 1024).toFixed(1)} KB` : 'External Link'
      };

      return res.status(200).json({
        success: true,
        message: 'Media uploaded successfully',
        media: mediaItem
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
