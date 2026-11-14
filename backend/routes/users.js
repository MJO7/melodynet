const express = require('express');
const pool = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

async function findUserId(username) {
  const { rows } = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
  return rows[0]?.id ?? null;
}

// GET /users/:username -> public profile + counts (+ is_following when signed in)
router.get('/users/:username', optionalAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at,
            (SELECT count(*) FROM follows WHERE followee_id = u.id)::int AS follower_count,
            (SELECT count(*) FROM follows WHERE follower_id = u.id)::int AS following_count,
            (SELECT count(*) FROM posts   WHERE author_id   = u.id)::int AS post_count,
            EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND followee_id = u.id) AS is_following
       FROM users u WHERE u.username = $1`,
    [req.params.username.toLowerCase(), req.user?.id ?? null]
  );
  if (!rows[0]) return res.status(404).json({ error: 'user not found' });
  res.json({ user: rows[0] });
});

// POST /users/:username/follow (idempotent)
router.post('/users/:username/follow', requireAuth, async (req, res) => {
  const targetId = await findUserId(req.params.username);
  if (!targetId) return res.status(404).json({ error: 'user not found' });
  if (String(targetId) === String(req.user.id)) {
    return res.status(400).json({ error: 'cannot follow yourself' });
  }
  await pool.query(
    'INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.id, targetId]
  );
  res.json({ following: true });
});

// DELETE /users/:username/follow (idempotent)
router.delete('/users/:username/follow', requireAuth, async (req, res) => {
  const targetId = await findUserId(req.params.username);
  if (!targetId) return res.status(404).json({ error: 'user not found' });
  await pool.query('DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2', [req.user.id, targetId]);
  res.json({ following: false });
});

// GET /users/:username/followers and /following
function listRoute(path, selfCol, otherCol) {
  router.get(path, async (req, res) => {
    const id = await findUserId(req.params.username);
    if (!id) return res.status(404).json({ error: 'user not found' });
    const { rows } = await pool.query(
      `SELECT u.username, u.display_name, u.avatar_url
         FROM follows f JOIN users u ON u.id = f.${otherCol}
        WHERE f.${selfCol} = $1
        ORDER BY f.created_at DESC LIMIT 100`,
      [id]
    );
    res.json({ users: rows });
  });
}
listRoute('/users/:username/followers', 'followee_id', 'follower_id');
listRoute('/users/:username/following', 'follower_id', 'followee_id');

module.exports = router;
