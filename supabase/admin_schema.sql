-- Stackform admin: tables and access rules.
-- Run once in the Supabase SQL editor of the Stackform project.
-- Every table is locked to one email: only that signed-in user can read or write.

create or replace function public.is_owner() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'hafiz@stackformstudios.com'
$$;

create table if not exists public.invoices (
  ref text primary key,
  issued date,
  client text not null,
  description text,
  amount numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  status text not null check (status in ('Paid','Due','Scheduled','Cancelled')),
  due date,
  paid_month text,
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  client text primary key,
  contact text,
  type text,
  since date,
  contracted numeric(12,2),
  retainer numeric(12,2),
  retainer_status text,
  status text,
  referred_by text,
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.pipeline (
  prospect text primary key,
  document text,
  scope text,
  one_time numeric(12,2),
  monthly numeric(12,2),
  stage text,
  next_step text,
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  vendor text primary key,
  item text,
  billing text,
  currency text,
  amount numeric(12,2),
  sgd_per_month numeric(12,2),
  paid_from text,
  status text,
  updated_at timestamptz not null default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  task text not null,
  owner text,
  due date,
  area text,
  status text,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  repo text primary key,
  project text,
  kind text,
  visibility text,
  last_push date,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['invoices','clients','pipeline','subscriptions','actions','projects','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;
