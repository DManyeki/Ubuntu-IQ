// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

// Vite uses import.meta.env, not process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side operations with full access
export function createServiceClient() {
  const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(
    supabaseUrl,
    serviceKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Database types (will be generated from Supabase)
export interface Institution {
  id: string;
  name: string;
  type: 'university' | 'tveta' | 'college' | 'polytechnic';
  status: 'active' | 'inactive' | 'pending';
  website?: string;
  email?: string;
  phone?: string;
  county?: string;
  region?: string;
  address?: string;
  description?: string;
  about?: string;
  logo_url?: string;
  cover_image_url?: string;
  facilities?: string[];
  accreditations?: string[];
  embedding?: number[];
  data_source?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  institution_id: string;
  name: string;
  level: 'certificate' | 'diploma' | 'bachelors' | 'masters' | 'phd';
  description?: string;
  duration_value?: number;
  duration_unit?: 'months' | 'years';
  min_kcse_grade?: string;
  other_requirements?: string;
  mode?: ('full_time' | 'part_time' | 'online')[];
  fees_range?: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  riasec_codes?: string[];
  career_outcomes?: string[];
  kuccps_code?: string;
  cluster_subjects?: string[];
  embedding?: number[];
  data_source?: string;
  verified: boolean;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface IngestJob {
  id: string;
  type: 'pdf_parse' | 'web_scrape' | 'ai_review';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reviewed';
  file_url?: string;
  target_domain?: string;
  target_institution_id?: string;
  config?: any;
  extracted_data?: any;
  ai_review_results?: any;
  pages_processed?: number;
  pages_scraped?: number;
  errors?: string[];
  created_by?: string;
  created_at: string;
  completed_at?: string;
}
