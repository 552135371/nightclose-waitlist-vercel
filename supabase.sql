create table if not exists public.nightclose_waitlist (
  id bigint generated always as identity primary key,
  email text not null,
  name text,
  project text not null default 'nightclose',
  source text not null default 'landing',
  referrer text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists nightclose_waitlist_project_email_unique
  on public.nightclose_waitlist (project, email);

alter table public.nightclose_waitlist enable row level security;

drop policy if exists "No public reads" on public.nightclose_waitlist;
drop policy if exists "No public writes" on public.nightclose_waitlist;

create policy "No public reads"
  on public.nightclose_waitlist
  for select
  using (false);

create policy "No public writes"
  on public.nightclose_waitlist
  for insert
  with check (false);

grant usage on schema public to service_role;
grant insert, select on public.nightclose_waitlist to service_role;
grant usage, select on sequence public.nightclose_waitlist_id_seq to service_role;
