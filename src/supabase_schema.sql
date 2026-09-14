-- ============================================================
-- PLANNING TOOL — VOLLEDIGE SQL MIGRATIE
-- Run dit in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================
-- LET OP: Dit script dropt bestaande tabellen als ze al bestaan.
-- Voer dit alleen uit op een schoon project of als je zeker weet
-- dat je de data wilt resetten.
-- ============================================================

-- 1) Drop bestaande tabellen (in volgorde i.v.m. foreign keys)
drop table if exists public.project_week_notes cascade;
drop table if exists public.user_week_notes cascade;
drop table if exists public.weekly_hours cascade;
drop table if exists public.assignments cascade;
drop table if exists public.projects cascade;
drop table if exists public.clients cascade;
drop table if exists public.users cascade;

-- ============================================================
-- 2) USERS
-- ============================================================
create table public.users (
  id          text primary key,
  name        text not null,
  role        text not null default 'Member',          -- 'Admin' | 'Member' | 'Read-only'
  weekly_contract_hours integer not null default 40,
  color       text not null,                            -- Tailwind class, e.g. 'bg-purple-600'
  initials    text,
  cost_rate   numeric(10,2),                            -- Internal cost per hour (EUR)
  created_at  timestamptz default now() not null
);

-- ============================================================
-- 3) CLIENTS
-- ============================================================
create table public.clients (
  id                text primary key,
  name              text not null,
  status            text not null default 'Active',      -- 'Active' | 'Inactive'
  "order"           integer,
  billable_order    integer,
  non_billable_order integer,
  default_category  text,                                -- 'Billable projects' | 'Non-billable projects' | 'Internal'
  created_at        timestamptz default now() not null
);

-- ============================================================
-- 4) PROJECTS
-- ============================================================
create table public.projects (
  id              text primary key,
  name            text not null,
  category        text not null default 'Billable projects',  -- Category type
  client_id       text references public.clients(id) on delete set null,
  status          text not null default 'Active',              -- ProjectStatus type
  project_code    text,
  project_manager text,
  description     text,
  expectancy      text,                                        -- Free text for pipeline projects
  budget          numeric(10,2),                               -- Total sold hours
  "order"         integer,
  created_at      timestamptz default now() not null
);

-- ============================================================
-- 5) ASSIGNMENTS (project <-> user many-to-many)
-- ============================================================
create table public.assignments (
  project_id  text not null references public.projects(id) on delete cascade,
  user_id     text not null references public.users(id) on delete cascade,
  created_at  timestamptz default now() not null,
  primary key (project_id, user_id)
);

-- ============================================================
-- 6) WEEKLY_HOURS
-- ============================================================
create table public.weekly_hours (
  id              text primary key,
  project_id      text not null references public.projects(id) on delete cascade,
  user_id         text not null references public.users(id) on delete cascade,
  week_start_date date not null,                        -- Always a Monday (ISO week start)
  hours           numeric(6,2) not null default 0,
  created_at      timestamptz default now() not null,
  unique (project_id, user_id, week_start_date)
);

-- ============================================================
-- 7) USER_WEEK_NOTES
-- ============================================================
create table public.user_week_notes (
  id              text primary key,
  user_id         text not null references public.users(id) on delete cascade,
  week_start_date date not null,
  note            text not null,
  created_at      timestamptz default now() not null,
  unique (user_id, week_start_date)
);

-- ============================================================
-- 8) PROJECT_WEEK_NOTES
-- ============================================================
create table public.project_week_notes (
  id              text primary key,
  project_id      text not null references public.projects(id) on delete cascade,
  week_start_date date not null,
  note            text not null,
  type            text default 'info',                  -- 'info' | 'warning' | 'important'
  created_at      timestamptz default now() not null,
  unique (project_id, week_start_date)
);

-- ============================================================
-- 9) INDEXES voor veelgebruikte queries
-- ============================================================
create index idx_projects_client_id on public.projects(client_id);
create index idx_projects_status on public.projects(status);
create index idx_projects_category on public.projects(category);
create index idx_assignments_project_id on public.assignments(project_id);
create index idx_assignments_user_id on public.assignments(user_id);
create index idx_weekly_hours_project_id on public.weekly_hours(project_id);
create index idx_weekly_hours_user_id on public.weekly_hours(user_id);
create index idx_weekly_hours_week on public.weekly_hours(week_start_date);
create index idx_weekly_hours_composite on public.weekly_hours(project_id, user_id, week_start_date);
create index idx_user_week_notes_user on public.user_week_notes(user_id);
create index idx_project_week_notes_project on public.project_week_notes(project_id);

-- ============================================================
-- 10) ROW LEVEL SECURITY (RLS)
-- Alles open voor anon — geschikt voor interne tool zonder auth.
-- Pas dit aan als je authenticatie toevoegt!
-- ============================================================

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.assignments enable row level security;
alter table public.weekly_hours enable row level security;
alter table public.user_week_notes enable row level security;
alter table public.project_week_notes enable row level security;

-- Policies: full access voor anon role
create policy "anon full access" on public.users
  for all using (true) with check (true);

create policy "anon full access" on public.clients
  for all using (true) with check (true);

create policy "anon full access" on public.projects
  for all using (true) with check (true);

create policy "anon full access" on public.assignments
  for all using (true) with check (true);

create policy "anon full access" on public.weekly_hours
  for all using (true) with check (true);

create policy "anon full access" on public.user_week_notes
  for all using (true) with check (true);

create policy "anon full access" on public.project_week_notes
  for all using (true) with check (true);

-- ============================================================
-- 11) SEED DATA — Basisteam en interne projecten
-- ============================================================
insert into public.users (id, name, role, weekly_contract_hours, color, initials, cost_rate) values
  ('u1', 'Rik',   'Admin',  36, 'bg-purple-600', 'R',  75),
  ('u2', 'Pasca', 'Member', 40, 'bg-cyan-500',   'PP', 65),
  ('u3', 'Chris', 'Member', 40, 'bg-orange-500',  'CG', 65),
  ('u4', 'Fleur', 'Member', 32, 'bg-blue-600',   'FB', 60),
  ('u5', 'Erik',  'Member', 40, 'bg-slate-700',  'EW', 70);

insert into public.projects (id, name, category, status, "order") values
  ('p8',  'Team Meetings',            'Internal', 'Active', 1),
  ('p9',  'Professional Development', 'Internal', 'Active', 2),
  ('p10', 'Vacation / Leave',         'Internal', 'Active', 3),
  ('p11', 'Sick Leave',               'Internal', 'Active', 4);

insert into public.assignments (project_id, user_id) values
  ('p8', 'u1'),
  ('p8', 'u2'),
  ('p8', 'u3'),
  ('p8', 'u4');

-- ============================================================
-- KLAAR! Alle tabellen zijn aangemaakt en gevuld met seed data.
-- ============================================================
