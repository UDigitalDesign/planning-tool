-- Baseline: de zeven tabellen waar de planningstool op draait.
--
-- Veilig om opnieuw te draaien: alles is `if not exists`, er wordt niets
-- gedropt en er wordt geen seed-data ingevoegd. De policies staan in
-- 20260914150000_require_authenticated.sql.

create table if not exists public.users (
  id          text primary key,
  name        text not null,
  role        text not null default 'Member',          -- 'Admin' | 'Member' | 'Read-only'
  weekly_contract_hours integer not null default 40,
  color       text not null,                            -- Tailwind class, e.g. 'bg-purple-600'
  initials    text,
  cost_rate   numeric(10,2),                            -- Interne kosten per uur (EUR)
  created_at  timestamptz default now() not null
);

create table if not exists public.clients (
  id                 text primary key,
  name               text not null,
  status             text not null default 'Active',    -- 'Active' | 'Inactive'
  "order"            integer,
  billable_order     integer,
  non_billable_order integer,
  default_category   text,                              -- 'Billable projects' | 'Non-billable projects' | 'Internal'
  created_at         timestamptz default now() not null
);

create table if not exists public.projects (
  id              text primary key,
  name            text not null,
  category        text not null default 'Billable projects',
  client_id       text references public.clients(id) on delete set null,
  status          text not null default 'Active',
  project_code    text,
  project_manager text,
  description     text,
  expectancy      text,                                 -- Vrij tekstveld voor pipeline-projecten
  budget          numeric(10,2),                        -- Totaal verkochte uren
  "order"         integer,
  created_at      timestamptz default now() not null
);

create table if not exists public.assignments (
  project_id  text not null references public.projects(id) on delete cascade,
  user_id     text not null references public.users(id) on delete cascade,
  created_at  timestamptz default now() not null,
  primary key (project_id, user_id)
);

create table if not exists public.weekly_hours (
  id              text primary key,
  project_id      text not null references public.projects(id) on delete cascade,
  user_id         text not null references public.users(id) on delete cascade,
  week_start_date date not null,                        -- Altijd een maandag (ISO-week)
  hours           numeric(6,2) not null default 0,
  created_at      timestamptz default now() not null,
  unique (project_id, user_id, week_start_date)
);

create table if not exists public.user_week_notes (
  id              text primary key,
  user_id         text not null references public.users(id) on delete cascade,
  week_start_date date not null,
  note            text not null,
  created_at      timestamptz default now() not null,
  unique (user_id, week_start_date)
);

create table if not exists public.project_week_notes (
  id              text primary key,
  project_id      text not null references public.projects(id) on delete cascade,
  week_start_date date not null,
  note            text not null,
  type            text default 'info',                  -- 'info' | 'warning' | 'important'
  created_at      timestamptz default now() not null,
  unique (project_id, week_start_date)
);

create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_category on public.projects(category);
create index if not exists idx_assignments_project_id on public.assignments(project_id);
create index if not exists idx_assignments_user_id on public.assignments(user_id);
create index if not exists idx_weekly_hours_project_id on public.weekly_hours(project_id);
create index if not exists idx_weekly_hours_user_id on public.weekly_hours(user_id);
create index if not exists idx_weekly_hours_week on public.weekly_hours(week_start_date);
create index if not exists idx_weekly_hours_composite on public.weekly_hours(project_id, user_id, week_start_date);
create index if not exists idx_user_week_notes_user on public.user_week_notes(user_id);
create index if not exists idx_project_week_notes_project on public.project_week_notes(project_id);
