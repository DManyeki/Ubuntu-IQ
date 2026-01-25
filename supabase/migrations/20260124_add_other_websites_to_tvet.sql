
-- Add other_websites column to tvet_institutions
ALTER TABLE public.tvet_institutions 
ADD COLUMN IF NOT EXISTS other_websites JSONB DEFAULT '[]'::jsonb;
