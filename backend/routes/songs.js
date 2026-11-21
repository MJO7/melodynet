const express = require('express');
const pool = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { parseId, parsePaging } = require('../lib/util');
const { POST_SELECT } = require('./posts');

const router = express.Router();

// GET /songs/:id -> song + artist + number of posts using it
router.get('/songs/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'song not found' });
  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.album, s.duration_seconds, s.cover_url,
            json_build_object('id', a.id, 'name', a.name, 'image_url', a.image_url) AS artist,
            (SELECT count(*) FROM posts p WHERE p.song_id = s.id)::int AS post_count
       FROM songs s JOIN artists a ON a.id = s.artist_id
      WHERE s.id = $1`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'song not found' });
  res.json({ song: rows[0] });
});

// GET /songs/:id/posts?limit=&before= -> posts that use this song (newest first)
router.get('/songs/:id/posts', optionalAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'song not found' });
  const exists = await pool.query('SELECT 1 FROM songs WHERE id = $1', [id]);
  if (!exists.rows[0]) return res.status(404).json({ error: 'song not found' });

  const { limit, before } = parsePaging(req.query);
  const { rows } = await pool.query(
    `${POST_SELECT}
      WHERE p.song_id = $2 AND ($3::bigint IS NULL OR p.id < $3)
      ORDER BY p.id DESC LIMIT $4`,
    [req.user?.id ?? null, id, before, limit]
  );
  res.json({ posts: rows, next_before: rows.length === limit ? rows[rows.length - 1].id : null });
});

// GET /artists/:id -> artist + their songs
router.get('/artists/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'artist not found' });
  const artist = await pool.query('SELECT id, name, bio, image_url FROM artists WHERE id = $1', [id]);
  if (!artist.rows[0]) return res.status(404).json({ error: 'artist not found' });
  const songs = await pool.query(
    `SELECT s.id, s.title, s.album, s.duration_seconds, s.cover_url,
            (SELECT count(*) FROM posts p WHERE p.song_id = s.id)::int AS post_count
       FROM songs s WHERE s.artist_id = $1 ORDER BY s.title`,
    [id]
  );
  res.json({ artist: artist.rows[0], songs: songs.rows });
});

module.exports = router;
