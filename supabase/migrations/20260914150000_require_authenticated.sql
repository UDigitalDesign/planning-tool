-- Sluit de tabellen af voor de anon key.
--
-- Tot nu toe had elke tabel een "anon full access"-policy, waardoor iedereen
-- met de (publieke) anon key de planning kon lezen en wijzigen. De app logt nu
-- in met een gedeeld Supabase-account, dus alleen de rol `authenticated` hoeft
-- er nog bij te kunnen.

do $$
declare
  t text;
begin
  foreach t in array array[
    'users',
    'clients',
    'projects',
    'assignments',
    'weekly_hours',
    'user_week_notes',
    'project_week_notes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "anon full access" on public.%I', t);
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format(
      'create policy "authenticated full access" on public.%I
         for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
