-- Create kmtc_campuses table
create table public.kmtc_campuses (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  website text,
  phone text,
  email text,
  address text,
  county text,
  description text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.kmtc_campuses enable row level security;

-- Create policies (read-only for public, write for service_role)
create policy "Enable read access for all users"
on public.kmtc_campuses for select
using (true);

create policy "Enable write access for service role"
on public.kmtc_campuses for all
using (auth.role() = 'service_role');

-- Create indexes
create index kmtc_campuses_name_idx on public.kmtc_campuses(name);
create index kmtc_campuses_county_idx on public.kmtc_campuses(county);
