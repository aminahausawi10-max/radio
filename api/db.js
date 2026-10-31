const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}
const { Pool } = require('pg');

let pool = null;

function getDbClient() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_KabABmFgv8o5@ep-billowing-sound-b4grdojl.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
    pool = new Pool({
      connectionString: connectionString.trim().replace(/^['"]+|['"]+$/g, ''),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10
    });
  }

  return {
    async query(text, params = []) {
      const result = await pool.query(text, params);
      return result.rows || [];
    }
  };
}

module.exports = { getDbClient, getDbPool: getDbClient };
