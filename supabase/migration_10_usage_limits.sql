-- STOPIX — migration #10 : limites d'usage des edge functions payantes
-- À lancer dans Supabase → SQL Editor AVANT de redéployer `geocode` et
-- `extract-addresses` (sinon elles refusent tout, faute de consume_quota).
-- Idempotent : peut être relancé sans risque (les limites déjà réglées sont conservées).
--
-- Chaque appel aux API payantes (OpenAI, Google) consomme du quota, par
-- utilisateur ET au global, par jour (fuseau Europe/Brussels) :
--   ai_extract   : extraction d'adresses par photo (GPT-4o)        ~0,02-0,03 $ / appel
--   maps         : Place Details, Geocoding, Directions (par requête Google)
--   autocomplete : suggestions d'adresse pendant la saisie
-- Les limites se règlent sans redéployer :
--   update public.api_limits set per_user_daily = 30 where kind = 'ai_extract';

create table if not exists public.api_limits (
  kind           text primary key,
  per_user_daily int  not null check (per_user_daily >= 0),
  global_daily   int  not null check (global_daily >= 0),
  updated_at     timestamptz not null default now()
);

insert into public.api_limits (kind, per_user_daily, global_daily) values
  ('ai_extract',   20,  200),
  ('maps',         200, 1000),
  ('autocomplete', 500, 3000)
on conflict (kind) do nothing;

-- Compteurs par utilisateur et par jour
create table if not exists public.api_usage (
  user_id uuid not null references auth.users on delete cascade,
  day     date not null,
  kind    text not null references public.api_limits (kind),
  count   int  not null default 0,
  primary key (user_id, day, kind)
);

-- Compteurs globaux (tous utilisateurs) par jour
create table if not exists public.api_usage_global (
  day   date not null,
  kind  text not null references public.api_limits (kind),
  count int  not null default 0,
  primary key (day, kind)
);

alter table public.api_limits       enable row level security;
alter table public.api_usage        enable row level security;
alter table public.api_usage_global enable row level security;

-- Le livreur peut lire ses propres compteurs et les limites (affichage),
-- jamais les modifier : seule consume_quota() écrit.
drop policy if exists "read limits" on public.api_limits;
create policy "read limits" on public.api_limits for select to authenticated using (true);

drop policy if exists "own usage read" on public.api_usage;
create policy "own usage read" on public.api_usage
  for select to authenticated using (user_id = auth.uid());
-- api_usage_global : aucune policy → illisible côté client.

-- ─────────────────────────────────────────────────────────────
-- consume_quota(kind, cost) : réserve `cost` unités, de façon atomique.
-- Retourne { allowed, scope, used, limit } ; scope = 'user' | 'global' quand refusé.
-- Appelée par les edge functions avec le JWT de l'utilisateur (auth.uid()).
-- ─────────────────────────────────────────────────────────────
create or replace function public.consume_quota(p_kind text, p_cost int default 1)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  today date := (now() at time zone 'Europe/Brussels')::date;
  lim   public.api_limits;
  used  int;
begin
  if uid is null then
    return json_build_object('allowed', false, 'scope', 'auth', 'used', 0, 'limit', 0);
  end if;
  if p_cost is null or p_cost < 1 then
    p_cost := 1;
  end if;

  select * into lim from public.api_limits where kind = p_kind;
  if not found then
    raise exception 'unknown quota kind: %', p_kind;
  end if;

  -- 1. Global d'abord (upsert conditionnel : n'incrémente que sous la limite)
  insert into public.api_usage_global as g (day, kind, count)
  values (today, p_kind, p_cost)
  on conflict (day, kind) do update set count = g.count + p_cost
    where g.count + p_cost <= lim.global_daily
  returning count into used;
  if used is null or used > lim.global_daily then
    if used is not null then -- première insertion du jour au-delà de la limite
      update public.api_usage_global set count = count - p_cost where day = today and kind = p_kind;
    end if;
    return json_build_object('allowed', false, 'scope', 'global', 'used', lim.global_daily, 'limit', lim.global_daily);
  end if;

  -- 2. Utilisateur
  used := null;
  insert into public.api_usage as u (user_id, day, kind, count)
  values (uid, today, p_kind, p_cost)
  on conflict (user_id, day, kind) do update set count = u.count + p_cost
    where u.count + p_cost <= lim.per_user_daily
  returning count into used;
  if used is null or used > lim.per_user_daily then
    if used is not null then
      update public.api_usage set count = count - p_cost where user_id = uid and day = today and kind = p_kind;
    end if;
    -- rendre la réservation globale
    update public.api_usage_global set count = count - p_cost where day = today and kind = p_kind;
    return json_build_object('allowed', false, 'scope', 'user', 'used', lim.per_user_daily, 'limit', lim.per_user_daily);
  end if;

  return json_build_object('allowed', true, 'scope', 'user', 'used', used, 'limit', lim.per_user_daily);
end;
$$;

-- Seuls les utilisateurs connectés peuvent consommer du quota.
revoke all on function public.consume_quota(text, int) from public, anon;
grant execute on function public.consume_quota(text, int) to authenticated;

notify pgrst, 'reload schema';
