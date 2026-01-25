
-- Add Google Maps enrichment column
ALTER TABLE tvet_institutions 
ADD COLUMN IF NOT EXISTS google_maps_data JSONB,
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN tvet_institutions.google_maps_data IS 'Structured JSON containing Name, Rating, Reviews, Coordinates, Link from Google Maps';
