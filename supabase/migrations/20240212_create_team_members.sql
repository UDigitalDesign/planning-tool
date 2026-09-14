-- Run this SQL in your Supabase SQL Editor to create the required table

create table if not exists public.team_members (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  role text not null default 'Member'::text,
  weekly_contract_hours integer not null default 40,
  color text not null,
  initials text null,
  constraint team_members_pkey primary key (id)
);

-- Enable Row Level Security (RLS)
alter table public.team_members enable row level security;

-- Create policies (Adjust these based on your security needs)
-- For now, we allow public access to facilitate development
create policy "Enable read access for all users"
on "public"."team_members"
as PERMISSIVE
for SELECT
to public
using (true);

create policy "Enable insert for all users"
on "public"."team_members"
as PERMISSIVE
for INSERT
to public
with check (true);

create policy "Enable update for all users"
on "public"."team_members"
as PERMISSIVE
for UPDATE
to public
using (true);

create policy "Enable delete for all users"
on "public"."team_members"
as PERMISSIVE
for DELETE
to public
using (true);
