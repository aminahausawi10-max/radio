const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}
const { Pool } = require('pg');

let pool = null;

function resetDbClient() {
  if (pool) {
    try { pool.end(); } catch (e) {}
    pool = null;
  }
}

function getDbClient() {
  if (!pool) {
    const rawUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_KabABmFgv8o5@ep-billowing-sound-b4grdojl.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
    const connectionString = rawUrl.trim().replace(/^['"]+|['"]+$/g, '');

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10
    });

    pool.on('error', (err) => {
      console.warn('Neon pg pool client error:', err.message);
      resetDbClient();
    });
  }

  return {
    async query(text, params = []) {
      try {
        const result = await pool.query(text, params);
        return result.rows || [];
      } catch (err) {
        if (err.message && (err.message.includes('quota') || err.code === '53000')) {
          // Neon project has exceeded free quota; propagate immediately so persistent local fallback takes over instantly
          throw err;
        }
        if (err.message && (err.message.includes('closed') || err.message.includes('terminated') || err.message.includes('timeout'))) {
          console.warn('Retrying DB query with fresh connection:', err.message);
          resetDbClient();
          const freshPool = getDbClient();
          const retryResult = await pool.query(text, params);
          return retryResult.rows || [];
        }
        throw err;
      }
    }
  };
}

module.exports = { getDbClient, getDbPool: getDbClient, resetDbClient };
