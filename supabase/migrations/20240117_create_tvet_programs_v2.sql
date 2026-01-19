-- Re-create tvet_programs table with updated schema for V2 logical data
drop table if exists public.tvet_programs;

create table public.tvet_programs (
  id uuid default gen_random_uuid() primary key,
  category text not null, -- e.g. "Law", "Education"
  level text not null, -- "Diploma", "Certificate", "Artisan"
  profile text default 'Standard', -- "Standard", "Visually Impaired"
  min_mean_grade text not null, -- "C+", "C", "C-"
  min_mean_rank int, -- Numeric rank for grade (A=12, A-=11... E=1)
  
  -- Complex requirements storage
  -- Stores the full logical structure: { "subject_rules": [...], "tracks": [...], "alternative_sets": [...] }
  requirements jsonb, 
  
  exam_type text default 'KUCCPS', -- 'KUCCPS', 'KNEC', 'INTERNAL'
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.tvet_programs enable row level security;

-- Create policies
create policy "Enable read access for all users"
on public.tvet_programs for select
using (true);

create policy "Enable write access for service role"
on public.tvet_programs for all
using (auth.role() = 'service_role');

-- Create indexes
create index tvet_programs_category_idx on public.tvet_programs(category);
create index tvet_programs_level_idx on public.tvet_programs(level);
