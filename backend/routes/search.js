const express = require('express');
const pool = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { POST_SELECT } = require('./posts');
const { parseId } = require('../lib/util');

const router = express.Router();

const MAX_LIMIT = 25;
const TYPES = ['posts', 'users', 'songs', 'artists'];

// Escapes LIKE wildcards so a user searching for "100%" does not match everything.
function likePattern(raw) {
  return `%${raw.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// One page of a single result type. Fetches limit + 1 rows so the caller can tell
// whether another page exists without a second COUNT query.
//
// The cursor is always the id of the last row the client received. Each query sorts
// by a stable key and resumes strictly after that row:
//   posts   id DESC            (newest first)
//   users   username ASC       (unique, so the id resolves to that username)
//   songs   (title, id) ASC    (titles repeat, id breaks ties)
//   artists (name, id) ASC     (names may repeat, id breaks ties)
async function fetchPage(type, pattern, limit, cursor, viewerId) {
  const fetchLimit = limit + 1;

  if (type === 'posts') {
    const { rows } = await pool.query(
      `${POST_SELECT}
        WHERE p.body ILIKE $2 AND ($3::bigint IS NULL OR p.id < $3)
        ORDER BY p.id DESC LIMIT $4`,
      [viewerId, pattern, cursor, fetchLimit]
    );
    return rows;
  }

  if (type === 'users') {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url
         FROM users u
        WHERE (u.username ILIKE $1 OR u.display_name ILIKE $1)
          AND ($2::bigint IS NULL OR u.username > (SELECT username FROM users WHERE id = $2))
        ORDER BY u.username LIMIT $3`,
      [pattern, cursor, fetchLimit]
    );
    return rows;
  }

  if (type === 'songs') {
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.album, s.duration_seconds, s.cover_url,
              json_build_object('id', a.id::text, 'name', a.name) AS artist
         FROM songs s JOIN artists a ON a.id = s.artist_id
        WHERE s.title ILIKE $1
          AND ($2::bigint IS NULL OR (s.title, s.id) > (SELECT title, id FROM songs WHERE id = $2))
        ORDER BY s.title, s.id LIMIT $3`,
      [pattern, cursor, fetchLimit]
    );
    return rows;
  }

  const { rows } = await pool.query(
    `SELECT a.id, a.name, a.bio, a.image_url
       FROM artists a
      WHERE a.name ILIKE $1
        AND ($2::bigint IS NULL OR (a.name, a.id) > (SELECT name, id FROM artists WHERE id = $2))
      ORDER BY a.name, a.id LIMIT $3`,
    [pattern, cursor, fetchLimit]
  );
  return rows;
}

async function cursorExists(type, cursor) {
  const { rows } = await pool.query(`SELECT 1 FROM ${type} WHERE id = $1`, [cursor]);
  return Boolean(rows[0]);
}

function page(rows, limit) {
  return {
    items: rows.slice(0, limit),
    next_cursor: rows.length > limit ? String(rows[limit - 1].id) : null,
  };
}

// GET /search?q=&limit=                       -> grouped results
// GET /search?q=&type=posts&limit=&cursor=ID  -> one page of a single group
router.get('/search', optionalAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q || q.length > 100) {
    return res.status(400).json({ error: 'q must be 1-100 characters' });
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), MAX_LIMIT);
  const pattern = likePattern(q);
  const viewerId = req.user?.id ?? null;
  const { type } = req.query;

  if (type === undefined) {
    const [posts, users, songs, artists] = await Promise.all(
      TYPES.map((t) => fetchPage(t, pattern, limit, null, viewerId))
    );
    const groups = { posts, users, songs, artists };
    const body = { query: q };

    for (const t of TYPES) {
      const { items, next_cursor } = page(groups[t], limit);
      body[t] = items;
      (body.next_cursor ??= {})[t] = next_cursor;
    }

    return res.json(body);
  }

  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });
  }

  let cursor = null;
  if (req.query.cursor != null) {
    cursor = parseId(req.query.cursor);
    if (!cursor || !(await cursorExists(type, cursor))) {
      return res.status(400).json({ error: 'invalid cursor' });
    }
  }

  const { items, next_cursor } = page(await fetchPage(type, pattern, limit, cursor, viewerId), limit);
  res.json({ query: q, type, items, next_cursor });
});

module.exports = router;
