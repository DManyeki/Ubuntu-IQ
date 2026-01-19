-- Create tvet_programs table
create table public.tvet_programs (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  level text not null,
  min_mean_grade text not null,
  requirements jsonb,
  exam_type text, -- 'KUCCPS', 'KNEC', 'INTERNAL'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.tvet_programs enable row level security;

-- Create policies (read-only for public, write for service_role)
create policy "Enable read access for all users"
on public.tvet_programs for select
using (true);

create policy "Enable write access for service role"
on public.tvet_programs for all
using (auth.role() = 'service_role');

-- Create indexes
create index tvet_programs_category_idx on public.tvet_programs(category);
create index tvet_programs_level_idx on public.tvet_programs(level);
create index tvet_programs_exam_type_idx on public.tvet_programs(exam_type);

-- Validation constraint for levels
alter table public.tvet_programs
add constraint tvet_level_check
check (level in ('Diploma', 'Certificate', 'Artisan', 'Diploma (Special Needs)'));
