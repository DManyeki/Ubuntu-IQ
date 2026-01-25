
-- Create TVET Institutions table
CREATE TABLE IF NOT EXISTS public.tvet_institutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    registration_number TEXT,
    category TEXT,
    ownership TEXT,
    county TEXT,
    courses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint on registration number to prevent duplicates
ALTER TABLE public.tvet_institutions 
ADD CONSTRAINT tvet_institutions_registration_number_key UNIQUE (registration_number);

-- Enable RLS
ALTER TABLE public.tvet_institutions ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
ON public.tvet_institutions
FOR SELECT
TO public
USING (true);

-- Allow service role full access (implicit, but good to note or explicitly add if needed for anon/authenticated restrictions)
-- For this project, we might want admin write access, but service role bypasses RLS.
