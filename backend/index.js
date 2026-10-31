require('dotenv').config();              // fill process.env from .env (must be first)
const express = require('express');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {         // pg would silently fall back to PG* defaults
  console.error('DATABASE_URL is not set; check backend/.env');
  process.exit(1);
}

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {              // idle client died (e.g. Postgres stopped); log, don't crash
  console.error('idle pg client error:', err.message);
});

app.use(express.json());                 // parse JSON request bodies (needed once we add POST routes)

app.get('/health', async (req, res) => { // GET /health -> checks the database too
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: true });
  } catch (err) {
    console.error('health check failed:', err.message);
    res.status(503).json({ ok: false, db: false });
  }
});

app.use((req, res) => {                  // anything unmatched -> 404
  res.status(404).json({ error: 'not found' });
});

app.use((err, req, res, next) => {       // last-resort error handler
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(process.env.PORT, () => {     // open the port, then log
  console.log('listening on', process.env.PORT);
});
