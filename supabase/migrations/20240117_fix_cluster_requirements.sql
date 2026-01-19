-- Fix min_grade column constraint and re-run upload
-- Run this in Supabase SQL Editor

-- 1. Alter the min_grade column to allow longer values
ALTER TABLE cluster_requirements 
ALTER COLUMN min_grade TYPE VARCHAR(50);

-- 2. Alter subject_code to allow longer values too (some are compound like "BIO GSC MAT")
ALTER TABLE cluster_requirements 
ALTER COLUMN subject_code TYPE VARCHAR(100);

-- 3. Verify the changes
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'cluster_requirements';
