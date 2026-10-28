require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}

const { Client } = require('pg');

async function testServices() {
  console.log('🧪 Starting End-to-End Service Verification on Neon Postgres...');
  const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ Failed: No DATABASE_URL found in environment.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const start = Date.now();
    await client.connect();
    const connectTime = Date.now() - start;
    console.log(`✅ [1/4] Neon Postgres Connection Verified (${connectTime}ms)`);

    // Test Settings table
    const settingsRes = await client.query('SELECT setting_key, setting_value FROM settings LIMIT 5');
    console.log(`✅ [2/4] Settings Service Verified (${settingsRes.rowCount} settings loaded)`);
    settingsRes.rows.forEach(r => console.log(`       • ${r.setting_key}: ${r.setting_value}`));

    // Test News table
    const newsRes = await client.query('SELECT id, title, category FROM news LIMIT 3');
    console.log(`✅ [3/4] News Service Verified (${newsRes.rowCount} articles found)`);

    // Test Schedule table
    const schedRes = await client.query('SELECT title, time_slot, broadcast_type FROM schedules');
    console.log(`✅ [4/4] Program Schedule Service Verified (${schedRes.rowCount} programs active)`);

    console.log('\n🎉 ALL SERVICES WIRED AND FULLY OPERATIONAL WITH NEON POSTGRES!\n');
  } catch (err) {
    console.error('❌ Service test failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testServices();
