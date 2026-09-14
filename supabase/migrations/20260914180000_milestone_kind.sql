-- Deadlines worden vastgelegd om vooruit te documenteren en collega's te
-- informeren, niet om af te vinken. De `done`-vlag vervalt daarom; wat er
-- bijkomt is of het een harde of een zachte deadline is.

alter table public.project_milestones
  add column if not exists soft boolean not null default false;

alter table public.project_milestones
  drop column if exists done;

-- Startdatum van een project, zodat de tijdlijn een balk kan tekenen voordat
-- er uren zijn ingepland. Het einde volgt uit de laatste deadline.
alter table public.projects
  add column if not exists start_date date;
