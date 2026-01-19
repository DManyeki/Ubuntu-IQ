ALTER TABLE institutions RENAME TO universities;
COMMENT ON TABLE universities IS 'public and private Universities offering degree programs via KUCCPS';

ALTER TABLE universities ADD COLUMN IF NOT EXISTS ownership text CHECK (ownership IN ('Public', 'Private'));
ALTER TABLE universities ADD COLUMN IF NOT EXISTS aliases text[];
ALTER TABLE universities ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS town text;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS county text;
