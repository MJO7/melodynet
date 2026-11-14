-- MelodyNet initial schema (Week 5)

BEGIN;

-- Authors / profiles
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  bio           TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Follows: follower_id follows followee_id
CREATE TABLE follows (
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX follows_followee_idx ON follows (followee_id);

-- Artist and song pages
CREATE TABLE artists (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  bio        TEXT,
  image_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE songs (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  artist_id        BIGINT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  album            TEXT,
  duration_seconds INTEGER CHECK (duration_seconds > 0),
  cover_url        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX songs_artist_idx ON songs (artist_id);

-- Posts: text, image, and/or audio clip, optionally tied to a song
CREATE TABLE posts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id    BIGINT REFERENCES songs(id) ON DELETE SET NULL,
  body       TEXT,
  image_url  TEXT,
  audio_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (body IS NOT NULL OR image_url IS NOT NULL OR audio_url IS NOT NULL)
);
CREATE INDEX posts_author_created_idx ON posts (author_id, created_at DESC);
CREATE INDEX posts_created_idx ON posts (created_at DESC);
CREATE INDEX posts_song_idx ON posts (song_id);

-- Comments on posts
CREATE TABLE comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_created_idx ON comments (post_id, created_at);

-- Reactions: one reaction per user per post
CREATE TABLE reactions (
  post_id    BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('like', 'love', 'fire', 'sad', 'laugh')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

COMMIT;
