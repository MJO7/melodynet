const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {              // idle client died (e.g. Postgres stopped); log, don't crash
  console.error('idle pg client error:', err.message);
});

module.exports = pool;
