require('dotenv').config();              // fill process.env from .env (must be first)
const express = require('express');
const pool = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set; check backend/.env');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {         // pg would silently fall back to PG* defaults
  console.error('DATABASE_URL is not set; check backend/.env');
  process.exit(1);
}

const app = express();
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

app.use(require('./routes/auth'));
app.use(require('./routes/users'));
app.use(require('./routes/posts'));
app.use(require('./routes/comments'));
app.use(require('./routes/reactions'));

app.use((req, res) => {                  // anything unmatched -> 404
  res.status(404).json({ error: 'not found' });
});

app.use((err, req, res, next) => {       // last-resort error handler
  if (err.status >= 400 && err.status < 500) {   // e.g. malformed JSON body
    return res.status(err.status).json({ error: err.type === 'entity.parse.failed' ? 'invalid JSON' : err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(process.env.PORT, () => {     // open the port, then log
  console.log('listening on', process.env.PORT);
});
