-- STOPIX — schéma Supabase (Postgres)
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- Idempotent autant que possible : peut être relancé.

-- ─────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type vehicle_type    as enum ('velo','moto','voiture','camionnette');
exception when duplicate_object then null; end $$;
do $$ begin
  create type employment_type as enum ('independant','salarie');
exception when duplicate_object then null; end $$;
do $$ begin
  create type driver_role     as enum ('driver','manager');
exception when duplicate_object then null; end $$;
do $$ begin
  create type tournee_status  as enum ('planned','active','completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type stop_status     as enum ('pending','delivered','failed','skipped');
exception when duplicate_object then null; end $$;
do $$ begin
  create type failure_reason  as enum ('absent','refus','adresse_invalide','autre');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  email       text,
  avatar_url  text,
  role        driver_role     not null default 'driver',
  vehicle     vehicle_type    not null default 'moto',
  employment  employment_type default 'independant',
  created_at  timestamptz default now()
);

create table if not exists public.tournees (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users on delete cascade,
  name                   text not null,
  status                 tournee_status not null default 'planned',
  date                   date not null default current_date,
  distance_km            numeric default 0,
  estimated_duration_min int default 0,
  region_lat             double precision,
  region_lng             double precision,
  start_time             text,
  end_time               text,
  created_at             timestamptz default now()
);

create table if not exists public.stops (
  id             uuid primary key default gen_random_uuid(),
  tournee_id     uuid not null references public.tournees on delete cascade,
  "order"        int not null,
  status         stop_status not null default 'pending',
  recipient      text not null,
  address        text not null,
  city           text,
  postal_code    text,
  lat            double precision,
  lng            double precision,
  notes          text,
  access_code    text,
  packages       int default 1,
  eta            text,
  completed_at   text,
  failure_reason failure_reason
);

create index if not exists stops_tournee_idx on public.stops(tournee_id);
create index if not exists tournees_user_idx  on public.tournees(user_id);

-- ─────────────────────────────────────────────────────────────
-- RLS : chaque livreur ne voit/modifie que ses données
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.tournees enable row level security;
alter table public.stops    enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own tournees" on public.tournees;
create policy "own tournees" on public.tournees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own stops" on public.stops;
create policy "own stops" on public.stops
  for all
  using (exists (select 1 from public.tournees t where t.id = stops.tournee_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.tournees t where t.id = stops.tournee_id and t.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- Création auto du profil à l'inscription
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, vehicle, employment)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'vehicle')::vehicle_type, 'moto'),
    coalesce((new.raw_user_meta_data->>'employment')::employment_type, 'independant')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Stats agrégées (RPC) — renvoie un objet JSON au format `Stats`
-- ─────────────────────────────────────────────────────────────
create or replace function public.get_stats()
returns json language sql stable security invoker as $$
  with my_stops as (
    select s.*, t.distance_km, t.estimated_duration_min, t.date as t_date
    from public.stops s
    join public.tournees t on t.id = s.tournee_id
    where t.user_id = auth.uid()
  ),
  week as (
    select extract(isodow from t_date)::int as dow, count(*) as n
    from my_stops
    where status = 'delivered' and t_date >= date_trunc('week', current_date)
    group by 1
  )
  select json_build_object(
    'deliveriesToday', (select count(*) from my_stops where status='delivered' and t_date = current_date),
    'successRate', coalesce(round(100.0 * count(*) filter (where status='delivered')
                        / nullif(count(*) filter (where status in ('delivered','failed')),0)), 0),
    'distanceKm', coalesce((select sum(distance_km) from public.tournees where user_id=auth.uid() and date=current_date),0),
    'durationMin', coalesce((select sum(estimated_duration_min) from public.tournees where user_id=auth.uid() and date=current_date),0),
    'weeklyDeliveries', (select coalesce(json_agg(coalesce(w.n,0) order by d.dow),'[]'::json)
                          from generate_series(1,7) d(dow) left join week w on w.dow=d.dow),
    'co2Saved', round((coalesce((select sum(distance_km) from public.tournees where user_id=auth.uid()),0) * 0.12)::numeric, 1),
    'totalDeliveries', (select count(*) from my_stops where status='delivered'),
    'totalDistanceKm', coalesce((select sum(distance_km) from public.tournees where user_id=auth.uid()),0)
  )
  from my_stops;
$$;
