-- Reactions are three levels per the project proposal: dislike, like, very_like.

BEGIN;

ALTER TABLE reactions DROP CONSTRAINT reactions_type_check;

-- Map any rows created under the old set of types
UPDATE reactions SET type = 'very_like' WHERE type IN ('love', 'fire');
UPDATE reactions SET type = 'dislike'   WHERE type = 'sad';
UPDATE reactions SET type = 'like'      WHERE type = 'laugh';

ALTER TABLE reactions
  ADD CONSTRAINT reactions_type_check CHECK (type IN ('dislike', 'like', 'very_like'));

COMMIT;
