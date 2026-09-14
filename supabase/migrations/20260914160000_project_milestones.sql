-- Milestones per project: meestal deadlines ("Oplevering deel A"), soms een
-- periode zoals een design sprint. Dan is end_date gevuld; bij een deadline
-- blijft die leeg.

create table if not exists public.project_milestones (
  id         text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  title      text not null,
  due_date   date not null,
  end_date   date,                                  -- null = puntmoment
  done       boolean not null default false,
  created_at timestamptz default now() not null
);

create index if not exists idx_project_milestones_project on public.project_milestones(project_id);
create index if not exists idx_project_milestones_due on public.project_milestones(due_date);

alter table public.project_milestones enable row level security;

drop policy if exists "authenticated full access" on public.project_milestones;
create policy "authenticated full access" on public.project_milestones
  for all to authenticated using (true) with check (true);
