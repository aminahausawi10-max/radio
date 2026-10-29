const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const res = await pool.query(
    "UPDATE media SET url = '/images/logo.png', name = 'Arab Hausa Official Station Logo' WHERE id = 1"
  );
  console.log('Updated media item 1:', res.rowCount);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
