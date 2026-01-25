-- Create kmtc_programs table
create table public.kmtc_programs (
  id uuid default gen_random_uuid() primary key,
  program_id text unique, -- Original KMTC ID e.g. "5538"
  name text not null,
  url text,
  category_group text,
  min_mean_grade text,
  requirements jsonb, -- [{subject, grade}, ...]
  campuses jsonb, -- List of campuses offering it
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.kmtc_programs enable row level security;

-- Create policies (read-only for public, write for service_role)
create policy "Enable read access for all users"
on public.kmtc_programs for select
using (true);

create policy "Enable write access for service role"
on public.kmtc_programs for all
using (auth.role() = 'service_role');

-- Create indexes
create index kmtc_programs_name_idx on public.kmtc_programs(name);
create index kmtc_programs_category_idx on public.kmtc_programs(category_group);
