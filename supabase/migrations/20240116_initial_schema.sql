-- MindCare Kenya Database Schema
-- Supabase PostgreSQL with pgvector for semantic search

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================
-- INSTITUTIONS TABLE
-- =============================================
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('university', 'tveta', 'college', 'polytechnic')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  
  -- Contact & Location
  website TEXT,
  email TEXT,
  phone TEXT,
  county TEXT,
  region TEXT,
  address TEXT,
  
  -- Rich Content
  description TEXT,
  about TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  facilities TEXT[],
  accreditations TEXT[],
  
  -- Vector Embedding for Semantic Search
  embedding vector(1536),
  
  -- Metadata
  data_source TEXT, -- 'kuccps', 'scraped', 'manual'
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_institutions_type ON institutions(type);
CREATE INDEX idx_institutions_county ON institutions(county);
CREATE INDEX idx_institutions_status ON institutions(status);
CREATE INDEX idx_institutions_embedding ON institutions USING ivfflat (embedding vector_cosine_ops);

-- =============================================
-- PROGRAMS TABLE
-- =============================================
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  
  -- Program Details
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('certificate', 'diploma', 'bachelors', 'masters', 'phd')),
  description TEXT,
  
  -- Duration
  duration_value INTEGER,
  duration_unit TEXT CHECK (duration_unit IN ('months', 'years')),
  
  -- Admission
  min_kcse_grade TEXT,
  other_requirements TEXT,
  mode TEXT[] DEFAULT ARRAY['full_time'], -- full_time, part_time, online
  
  -- Fees
  fees_range JSONB, -- {min: 100000, max: 150000, currency: 'KES', period: 'year'}
  
  -- Career Info
  riasec_codes TEXT[],
  career_outcomes TEXT[],
  
  -- KUCCPS Integration
  kuccps_code TEXT UNIQUE,
  cluster_subjects TEXT[],
  
  -- Vector Embedding
  embedding vector(1536),
  
  -- Metadata
  data_source TEXT,
  verified BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_programs_institution ON programs(institution_id);
CREATE INDEX idx_programs_level ON programs(level);
CREATE INDEX idx_programs_kuccps_code ON programs(kuccps_code);
CREATE INDEX idx_programs_riasec ON programs USING GIN (riasec_codes);
CREATE INDEX idx_programs_embedding ON programs USING ivfflat (embedding vector_cosine_ops);

-- =============================================
-- APPLICATION PROCESSES TABLE
-- =============================================
CREATE TABLE application_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  
  -- Process Details
  process_type TEXT CHECK (process_type IN ('kuccps', 'direct', 'both')),
  application_url TEXT,
  deadline_type TEXT, -- 'rolling', 'fixed', 'kuccps'
  deadline_date DATE,
  
  -- Requirements
  required_documents TEXT[],
  application_fee JSONB, -- {amount: 1000, currency: 'KES'}
  
  steps JSONB, -- Array of application steps
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_application_processes_institution ON application_processes(institution_id);

-- =============================================
-- INGEST JOBS TABLE
-- =============================================
CREATE TABLE ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Job Details
  type TEXT NOT NULL CHECK (type IN ('pdf_parse', 'web_scrape', 'ai_review')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'reviewed')),
  
  -- Input
  file_url TEXT,
  target_domain TEXT,
  target_institution_id UUID REFERENCES institutions(id),
  config JSONB,
  
  -- Output
  extracted_data JSONB,
  ai_review_results JSONB,
  pages_processed INTEGER,
  pages_scraped INTEGER,
  errors TEXT[],
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_ingest_jobs_type ON ingest_jobs(type);
CREATE INDEX idx_ingest_jobs_status ON ingest_jobs(status);
CREATE INDEX idx_ingest_jobs_created_at ON ingest_jobs(created_at DESC);

-- =============================================
-- SCRAPED PAGES TABLE
-- =============================================
CREATE TABLE scraped_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES ingest_jobs(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id),
  
  -- Page Info
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  page_type TEXT, -- programs, fees, admission, about, contact, unknown
  title TEXT,
  
  -- Content
  html_content TEXT,
  text_content TEXT,
  metadata JSONB,
  
  -- Extraction
  extracted_info JSONB,
  confidence_score DECIMAL,
  processed BOOLEAN DEFAULT false,
  
  scraped_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scraped_pages_job ON scraped_pages(job_id);
CREATE INDEX idx_scraped_pages_domain ON scraped_pages(domain);
CREATE INDEX idx_scraped_pages_type ON scraped_pages(page_type);
CREATE INDEX idx_scraped_pages_processed ON scraped_pages(processed);

-- =============================================
-- INSTITUTION REPRESENTATIVES TABLE
-- =============================================
CREATE TABLE institution_representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  
  -- Rep Info
  full_name TEXT NOT NULL,
  position TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Verification
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_documents TEXT[], -- URLs to uploaded docs
  verified_by UUID,
  verified_at TIMESTAMP,
  
  -- Permissions
  can_edit_programs BOOLEAN DEFAULT true,
  can_edit_fees BOOLEAN DEFAULT true,
  can_edit_admission BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, institution_id)
);

CREATE INDEX idx_reps_user ON institution_representatives(user_id);
CREATE INDEX idx_reps_institution ON institution_representatives(institution_id);
CREATE INDEX idx_reps_status ON institution_representatives(verification_status);

-- =============================================
-- USER PROFILES TABLE
-- =============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User Info
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'institution_rep', 'admin')),
  
  -- Assessment Data (migrated from Firebase)
  riasec_results JSONB,
  mood_results JSONB,
  assessment_history JSONB[],
  
  -- Saved Programs
  saved_programs UUID[],
  compared_programs UUID[],
  application_tracking JSONB,
  
  -- Preferences
  preferred_counties TEXT[],
  preferred_program_levels TEXT[],
  budget_range JSONB,
  
  -- Migration Metadata
  firebase_uid TEXT UNIQUE,
  migrated_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_firebase_uid ON user_profiles(firebase_uid);

-- =============================================
-- AUDIT LOG TABLE
-- =============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Who & When
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_record ON audit_log(record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Public read access to active institutions and programs
CREATE POLICY "Public can view active institutions"
  ON institutions FOR SELECT
  USING (status = 'active');

CREATE POLICY "Public can view active programs"
  ON programs FOR SELECT
  USING (status = 'active');

CREATE POLICY "Public can view application processes"
  ON application_processes FOR SELECT
  USING (true);

-- Institution reps can update their own institution
CREATE POLICY "Reps can update their institution"
  ON institutions FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM institution_representatives
      WHERE institution_id = institutions.id
        AND verification_status = 'verified'
    )
  );

CREATE POLICY "Reps can update their programs"
  ON programs FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM institution_representatives ir
      WHERE ir.institution_id = programs.institution_id
        AND ir.verification_status = 'verified'
        AND ir.can_edit_programs = true
    )
  );

-- Users can manage their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admin full access (via role check)
CREATE POLICY "Admins have full access to institutions"
  ON institutions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins have full access to programs"
  ON programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins have full access to ingest_jobs"
  ON ingest_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins have full access to reps"
  ON institution_representatives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Audit log - read only for admins
CREATE POLICY "Admins can view audit log"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- VECTOR SEARCH FUNCTIONS
-- =============================================

-- Search institutions by semantic similarity
CREATE OR REPLACE FUNCTION search_institutions_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  county text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    institutions.id,
    institutions.name,
    institutions.type,
    institutions.county,
    institutions.description,
    1 - (institutions.embedding <=> query_embedding) AS similarity
  FROM institutions
  WHERE 
    institutions.status = 'active'
    AND institutions.embedding IS NOT NULL
    AND 1 - (institutions.embedding <=> query_embedding) > match_threshold
  ORDER BY institutions.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search programs by semantic similarity
CREATE OR REPLACE FUNCTION search_programs_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  level text,
  institution_name text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.level,
    i.name AS institution_name,
    p.description,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM programs p
  JOIN institutions i ON p.institution_id = i.id
  WHERE 
    p.status = 'active'
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search (vector + keyword)
CREATE OR REPLACE FUNCTION search_programs_hybrid(
  query_text text,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  level text,
  institution_name text,
  description text,
  combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.level,
    i.name AS institution_name,
    p.description,
    -- Combine semantic similarity (70%) + keyword match (30%)
    (0.7 * (1 - (p.embedding <=> query_embedding))) +
    (0.3 * ts_rank(
      to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')),
      plainto_tsquery('english', query_text)
    )) AS combined_score
  FROM programs p
  JOIN institutions i ON p.institution_id = i.id
  WHERE 
    p.status = 'active'
    AND p.embedding IS NOT NULL
    AND (
      1 - (p.embedding <=> query_embedding) > match_threshold
      OR to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', query_text)
    )
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ MindCare Kenya database schema created successfully!';
  RAISE NOTICE '📊 Tables: 8 core tables + audit_log';
  RAISE NOTICE '🔒 RLS policies: Enabled for all tables';
  RAISE NOTICE '🔍 Vector search: 3 semantic search functions';
  RAISE NOTICE '🚀 Ready for data ingestion!';
END $$;
