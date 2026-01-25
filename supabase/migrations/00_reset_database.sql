-- MindCare Kenya Database Reset & Setup
-- Run this if you need to completely reset the database

-- WARNING: This will DELETE ALL DATA!
-- Only run this if you're starting fresh or need to reset

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS scraped_pages CASCADE;
DROP TABLE IF EXISTS ingest_jobs CASCADE;
DROP TABLE IF EXISTS application_processes CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS institution_representatives CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS search_institutions_semantic;
DROP FUNCTION IF EXISTS search_programs_semantic;
DROP FUNCTION IF EXISTS search_programs_hybrid;

-- Now run the main schema file: 20240116_initial_schema.sql
