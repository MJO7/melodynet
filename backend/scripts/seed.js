// Seeds sample users, artists, songs, posts, comments, reactions and follows.
//   node scripts/seed.js        (run from backend/, uses DATABASE_URL from .env)
//
// Safe to re-run: it only removes and recreates its own data (usernames starting
// with "seed_" and the artists listed below); everything else is left alone.
// All seed users share the password "password123" (local development only).
// Randomness is seeded, so every run produces the same data.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../db');

let state = 42;
function rand() {                       // small deterministic PRNG (mulberry32)
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const USERS = [
  ['seed_ava', 'Ava Chen', 'Indie and dream pop all day.'],
  ['seed_marcus', 'Marcus Webb', 'Vinyl collector. Jazz first.'],
  ['seed_priya', 'Priya Nair', 'Concert regular. Hip hop and R&B.'],
  ['seed_leo', 'Leo Martins', 'Bedroom producer.'],
  ['seed_sofia', 'Sofia Reyes', 'Latin pop and everything danceable.'],
  ['seed_noah', 'Noah Kim', 'Heavy rotation: synthwave.'],
  ['seed_zara', 'Zara Ali', 'Folk, acoustic, rainy-day playlists.'],
  ['seed_eli', 'Eli Brooks', 'Rock lifer.'],
];

const CATALOG = [
  ['Weightless Band', 'Dreamy indie from the coast.', ['Weightless', 'Float On Static', 'Paper Moons']],
  ['Midnight Club', 'Late-night synthwave.', ['Midnight Drive', 'Neon Rain', 'After Hours']],
  ['Pink & White', 'Bright, bubbly pop.', ['Cotton Candy Sky', 'Sugar Rush']],
  ['The Stage Left', 'Loud guitars, louder crowds.', ['Front Row', 'Encore', 'Soundcheck']],
  ['Juniper Hollow', 'Quiet folk storytelling.', ['Pine and Ember', 'Slow River']],
  ['Kilo Sunrise', 'Hip hop with a jazz pulse.', ['Golden Hour', 'Blue Note Mornings']],
];

const BODIES = [
  'This one has been on repeat all week.',
  'Cannot stop listening to this.',
  'Perfect study soundtrack.',
  'Played this on the drive home and it hit different.',
  'Underrated. Everyone needs to hear this.',
  'The bridge in this song is unreal.',
  'Throwback that still holds up.',
  'Saw this live and it was even better in person.',
  'Which song got you through finals?',
  'New favorite discovered today.',
  'Pure vibes, no skips.',
  'Sharing this with anyone who needs a good mood.',
];
const COMMENTS = ['Love this!', 'Great pick.', 'Adding to my playlist.', 'Not for me, honestly.', 'Same here!', 'Classic.', 'Had this on repeat too.', 'Where do I start with this artist?'];
const REACTION_TYPES = ['dislike', 'like', 'like', 'like', 'very_like', 'very_like'];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query("DELETE FROM users WHERE username LIKE 'seed\\_%'");
    await client.query('DELETE FROM artists WHERE name = ANY($1)', [CATALOG.map((c) => c[0])]);

    const hash = await bcrypt.hash('password123', 10);
    const userIds = [];
    for (const [username, display, bio] of USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (username, email, password_hash, display_name, bio)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [username, `${username}@example.com`, hash, display, bio]
      );
      userIds.push(rows[0].id);
    }

    const songIds = [];
    for (const [name, bio, titles] of CATALOG) {
      const a = await client.query('INSERT INTO artists (name, bio) VALUES ($1, $2) RETURNING id', [name, bio]);
      for (const title of titles) {
        const s = await client.query(
          'INSERT INTO songs (artist_id, title, duration_seconds) VALUES ($1, $2, $3) RETURNING id',
          [a.rows[0].id, title, 150 + Math.floor(rand() * 120)]
        );
        songIds.push(s.rows[0].id);
      }
    }

    // Each user follows 2-4 others.
    for (const u of userIds) {
      const others = userIds.filter((x) => x !== u).sort(() => rand() - 0.5).slice(0, 2 + Math.floor(rand() * 3));
      for (const o of others) {
        await client.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)', [u, o]);
      }
    }

    // 40 posts spread over the last 10 days. A few are "hits" with lots of reactions.
    // Inserted oldest-first so post ids increase with created_at, like real data
    // (the "newest" feed pages by id).
    const postIds = [];
    const ages = Array.from({ length: 40 }, () => Math.floor(rand() * 240)).sort((a, b) => b - a);
    for (const hoursAgo of ages) {
      const withSong = rand() < 0.8;
      const p = await client.query(
        `INSERT INTO posts (author_id, song_id, body, created_at)
         VALUES ($1, $2, $3, now() - make_interval(hours => $4)) RETURNING id`,
        [pick(userIds), withSong ? pick(songIds) : null, pick(BODIES), hoursAgo]
      );
      postIds.push([p.rows[0].id, rand() < 0.15]);
    }

    for (const [postId, isHit] of postIds) {
      const reactors = userIds.filter(() => rand() < (isHit ? 0.9 : 0.3));
      for (const u of reactors) {
        const type = isHit && rand() < 0.7 ? 'very_like' : pick(REACTION_TYPES);
        await client.query('INSERT INTO reactions (post_id, user_id, type) VALUES ($1, $2, $3)', [postId, u, type]);
      }
      const commentCount = isHit ? 2 + Math.floor(rand() * 3) : Math.floor(rand() * 2);
      for (let c = 0; c < commentCount; c++) {
        await client.query('INSERT INTO comments (post_id, author_id, body) VALUES ($1, $2, $3)', [postId, pick(userIds), pick(COMMENTS)]);
      }
    }

    await client.query('COMMIT');
    console.log(`seeded ${userIds.length} users, ${songIds.length} songs, ${postIds.length} posts`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('seed failed:', err.message);
  process.exit(1);
});
