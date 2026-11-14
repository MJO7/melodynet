const express = require('express');
const pool = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { parseId, parsePaging } = require('../lib/util');
const { POST_SELECT } = require('./posts');

const router = express.Router();

// Song + its artist, in the same shape posts embed for `song`.
const SONG_SELECT = `
  SELECT s.id, s.title, s.album, s.duration_seconds, s.cover_url, s.created_at,
         json_build_object('id', a.id::text, 'name', a.name, 'bio', a.bio,
                           'image_url', a.image_url) AS artist
    FROM songs s JOIN artists a ON a.id = s.artist_id`;

// GET /songs/:id?limit=&before= -> song, its artist, and recent posts that use it
router.get('/songs/:id', optionalAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'song not found' });

  const { rows } = await pool.query(`${SONG_SELECT} WHERE s.id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({ error: 'song not found' });

  const { limit, before } = parsePaging(req.query);
  const posts = await pool.query(
    `${POST_SELECT}
      WHERE p.song_id = $2 AND ($3::bigint IS NULL OR p.id < $3)
      ORDER BY p.id DESC LIMIT $4`,
    [req.user?.id ?? null, id, before, limit]
  );

  res.json({
    song: rows[0],
    posts: posts.rows,
    next_before: posts.rows.length === limit ? posts.rows[posts.rows.length - 1].id : null,
  });
});

// GET /artists/:id -> artist, the artist's songs, and how many posts use them
router.get('/artists/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'artist not found' });

  const { rows } = await pool.query(
    `SELECT a.id, a.name, a.bio, a.image_url, a.created_at,
            (SELECT count(*) FROM posts p JOIN songs s ON s.id = p.song_id
              WHERE s.artist_id = a.id)::int AS post_count
       FROM artists a WHERE a.id = $1`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'artist not found' });

  const songs = await pool.query(
    `SELECT s.id, s.title, s.album, s.duration_seconds, s.cover_url,
            (SELECT count(*) FROM posts p WHERE p.song_id = s.id)::int AS post_count
       FROM songs s WHERE s.artist_id = $1 ORDER BY s.id`,
    [id]
  );

  res.json({ artist: rows[0], songs: songs.rows });
});

module.exports = router;
