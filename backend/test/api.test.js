// Integration tests for the MelodyNet API.
//
// Requires a PostgreSQL database whose name ends in `_test` (the suite drops and
// recreates the `public` schema, so it refuses to run against anything else):
//
//   createdb -h localhost -U postgres melodynet_test
//   cd backend
//   TEST_DATABASE_URL=postgres://postgres:password@localhost:5432/melodynet_test node --test test/
//
// If the test runner cannot spawn worker processes (restricted/sandboxed shells),
// run the file in-process instead:
//
//   TEST_DATABASE_URL=... node --test --test-isolation=none test/api.test.js
//
// DATABASE_URL is used as a fallback if TEST_DATABASE_URL is not set. When neither
// is present the suite is skipped instead of failing, so `node --test` stays usable
// on a machine without a database.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { Client } = require('pg');

const BACKEND_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_DIR, '..');
const DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const PORT = 4100 + Math.floor(Math.random() * 800);

function databaseName(connectionString) {
  try {
    return new URL(connectionString).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
}

const dbName = DB_URL ? databaseName(DB_URL) : '';
const canRun = Boolean(DB_URL) && dbName.endsWith('_test');
const skipReason = !DB_URL
  ? 'set TEST_DATABASE_URL to a database whose name ends in _test'
  : `refusing to run against "${dbName}": the database name must end in _test`;

if (!canRun) {
  test('API integration tests', { skip: skipReason }, () => {});
} else {
  let db;
  let server;
  let token;
  let songId;
  let artistId;
  let songTitle;
  let artistName;
  let songPostId;
  let songlessPostId;

  const sql = (file) => fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
  const api = async (method, url, { auth, body } = {}) => {
    const res = await fetch(`http://127.0.0.1:${PORT}${url}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, json };
  };

  before(async () => {
    db = new Client({ connectionString: DB_URL });
    await db.connect();

    // Rebuild the schema from the real migrations so the tests never drift from them.
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await db.query(sql('db/migrations/001_init.sql'));
    await db.query(sql('db/migrations/002_reaction_levels.sql'));
    await db.query(sql('db/seed/001_artists_songs.sql'));

    server = spawn(process.execPath, ['index.js'], {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        DATABASE_URL: DB_URL,
        PORT: String(PORT),
        JWT_SECRET: 'integration-test-secret',
      },
      stdio: 'ignore',
    });

    let up = false;
    for (let i = 0; i < 100 && !up; i++) {
      try {
        up = (await fetch(`http://127.0.0.1:${PORT}/health`)).ok;
      } catch {}
      if (!up) await new Promise((r) => setTimeout(r, 100));
    }
    if (!up) throw new Error(`server did not start on port ${PORT}`);
  });

  after(async () => {
    if (server) server.kill();
    if (db) await db.end();
  });

  test('health check reports a working database connection', async () => {
    const res = await api('GET', '/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.json, { ok: true, db: true });
  });

  test('the seed is idempotent and loads four artists and ten songs', async () => {
    const counts = async () =>
      (await db.query(
        'SELECT (SELECT count(*)::int FROM artists) AS artists, (SELECT count(*)::int FROM songs) AS songs'
      )).rows[0];

    const first = await counts();
    assert.deepEqual(first, { artists: 4, songs: 10 });

    await db.query(sql('db/seed/001_artists_songs.sql'));
    assert.deepEqual(await counts(), first);

    const seeded = (await db.query(
      `SELECT s.id, s.title, a.id AS artist_id, a.name AS artist_name
         FROM songs s JOIN artists a ON a.id = s.artist_id
        ORDER BY s.id LIMIT 1`
    )).rows[0];
    songId = seeded.id;
    artistId = seeded.artist_id;
    songTitle = seeded.title;
    artistName = seeded.artist_name;
  });

  test('a user can sign up and receives a token', async () => {
    const res = await api('POST', '/auth/signup', {
      body: { username: 'seedtester', email: 'seedtester@example.com', password: 'password123' },
    });
    assert.equal(res.status, 201);
    assert.ok(res.json.token);
    token = res.json.token;
  });

  test('posts can be created with and without a song', async () => {
    const withSong = await api('POST', '/posts', {
      auth: token,
      body: { body: 'first song post', song_id: songId },
    });
    assert.equal(withSong.status, 201);
    songPostId = withSong.json.post.id;

    const second = await api('POST', '/posts', {
      auth: token,
      body: { body: 'second song post', song_id: songId },
    });
    assert.equal(second.status, 201);

    const withoutSong = await api('POST', '/posts', { auth: token, body: { body: 'no song here' } });
    assert.equal(withoutSong.status, 201);
    songlessPostId = withoutSong.json.post.id;
  });

  test('post responses keep every pre-existing field', async () => {
    const { json } = await api('GET', `/posts/${songPostId}`);
    for (const field of [
      'id',
      'song_id',
      'body',
      'image_url',
      'audio_url',
      'created_at',
      'author',
      'comment_count',
      'reactions',
      'my_reaction',
    ]) {
      assert.ok(field in json.post, `missing field: ${field}`);
    }
  });

  test('a post with a song embeds the song and its artist as strings', async () => {
    const { json } = await api('GET', `/posts/${songPostId}`);
    const { song, song_id } = json.post;

    assert.equal(typeof song_id, 'string');
    assert.equal(typeof song.id, 'string');
    assert.equal(typeof song.artist.id, 'string');
    assert.equal(song_id, song.id);
    assert.equal(song.artist.id, String(artistId));
    assert.equal(typeof json.post.comment_count, 'number');
    assert.equal(typeof json.post.reactions, 'object');
  });

  test('a post without a song returns song: null', async () => {
    const { json } = await api('GET', `/posts/${songlessPostId}`);
    assert.equal(json.post.song, null);
  });

  test('user feeds embed the same song shape', async () => {
    const { status, json } = await api('GET', '/users/seedtester/posts');
    assert.equal(status, 200);
    const post = json.posts.find((p) => String(p.id) === String(songPostId));
    assert.equal(typeof post.song.id, 'string');
  });

  test('GET /songs/:id returns the song, its artist, and related posts', async () => {
    const { status, json } = await api('GET', `/songs/${songId}`);
    assert.equal(status, 200);
    assert.equal(json.song.id, String(songId));
    assert.equal(typeof json.song.id, 'string');
    assert.equal(json.song.artist.id, String(artistId));
    assert.equal(json.posts.length, 2);
    assert.equal(typeof json.posts[0].song.id, 'string');
  });

  test('GET /songs/:id supports limit and before cursors', async () => {
    const first = await api('GET', `/songs/${songId}?limit=1`);
    assert.equal(first.json.posts.length, 1);
    assert.equal(first.json.next_before, first.json.posts[0].id);

    const second = await api('GET', `/songs/${songId}?limit=1&before=${first.json.next_before}`);
    assert.equal(second.json.posts.length, 1);
    assert.ok(Number(second.json.posts[0].id) < Number(first.json.posts[0].id));
  });

  test('missing and malformed song ids return 404', async () => {
    assert.equal((await api('GET', '/songs/999999')).status, 404);
    assert.equal((await api('GET', '/songs/abc')).status, 404);
  });

  test('GET /artists/:id returns the artist, songs, and post counts', async () => {
    const { status, json } = await api('GET', `/artists/${artistId}`);
    assert.equal(status, 200);
    assert.equal(json.artist.id, String(artistId));
    assert.equal(typeof json.artist.id, 'string');
    assert.equal(json.artist.post_count, 2);
    assert.ok(json.songs.length >= 1);
    assert.ok(json.songs.every((s) => typeof s.id === 'string'));
    assert.equal(json.songs.find((s) => s.id === String(songId)).post_count, 2);
  });

  test('missing and malformed artist ids return 404', async () => {
    assert.equal((await api('GET', '/artists/999999')).status, 404);
    assert.equal((await api('GET', '/artists/abc')).status, 404);
  });

  test('a nonexistent song_id is rejected when creating a post', async () => {
    const res = await api('POST', '/posts', { auth: token, body: { body: 'bad song', song_id: 999999 } });
    assert.equal(res.status, 400);
    assert.equal(res.json.error, 'song not found');
  });

  test('reactions and comments still work on a post with a song', async () => {
    const reacted = await api('PUT', `/posts/${songPostId}/reaction`, { auth: token, body: { type: 'like' } });
    assert.equal(reacted.status, 200);
    assert.equal(reacted.json.my_reaction, 'like');

    const commented = await api('POST', `/posts/${songPostId}/comments`, {
      auth: token,
      body: { body: 'nice track' },
    });
    assert.equal(commented.status, 201);
  });

  test('GET /songs/:id reflects my_reaction and comment_count for a signed-in viewer', async () => {
    const { json } = await api('GET', `/songs/${songId}`, { auth: token });
    const post = json.posts.find((p) => String(p.id) === String(songPostId));
    assert.equal(post.my_reaction, 'like');
    assert.equal(post.comment_count, 1);
  });

  test('search rejects a missing, blank, or overlong query', async () => {
    assert.equal((await api('GET', '/search')).status, 400);
    assert.equal((await api('GET', '/search?q=%20%20')).status, 400);
    assert.equal((await api('GET', `/search?q=${'a'.repeat(101)}`)).status, 400);
  });

  test('search finds posts by text', async () => {
    const { status, json } = await api('GET', '/search?q=song%20post');
    assert.equal(status, 200);
    assert.equal(json.query, 'song post');
    assert.ok(json.posts.some((p) => String(p.id) === String(songPostId)));
    assert.equal(typeof json.posts[0].song.id, 'string');
  });

  test('search finds users by username', async () => {
    const { json } = await api('GET', '/search?q=seedtester');
    assert.equal(json.users.length, 1);
    assert.equal(json.users[0].username, 'seedtester');
  });

  test('search finds songs by title', async () => {
    const { json } = await api('GET', `/search?q=${encodeURIComponent(songTitle)}`);
    assert.ok(json.songs.some((s) => s.id === String(songId)));
    assert.equal(typeof json.songs[0].id, 'string');
  });

  test('search finds artists by name', async () => {
    const { status, json } = await api('GET', `/search?q=${encodeURIComponent(artistName)}`);
    assert.equal(status, 200);
    assert.ok(json.artists.some((a) => a.id === String(artistId)));
    assert.equal(typeof json.artists[0].id, 'string');
  });

  test('search returns empty groups when nothing matches', async () => {
    const { status, json } = await api('GET', '/search?q=zzzznomatch');
    assert.equal(status, 200);
    assert.deepEqual(
      [json.posts.length, json.users.length, json.songs.length, json.artists.length],
      [0, 0, 0, 0]
    );
  });

  test('search respects limit and includes my_reaction when signed in', async () => {
    const anon = await api('GET', '/search?q=post&limit=1');
    assert.equal(anon.json.posts.length, 1);

    const authed = await api('GET', '/search?q=first%20song%20post', { auth: token });
    const post = authed.json.posts.find((p) => String(p.id) === String(songPostId));
    assert.equal(post.my_reaction, 'like');
  });

  test('unknown routes still return 404', async () => {
    const res = await api('GET', '/nope');
    assert.equal(res.status, 404);
    assert.equal(res.json.error, 'not found');
  });
}
