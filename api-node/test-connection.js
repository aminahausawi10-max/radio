const { getDbClient } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const start = Date.now();
  const sql = getDbClient();

  try {
    const dbRes = await sql.query('SELECT NOW() as current_time, version() as pg_version');
    const latency = Date.now() - start;

    const stats = await sql.query(`
      SELECT 
        (SELECT COUNT(*) FROM settings) as settings_count,
        (SELECT COUNT(*) FROM news) as news_count,
        (SELECT COUNT(*) FROM schedules) as schedules_count,
        (SELECT COUNT(*) FROM admin_users) as admin_count;
    `);

    return res.status(200).json({
      status: 'ONLINE',
      provider: 'Neon Serverless Lakebase Postgres',
      latency_ms: latency,
      database_time: dbRes[0].current_time,
      postgres_version: dbRes[0].pg_version,
      tables_data: stats[0]
    });
  } catch (err) {
    return res.status(500).json({
      status: 'OFFLINE',
      error: err.message
    });
  }
};
