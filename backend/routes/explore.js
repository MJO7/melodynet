const express = require('express');
const pool = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { parsePaging } = require('../lib/util');
const { POST_SELECT } = require('./posts');

const router = express.Router();

// Engagement score per post: very_like = 3, like = 1, dislike = -1, each comment = 2.
const TRENDING_CTE = `
  WITH scored AS (
    SELECT p.id,
           COALESCE((SELECT sum(CASE type WHEN 'very_like' THEN 3 WHEN 'like' THEN 1 ELSE -1 END)
                       FROM reactions WHERE post_id = p.id), 0)
           + 2 * (SELECT count(*) FROM comments WHERE post_id = p.id) AS score,
           extract(epoch FROM now() - p.created_at) / 3600 AS age_hours
      FROM posts p
     WHERE p.created_at > now() - interval '14 days'
  )`;

const SORTS = ['newest', 'trending', 'following'];

// GET /explore?sort=newest|trending|following&limit=&before=&offset=
//   newest    - all posts, newest first; page with `before` (post-id cursor)
//   trending  - engagement score decayed by age; page with `offset`
//   following - newest posts from people you follow (requires sign-in)
// Responses: { posts, next_before } for newest/following, { posts, next_offset } for trending.
router.get('/explore', optionalAuth, async (req, res, next) => {
  const sort = req.query.sort == null ? 'newest' : req.query.sort;
  if (!SORTS.includes(sort)) return res.status(400).json({ error: `sort must be one of ${SORTS.join(', ')}` });
  if (sort === 'following') return requireAuth(req, res, (err) => (err ? next(err) : following(req, res)));

  const { limit, before } = parsePaging(req.query);
  const viewer = req.user?.id ?? null;

  if (sort === 'newest') {
    const { rows } = await pool.query(
      `${POST_SELECT}
        WHERE ($2::bigint IS NULL OR p.id < $2)
        ORDER BY p.id DESC LIMIT $3`,
      [viewer, before, limit]
    );
    return res.json({ posts: rows, next_before: rows.length === limit ? rows[rows.length - 1].id : null });
  }

  // trending
  const offset = Math.min(Math.max(parseInt(req.query.offset, 10) || 0, 0), 1000);
  const { rows } = await pool.query(
    `${TRENDING_CTE}
     ${POST_SELECT}
       JOIN scored sc ON sc.id = p.id
      WHERE sc.score > 0
      ORDER BY sc.score / power(sc.age_hours + 2, 1.5) DESC, p.id DESC
      LIMIT $2 OFFSET $3`,
    [viewer, limit, offset]
  );
  res.json({ posts: rows, next_offset: rows.length === limit ? offset + limit : null });
});

async function following(req, res) {
  const { limit, before } = parsePaging(req.query);
  const { rows } = await pool.query(
    `${POST_SELECT}
      WHERE p.author_id IN (SELECT followee_id FROM follows WHERE follower_id = $1)
        AND ($2::bigint IS NULL OR p.id < $2)
      ORDER BY p.id DESC LIMIT $3`,
    [req.user.id, before, limit]
  );
  res.json({ posts: rows, next_before: rows.length === limit ? rows[rows.length - 1].id : null });
}

module.exports = router;
