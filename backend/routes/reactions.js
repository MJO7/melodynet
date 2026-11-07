const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { parseId } = require('../lib/util');

const router = express.Router();

const TYPES = ['dislike', 'like', 'very_like'];   // must match reactions_type_check

async function summary(postId, userId) {
  const { rows } = await pool.query(
    `SELECT type, count(*)::int AS n FROM reactions WHERE post_id = $1 GROUP BY type`,
    [postId]
  );
  const reactions = Object.fromEntries(rows.map((r) => [r.type, r.n]));
  const mine = await pool.query('SELECT type FROM reactions WHERE post_id = $1 AND user_id = $2', [postId, userId]);
  return { reactions, my_reaction: mine.rows[0]?.type ?? null };
}

// PUT /posts/:id/reaction { type: 'dislike' | 'like' | 'very_like' }  (sets or changes your reaction)
router.put('/posts/:id/reaction', requireAuth, async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(404).json({ error: 'post not found' });
  const type = req.body?.type;
  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });
  }
  try {
    await pool.query(
      `INSERT INTO reactions (post_id, user_id, type) VALUES ($1, $2, $3)
       ON CONFLICT (post_id, user_id) DO UPDATE SET type = EXCLUDED.type, created_at = now()`,
      [postId, req.user.id, type]
    );
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'post not found' });
    throw err;
  }
  res.json(await summary(postId, req.user.id));
});

// DELETE /posts/:id/reaction (removes your reaction; idempotent)
router.delete('/posts/:id/reaction', requireAuth, async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(404).json({ error: 'post not found' });
  const post = await pool.query('SELECT 1 FROM posts WHERE id = $1', [postId]);
  if (!post.rows[0]) return res.status(404).json({ error: 'post not found' });
  await pool.query('DELETE FROM reactions WHERE post_id = $1 AND user_id = $2', [postId, req.user.id]);
  res.json(await summary(postId, req.user.id));
});

module.exports = router;
