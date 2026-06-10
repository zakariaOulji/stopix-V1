-- STOPIX — migration #3 : modèles de tournée (récurrentes)
-- À lancer dans Supabase → SQL Editor. Idempotent.
--
-- Un modèle = la définition STABLE d'une tournée (stops sans quantité ni statut).
-- Chaque jour on l'instancie en une vraie tournée (tables tournees/stops) avec
-- les quantités du jour.

create table if not exists public.tournee_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists public.template_stops (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.tournee_templates on delete cascade,
  "order"     int not null,
  recipient   text not null default '',
  address     text not null,
  city        text,
  postal_code text,
  lat         double precision,
  lng         double precision,
  notes       text,
  access_code text,
  phone       text
);

create index if not exists template_stops_template_idx on public.template_stops(template_id);
create index if not exists templates_user_idx on public.tournee_templates(user_id);

alter table public.tournee_templates enable row level security;
alter table public.template_stops    enable row level security;

drop policy if exists "own templates" on public.tournee_templates;
create policy "own templates" on public.tournee_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own template stops" on public.template_stops;
create policy "own template stops" on public.template_stops
  for all
  using (exists (select 1 from public.tournee_templates t where t.id = template_stops.template_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.tournee_templates t where t.id = template_stops.template_id and t.user_id = auth.uid()));

notify pgrst, 'reload schema';
