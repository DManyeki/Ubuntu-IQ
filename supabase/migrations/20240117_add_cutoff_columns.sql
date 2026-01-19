-- Add cutoff columns and cluster data to programs table
-- Run this in Supabase SQL Editor

-- Add cutoff columns for each year (2018-2024)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cutoff_2018 DECIMAL(5,3);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cutoff_2019 DECIMAL(5,3);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cutoff_2020 DECIMAL(5,3);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cutoff_2021 DECIMAL(5,3);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cutoff_2022 DECIMAL(5,3);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cutoff_2023 DECIMAL(5,3);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cutoff_2024 DECIMAL(5,3);

-- Add cluster reference
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cluster_id VARCHAR(10);

-- Add subject requirement columns (individual columns for easier querying)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS subject_req_1 VARCHAR(100);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS subject_req_2 VARCHAR(100);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS subject_req_3 VARCHAR(100);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS subject_req_4 VARCHAR(100);

-- Create index on cluster_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_programs_cluster ON programs(cluster_id);

-- Create index on kuccps_code for fast upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_kuccps_code ON programs(kuccps_code);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'programs' 
ORDER BY ordinal_position;
