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

// ---------- AUTH ----------
app.post('/auth/register', wrap(async (req, res) => {
  const { username, email, password, display_name } = req.body;
  if (!username || !email || !password || password.length < 6)
    return res.status(400).json({ error: 'username, email and a 6+ character password are required' });
  const { rows } = await db.query(
    `INSERT INTO users (username, email, password_hash, display_name) VALUES ($1, lower($2), $3, $4)
     RETURNING id, username, email, display_name`,
    [username, email, await bcrypt.hash(password, 10), display_name || username]);
  res.json({ token: signToken(rows[0]), user: rows[0] });
}));

app.post('/auth/login', wrap(async (req, res) => {
  const { login, password } = req.body; // login = username or email
  const { rows } = await db.query('SELECT * FROM users WHERE username = $1 OR email = lower($1)', [login || '']);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) return res.status(401).json({ error: 'Invalid login' });
  res.json({ token: signToken(u), user: { id: u.id, username: u.username, email: u.email, display_name: u.display_name } });
}));

// Follow a user.
app.post("/api/users/:id/follow", authenticate, async (req, res) => {
  const followeeId = req.params.id;

  if (!/^[1-9]\d*$/.test(followeeId) || followeeId === String(req.userId))
    return res.status(400).json({ error: "Invalid user ID" });

  try {
    await db.query(
      `INSERT INTO follows (follower_id, followee_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.userId, followeeId]
    );

    res.json({ following: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to follow user" });
  }
});

// Unfollow a user.
app.delete("/api/users/:id/follow", authenticate, async (req, res) => {
  const followeeId = req.params.id;

  if (!/^[1-9]\d*$/.test(followeeId))
    return res.status(400).json({ error: "Invalid user ID" });

  try {
    await db.query(
      `DELETE FROM follows
       WHERE follower_id = $1 AND followee_id = $2`,
      [req.userId, followeeId]
    );

    res.json({ following: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unfollow user" });
  }
});