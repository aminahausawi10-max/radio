const { neon } = require('@neondatabase/serverless');

let sql = null;

function getDbClient() {
  if (!sql) {
    let connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_gC34EcGhNios@ep-frosty-shape-b53w7pdh.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
    connectionString = connectionString.trim().replace(/^['"]+|['"]+$/g, '');
    sql = neon(connectionString);
  }
  return sql;
}

module.exports = { getDbClient };
