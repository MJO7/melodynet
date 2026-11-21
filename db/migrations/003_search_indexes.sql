-- Trigram indexes so ILIKE '%term%' search stays fast on larger datasets.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX users_username_trgm_idx     ON users   USING gin (username gin_trgm_ops);
CREATE INDEX users_display_name_trgm_idx ON users   USING gin (display_name gin_trgm_ops);
CREATE INDEX songs_title_trgm_idx        ON songs   USING gin (title gin_trgm_ops);
CREATE INDEX artists_name_trgm_idx       ON artists USING gin (name gin_trgm_ops);
CREATE INDEX posts_body_trgm_idx         ON posts   USING gin (body gin_trgm_ops);

COMMIT;
