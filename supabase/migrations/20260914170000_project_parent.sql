-- Een project mag onder een ander project hangen.
--
-- De ouder is de opdracht die je verkoopt ("Website"), met de projectcode en
-- het budget. De kinderen zijn de werkstromen ("UX desktop", "UX mobile") met
-- eigen uren, team en deadlines. Projecten zonder ouder blijven werken zoals ze
-- deden, dus bestaande rijen hoeven niet gemigreerd.

alter table public.projects
  add column if not exists parent_id text references public.projects(id) on delete set null;

create index if not exists idx_projects_parent on public.projects(parent_id);
