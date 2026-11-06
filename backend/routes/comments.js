const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { parseId, parsePaging } = require('../lib/util');

const router = express.Router();

const COMMENT_SELECT = `
  SELECT c.id, c.post_id, c.body, c.created_at,
         json_build_object('username', u.username, 'display_name', u.display_name,
                           'avatar_url', u.avatar_url) AS author
    FROM comments c JOIN users u ON u.id = c.author_id`;

// POST /posts/:id/comments { body }
router.post('/posts/:id/comments', requireAuth, async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(404).json({ error: 'post not found' });
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.length > 1000) {
    return res.status(400).json({ error: 'body is required, up to 1000 chars' });
  }

  let id;
  try {
    const ins = await pool.query(
      'INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3) RETURNING id',
      [postId, req.user.id, body]
    );
    id = ins.rows[0].id;
  } catch (err) {
    if (err.code === '23503') return res.status(404).json({ error: 'post not found' });
    throw err;
  }
  const { rows } = await pool.query(`${COMMENT_SELECT} WHERE c.id = $1`, [id]);
  res.status(201).json({ comment: rows[0] });
});

// GET /posts/:id/comments?limit=&after=  (oldest first; `after` is a comment-id cursor)
router.get('/posts/:id/comments', async (req, res) => {
  const postId = parseId(req.params.id);
  if (!postId) return res.status(404).json({ error: 'post not found' });
  const { limit, after } = parsePaging(req.query);

  const post = await pool.query('SELECT 1 FROM posts WHERE id = $1', [postId]);
  if (!post.rows[0]) return res.status(404).json({ error: 'post not found' });

  const { rows } = await pool.query(
    `${COMMENT_SELECT}
      WHERE c.post_id = $1 AND ($2::bigint IS NULL OR c.id > $2)
      ORDER BY c.id ASC LIMIT $3`,
    [postId, after, limit]
  );
  res.json({ comments: rows, next_after: rows.length === limit ? rows[rows.length - 1].id : null });
});

// DELETE /comments/:id (comment author only)
router.delete('/comments/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'comment not found' });
  const found = await pool.query('SELECT author_id FROM comments WHERE id = $1', [id]);
  if (!found.rows[0]) return res.status(404).json({ error: 'comment not found' });
  if (String(found.rows[0].author_id) !== String(req.user.id)) {
    return res.status(403).json({ error: 'not your comment' });
  }
  await pool.query('DELETE FROM comments WHERE id = $1', [id]);
  res.status(204).end();
});

module.exports = router;
