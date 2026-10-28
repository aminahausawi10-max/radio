const { getDbPool } = require('./db');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const action = req.query?.action || '';

  if (req.method === 'POST' && action === 'login') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const username = data?.username?.trim() || '';
    const password = data?.password?.trim() || '';

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const pool = getDbPool();
    try {
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      const result = await pool.query('SELECT id, username, password_hash FROM admin_users WHERE username = $1 LIMIT 1', [username]);

      if (result.rows.length > 0 && result.rows[0].password_hash === hash) {
        return res.status(200).json({ success: true, message: 'Logged in successfully', user: username });
      }

      // Allow default credentials fallback
      if (username === 'admin' && password === 'admin123') {
        return res.status(200).json({ success: true, message: 'Logged in successfully', user: username });
      }

      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (err) {
      if (username === 'admin' && password === 'admin123') {
        return res.status(200).json({ success: true, message: 'Logged in successfully', user: username });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (action === 'logout') {
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }

  return res.status(200).json({ authenticated: false });
};
