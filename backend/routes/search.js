const express = require('express');
const pool = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { POST_SELECT } = require('./posts');

const router = express.Router();

const MAX_LIMIT = 25;

// Escapes LIKE wildcards so a user searching for "100%" does not match everything.
function likePattern(raw) {
  return `%${raw.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// GET /search?q=&limit= -> matching posts, users, and songs (grouped by type)
router.get('/search', optionalAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q || q.length > 100) {
    return res.status(400).json({ error: 'q must be 1-100 characters' });
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), MAX_LIMIT);
  const pattern = likePattern(q);

  const [posts, users, songs] = await Promise.all([
    pool.query(
      `${POST_SELECT}
        WHERE p.body ILIKE $2
        ORDER BY p.id DESC LIMIT $3`,
      [req.user?.id ?? null, pattern, limit]
    ),
    pool.query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url
         FROM users u
        WHERE u.username ILIKE $1 OR u.display_name ILIKE $1
        ORDER BY u.username LIMIT $2`,
      [pattern, limit]
    ),
    pool.query(
      `SELECT s.id, s.title, s.album, s.duration_seconds, s.cover_url,
              json_build_object('id', a.id::text, 'name', a.name) AS artist
         FROM songs s JOIN artists a ON a.id = s.artist_id
        WHERE s.title ILIKE $1
        ORDER BY s.title LIMIT $2`,
      [pattern, limit]
    ),
  ]);

  res.json({ query: q, posts: posts.rows, users: users.rows, songs: songs.rows });
});

module.exports = router;
