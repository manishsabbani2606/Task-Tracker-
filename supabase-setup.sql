-- ============================================================================
--  WorkLog — Supabase database setup
--  Paste this ENTIRE script into:  Supabase dashboard → SQL Editor → New query
--  then click RUN. It is safe to run more than once.
-- ============================================================================

-- 1) PROFILES — one row per user (their name, company, role, and admin flag)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  company    text,
  role       text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) DAY_LOGS — one row per user per day; the day's tasks are stored as JSON
create table if not exists public.day_logs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  log_date   date not null,
  clock_in   text default '',
  clock_out  text default '',
  submitted  boolean not null default false,
  tasks      jsonb   not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, log_date)
);

-- 3) Helper: is the current user an admin?
--    SECURITY DEFINER lets it read profiles without tripping row-level security.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 4) Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, company, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company', ''),
    coalesce(new.raw_user_meta_data->>'role', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) Turn on Row Level Security (each user is walled off from the others)
alter table public.profiles enable row level security;
alter table public.day_logs enable row level security;

-- 6) PROFILES access rules
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid());

-- 7) DAY_LOGS access rules — users manage their own; admin can read everyone's
drop policy if exists day_logs_select on public.day_logs;
create policy day_logs_select on public.day_logs
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists day_logs_insert on public.day_logs;
create policy day_logs_insert on public.day_logs
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists day_logs_update on public.day_logs;
create policy day_logs_update on public.day_logs
  for update to authenticated
  using (user_id = auth.uid());

drop policy if exists day_logs_delete on public.day_logs;
create policy day_logs_delete on public.day_logs
  for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
--  MAKE YOURSELF ADMIN
--  1. First, open the app once and SIGN UP with your own email.
--  2. Then come back here and run just this statement (edit the email if needed):
--
--     update public.profiles set is_admin = true
--     where id = (select id from auth.users
--                 where email = 'sabbanimanish2606@gmail.com');
--
--  That gives you (and only you) the admin view of all users' timesheets.
-- ============================================================================
