const express = require('express');
const pool = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { POST_SELECT } = require('./posts');

const router = express.Router();

// Escapes LIKE wildcards so user input is matched literally.
function escapeLike(s) {
  return s.replace(/[\\%_]/g, '\\$&');
}

const TYPES = ['all', 'users', 'songs', 'posts'];

// GET /search?q=&type=all|users|songs|posts&limit=
// Matches usernames/display names, song titles (+ artist names), and post text.
// Prefix matches rank above substring matches; case-insensitive.
router.get('/search', optionalAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const type = req.query.type == null ? 'all' : req.query.type;
  if (!q) return res.status(400).json({ error: 'q is required' });
  if (q.length > 100) return res.status(400).json({ error: 'q must be at most 100 chars' });
  if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of ${TYPES.join(', ')}` });

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 25);
  const contains = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;
  const want = (t) => type === 'all' || type === t;
  const out = {};

  const jobs = [];

  if (want('users')) {
    jobs.push(
      pool
        .query(
          `SELECT username, display_name, avatar_url
             FROM users
            WHERE username ILIKE $1 OR display_name ILIKE $1
            ORDER BY (username ILIKE $2 OR display_name ILIKE $2) DESC, username
            LIMIT $3`,
          [contains, prefix, limit]
        )
        .then((r) => { out.users = r.rows; })
    );
  }

  if (want('songs')) {
    jobs.push(
      pool
        .query(
          `SELECT s.id, s.title, s.album, s.cover_url,
                  json_build_object('id', a.id, 'name', a.name) AS artist
             FROM songs s JOIN artists a ON a.id = s.artist_id
            WHERE s.title ILIKE $1 OR a.name ILIKE $1 OR s.album ILIKE $1
            ORDER BY (s.title ILIKE $2 OR a.name ILIKE $2) DESC, s.title
            LIMIT $3`,
          [contains, prefix, limit]
        )
        .then((r) => { out.songs = r.rows; })
    );
  }

  if (want('posts')) {
    jobs.push(
      pool
        .query(
          `${POST_SELECT}
            WHERE p.body ILIKE $2
            ORDER BY p.id DESC
            LIMIT $3`,
          [req.user?.id ?? null, contains, limit]
        )
        .then((r) => { out.posts = r.rows; })
    );
  }

  await Promise.all(jobs);
  res.json({ q, ...out });
});

module.exports = router;
