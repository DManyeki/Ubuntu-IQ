-- Create Other TVETs table for institutions found during Google Maps scraping
-- that are NOT in the official TVET institutions database

CREATE TABLE IF NOT EXISTS public.other_tvets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Info
    name TEXT NOT NULL,
    county TEXT,
    
    -- Discovery Context
    discovered_via TEXT,  -- Name of institution we were searching for when we found this
    discovery_source TEXT DEFAULT 'google_maps_scrape',
    discovery_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contact Info (from Google Maps)
    phone TEXT,
    address TEXT,
    website TEXT,
    
    -- Google Maps Data
    google_maps_link TEXT,
    google_maps_data JSONB DEFAULT '{}'::jsonb,
    
    -- Status/Classification
    status TEXT DEFAULT 'unverified' CHECK (status IN (
        'unverified',      -- Just discovered, not verified
        'verified_tvet',   -- Confirmed as legitimate TVET institution
        'not_tvet',        -- Confirmed NOT a TVET (e.g., primary school, business)
        'duplicate',       -- Duplicate of another entry
        'merged',          -- Has been merged into main tvet_institutions table
        'inactive'         -- Institution appears to be closed/inactive
    )),
    
    -- Verification Details
    verification_note TEXT,
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    
    -- Relationship to main table
    related_tvet_id UUID REFERENCES public.tvet_institutions(id),
    relationship_type TEXT CHECK (relationship_type IN (
        'campus_of',       -- This is a campus of the related institution
        'branch_of',       -- This is a branch of the related institution
        'affiliated_with', -- Affiliated but separate
        'successor_to',    -- Replaced the related institution
        'predecessor_of',  -- Was replaced by the related institution
        NULL               -- No relationship
    )),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS other_tvets_name_idx ON public.other_tvets (name);
CREATE INDEX IF NOT EXISTS other_tvets_county_idx ON public.other_tvets (county);
CREATE INDEX IF NOT EXISTS other_tvets_status_idx ON public.other_tvets (status);
CREATE INDEX IF NOT EXISTS other_tvets_related_tvet_idx ON public.other_tvets (related_tvet_id);

-- Enable RLS
ALTER TABLE public.other_tvets ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on other_tvets"
ON public.other_tvets
FOR SELECT
TO public
USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.other_tvets IS 'Institutions discovered during Google Maps scraping that are not in the official TVET database. These may be legitimate TVETs not yet registered, campuses, or unrelated institutions.';

COMMENT ON COLUMN public.other_tvets.status IS 'Current verification status: unverified (new), verified_tvet (confirmed TVET), not_tvet (not a TVET), duplicate, merged (moved to main table), inactive';
COMMENT ON COLUMN public.other_tvets.discovered_via IS 'The institution name we searched for when this was found instead';
COMMENT ON COLUMN public.other_tvets.relationship_type IS 'If related to an institution in tvet_institutions, the type of relationship';
