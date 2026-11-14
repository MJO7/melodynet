const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PUBLIC_COLS = 'id, username, email, display_name, bio, avatar_url, created_at';

// POST /auth/signup { username, email, password, display_name? }
router.post('/auth/signup', async (req, res) => {
  const { password, display_name } = req.body || {};
  const username = String(req.body?.username || '').trim().toLowerCase();
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'username must be 3-20 chars: a-z, 0-9, underscore' });
  }
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid email' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'password must be 8-72 characters' });
  }
  if (display_name != null && (typeof display_name !== 'string' || display_name.length > 50)) {
    return res.status(400).json({ error: 'display_name must be a string up to 50 chars' });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_COLS}`,
      [username, email, hash, display_name || username]
    );
    res.status(201).json({ user: rows[0], token: signToken(rows[0].id) });
  } catch (err) {
    if (err.code === '23505') {          // unique_violation
      const field = err.constraint?.includes('email') ? 'email' : 'username';
      return res.status(409).json({ error: `${field} already taken` });
    }
    throw err;
  }
});

// POST /auth/login { identifier (username or email), password }
router.post('/auth/login', async (req, res) => {
  const identifier = String(req.body?.identifier || '').trim().toLowerCase();
  const { password } = req.body || {};
  if (!identifier || typeof password !== 'string') {
    return res.status(400).json({ error: 'identifier and password required' });
  }

  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLS}, password_hash FROM users WHERE username = $1 OR email = $1`,
    [identifier]
  );
  const row = rows[0];
  const ok = row && (await bcrypt.compare(password, row.password_hash));
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  delete row.password_hash;
  res.json({ user: row, token: signToken(row.id) });
});

// GET /me
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [req.user.id]);
  if (!rows[0]) return res.status(401).json({ error: 'account no longer exists' });
  res.json({ user: rows[0] });
});

// PATCH /me { display_name?, bio?, avatar_url? }
router.patch('/me', requireAuth, async (req, res) => {
  const fields = ['display_name', 'bio', 'avatar_url'].filter((f) => f in (req.body || {}));
  if (fields.length === 0) return res.status(400).json({ error: 'nothing to update' });

  const limits = { display_name: 50, bio: 500, avatar_url: 500 };
  for (const f of fields) {
    const v = req.body[f];
    if (v !== null && (typeof v !== 'string' || v.length > limits[f])) {
      return res.status(400).json({ error: `${f} must be a string up to ${limits[f]} chars or null` });
    }
  }

  const sets = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE users SET ${sets} WHERE id = $1 RETURNING ${PUBLIC_COLS}`,
    [req.user.id, ...fields.map((f) => req.body[f])]
  );
  res.json({ user: rows[0] });
});

module.exports = router;
