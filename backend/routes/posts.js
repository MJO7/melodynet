const express = require('express');
const pool = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { parseId, parsePaging } = require('../lib/util');

const router = express.Router();

// Shared SELECT for the post shape returned everywhere. $1 = viewer id (or null).
const POST_SELECT = `
  SELECT p.id, p.song_id, p.body, p.image_url, p.audio_url, p.created_at,
         json_build_object('username', u.username, 'display_name', u.display_name,
                           'avatar_url', u.avatar_url) AS author,
         (SELECT count(*) FROM comments c WHERE c.post_id = p.id)::int AS comment_count,
         COALESCE((SELECT json_object_agg(type, n)
                     FROM (SELECT type, count(*)::int AS n FROM reactions
                            WHERE post_id = p.id GROUP BY type) r), '{}'::json) AS reactions,
         (SELECT type FROM reactions WHERE post_id = p.id AND user_id = $1) AS my_reaction
    FROM posts p JOIN users u ON u.id = p.author_id`;

// Trims a string and enforces a max length. null/'' -> null, wrong type/too long -> undefined (invalid).
function cleanString(v, max) {
  if (v == null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (s.length > max) return undefined;
  return s === '' ? null : s;
}

// POST /posts { body?, image_url?, audio_url?, song_id? }  (needs at least one of body/image/audio)
router.post('/posts', requireAuth, async (req, res) => {
  const b = req.body || {};
  const body = cleanString(b.body, 2000);
  const imageUrl = cleanString(b.image_url, 500);
  const audioUrl = cleanString(b.audio_url, 500);
  if (body === undefined) return res.status(400).json({ error: 'body must be a string up to 2000 chars' });
  if (imageUrl === undefined || audioUrl === undefined) {
    return res.status(400).json({ error: 'image_url and audio_url must be strings up to 500 chars' });
  }
  if (!body && !imageUrl && !audioUrl) {
    return res.status(400).json({ error: 'post needs body, image_url, or audio_url' });
  }
  let songId = null;
  if (b.song_id != null) {
    songId = parseId(b.song_id);
    if (!songId) return res.status(400).json({ error: 'invalid song_id' });
  }

  let id;
  try {
    const ins = await pool.query(
      `INSERT INTO posts (author_id, song_id, body, image_url, audio_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, songId, body, imageUrl, audioUrl]
    );
    id = ins.rows[0].id;
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'song not found' });
    throw err;
  }
  const { rows } = await pool.query(`${POST_SELECT} WHERE p.id = $2`, [req.user.id, id]);
  res.status(201).json({ post: rows[0] });
});

// GET /posts/:id
router.get('/posts/:id', optionalAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'post not found' });
  const { rows } = await pool.query(`${POST_SELECT} WHERE p.id = $2`, [req.user?.id ?? null, id]);
  if (!rows[0]) return res.status(404).json({ error: 'post not found' });
  res.json({ post: rows[0] });
});

// DELETE /posts/:id (author only)
router.delete('/posts/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'post not found' });
  const found = await pool.query('SELECT author_id FROM posts WHERE id = $1', [id]);
  if (!found.rows[0]) return res.status(404).json({ error: 'post not found' });
  if (String(found.rows[0].author_id) !== String(req.user.id)) {
    return res.status(403).json({ error: 'not your post' });
  }
  await pool.query('DELETE FROM posts WHERE id = $1', [id]);
  res.status(204).end();
});

// GET /users/:username/posts?limit=&before=  (newest first; `before` is a post-id cursor)
router.get('/users/:username/posts', optionalAuth, async (req, res) => {
  const { limit, before } = parsePaging(req.query);
  const user = await pool.query('SELECT id FROM users WHERE username = $1', [req.params.username.toLowerCase()]);
  if (!user.rows[0]) return res.status(404).json({ error: 'user not found' });

  const { rows } = await pool.query(
    `${POST_SELECT}
      WHERE p.author_id = $2 AND ($3::bigint IS NULL OR p.id < $3)
      ORDER BY p.id DESC LIMIT $4`,
    [req.user?.id ?? null, user.rows[0].id, before, limit]
  );
  res.json({ posts: rows, next_before: rows.length === limit ? rows[rows.length - 1].id : null });
});

module.exports = router;
