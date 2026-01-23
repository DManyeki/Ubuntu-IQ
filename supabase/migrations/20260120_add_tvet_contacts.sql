
-- Add contact columns to tvet_institutions
ALTER TABLE public.tvet_institutions
ADD COLUMN IF NOT EXISTS town TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;
