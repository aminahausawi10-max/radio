const { Pool } = require('pg');

let pool = null;

function getDbPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gC34EcGhNios@ep-frosty-shape-b53w7pdh.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

module.exports = { getDbPool };
