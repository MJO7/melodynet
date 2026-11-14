-- Sample artists and songs for MelodyNet.
--
-- Safe to run repeatedly: every INSERT is guarded by NOT EXISTS, so a second run
-- adds zero rows. No unique constraints are required (the schema is unchanged).
--
-- Prerequisites: db/migrations/001_init.sql has been applied.
-- Run with:  psql "$DATABASE_URL" -f db/seed/001_artists_songs.sql

BEGIN;

-- Artists: inserted once per name.
INSERT INTO artists (name, bio, image_url)
SELECT v.name, v.bio, v.image_url
  FROM (VALUES
    ('Nova Lane',
     'Synth-pop producer from Rotterdam; writes songs about cities at night.',
     'https://picsum.photos/seed/melodynet-nova/400'),
    ('The Quiet Hours',
     'Four-piece indie folk band known for hushed harmonies and slow tempos.',
     'https://picsum.photos/seed/melodynet-quiet/400'),
    ('Kofi Mensah',
     'Accra-based guitarist blending highlife lines with modern afrobeat grooves.',
     'https://picsum.photos/seed/melodynet-kofi/400'),
    ('Halcyon Choir',
     'Ambient choral collective recording in stairwells and old churches.',
     'https://picsum.photos/seed/melodynet-halcyon/400')
  ) AS v(name, bio, image_url)
 WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.name = v.name);

-- Songs: the artist is resolved by name (lowest id wins if a name ever repeats),
-- so this stays correct across multiple runs and on a freshly seeded database.
INSERT INTO songs (artist_id, title, album, duration_seconds, cover_url)
SELECT a.id, v.title, v.album, v.duration_seconds, v.cover_url
  FROM (VALUES
    ('Nova Lane',      'Midnight Static',   'Neon Rooms',    214, 'https://picsum.photos/seed/melodynet-midnight/400'),
    ('Nova Lane',      'Paper Satellites',  'Neon Rooms',    189, 'https://picsum.photos/seed/melodynet-paper/400'),
    ('Nova Lane',      'Last Train Home',   'Neon Rooms',    243, 'https://picsum.photos/seed/melodynet-train/400'),
    ('The Quiet Hours','Harbor Lights',     'Low Tide',      242, 'https://picsum.photos/seed/melodynet-harbor/400'),
    ('The Quiet Hours','Winter Kitchen',    'Low Tide',      198, 'https://picsum.photos/seed/melodynet-winter/400'),
    ('The Quiet Hours','Slow Parade',       'Low Tide',      225, 'https://picsum.photos/seed/melodynet-parade/400'),
    ('Kofi Mensah',    'Gold Coast Drive',  'Sunrise Market',231, 'https://picsum.photos/seed/melodynet-gold/400'),
    ('Kofi Mensah',    'Market Day',        'Sunrise Market',205, 'https://picsum.photos/seed/melodynet-market/400'),
    ('Halcyon Choir',  'Vespers',           'Glass Cathedral',301,'https://picsum.photos/seed/melodynet-vespers/400'),
    ('Halcyon Choir',  'Aurelia',           'Glass Cathedral',276,'https://picsum.photos/seed/melodynet-aurelia/400')
  ) AS v(artist_name, title, album, duration_seconds, cover_url)
  JOIN LATERAL (
    SELECT id FROM artists WHERE name = v.artist_name ORDER BY id LIMIT 1
  ) a ON true
 WHERE NOT EXISTS (
   SELECT 1 FROM songs s WHERE s.artist_id = a.id AND s.title = v.title
 );

COMMIT;
