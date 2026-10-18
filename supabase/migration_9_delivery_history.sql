-- STOPIX — migration #9 : historique des livraisons
-- À lancer dans Supabase → SQL Editor, APRÈS la migration #8 (return_vrac / return_bags).
-- Idempotent : peut être relancé sans risque.
--
-- Pourquoi une table à part : relancer une tournée réinitialise ses stops sur
-- place (statut, heure, preuves, retours remis à zéro) et supprimer une tournée
-- supprime ses stops. Lire l'historique dans `stops` le perdrait donc à chaque
-- relance. `deliveries` est un journal : une ligne par passage terminé
-- (livré / échec / sauté), copie des infos au moment du passage.
--
-- Rempli par trigger sur `stops` (pas par l'app) : rien ne se perd si une
-- écriture côté app échoue après coup, et les clients ne peuvent ni créer ni
-- modifier l'historique (lecture seule via RLS).

create table if not exists public.deliveries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  -- Liens gardés tant que la tournée / le stop existent, puis mis à null.
  tournee_id     uuid references public.tournees on delete set null,
  stop_id        uuid references public.stops on delete set null,
  -- Copie au moment du passage (survit à l'édition / suppression de la tournée).
  tournee_name   text not null,
  recipient      text not null,
  address        text not null,
  city           text,
  postal_code    text,
  packages       int,
  vrac           int,
  status         stop_status not null,
  failure_reason failure_reason,
  happened_at    timestamptz not null default now(),
  proof_url      text,
  signature_url  text,
  proof_lat      double precision,
  proof_lng      double precision,
  return_vrac    int not null default 0,
  return_bags    int not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists deliveries_user_time_idx on public.deliveries (user_id, happened_at desc);
create index if not exists deliveries_stop_idx      on public.deliveries (stop_id, created_at desc);

alter table public.deliveries enable row level security;

-- Lecture seule pour le propriétaire ; écriture réservée au trigger.
drop policy if exists "own deliveries read" on public.deliveries;
create policy "own deliveries read" on public.deliveries
  for select to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Trigger
--   pending → livré/échec/sauté      : nouvelle ligne d'historique
--   livré ↔ échec ↔ sauté (correction) : met à jour la dernière ligne du stop
--   preuve / retours arrivés après coup (upload en arrière-plan) : idem
-- Le reset (relance) repasse par `pending`, donc le passage suivant crée bien
-- une nouvelle ligne et l'ancienne reste intacte.
-- ─────────────────────────────────────────────────────────────
create or replace function public.log_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  last_id uuid;
begin
  if new.status = 'pending' then
    return new;
  end if;

  select id, user_id, name into t from public.tournees where id = new.tournee_id;
  if not found then
    return new;
  end if;

  if old.status = 'pending' then
    insert into public.deliveries (
      user_id, tournee_id, stop_id, tournee_name, recipient, address, city, postal_code,
      packages, vrac, status, failure_reason, happened_at,
      proof_url, signature_url, proof_lat, proof_lng, return_vrac, return_bags
    ) values (
      t.user_id, t.id, new.id, t.name, new.recipient, new.address, new.city, new.postal_code,
      new.packages, new.vrac, new.status, new.failure_reason, coalesce(new.delivered_at, now()),
      new.proof_url, new.signature_url, new.proof_lat, new.proof_lng,
      coalesce(new.return_vrac, 0), coalesce(new.return_bags, 0)
    );
    return new;
  end if;

  -- Déjà terminé : correction de statut ou preuve/retours arrivés ensuite.
  select id into last_id from public.deliveries
  where stop_id = new.id order by created_at desc limit 1;
  if last_id is null then
    return new;
  end if;

  update public.deliveries set
    status         = new.status,
    failure_reason = new.failure_reason,
    happened_at    = coalesce(new.delivered_at, happened_at),
    proof_url      = new.proof_url,
    signature_url  = new.signature_url,
    proof_lat      = new.proof_lat,
    proof_lng      = new.proof_lng,
    return_vrac    = coalesce(new.return_vrac, 0),
    return_bags    = coalesce(new.return_bags, 0)
  where id = last_id;
  return new;
end;
$$;

drop trigger if exists stops_log_delivery on public.stops;
create trigger stops_log_delivery
  after update of status, proof_url, signature_url, proof_lat, proof_lng, delivered_at,
                  return_vrac, return_bags, failure_reason
  on public.stops
  for each row
  when (old.status is distinct from new.status
        or old.proof_url is distinct from new.proof_url
        or old.signature_url is distinct from new.signature_url
        or old.proof_lat is distinct from new.proof_lat
        or old.proof_lng is distinct from new.proof_lng
        or old.delivered_at is distinct from new.delivered_at
        or old.return_vrac is distinct from new.return_vrac
        or old.return_bags is distinct from new.return_bags
        or old.failure_reason is distinct from new.failure_reason)
  execute function public.log_delivery();

-- ─────────────────────────────────────────────────────────────
-- Reprise de l'existant : les stops déjà terminés qui n'ont pas encore de
-- ligne d'historique (les passages effacés par une relance sont perdus).
-- ─────────────────────────────────────────────────────────────
insert into public.deliveries (
  user_id, tournee_id, stop_id, tournee_name, recipient, address, city, postal_code,
  packages, vrac, status, failure_reason, happened_at,
  proof_url, signature_url, proof_lat, proof_lng, return_vrac, return_bags
)
select
  t.user_id, t.id, s.id, t.name, s.recipient, s.address, s.city, s.postal_code,
  s.packages, s.vrac, s.status, s.failure_reason,
  coalesce(s.delivered_at, t.date::timestamptz),
  s.proof_url, s.signature_url, s.proof_lat, s.proof_lng,
  coalesce(s.return_vrac, 0), coalesce(s.return_bags, 0)
from public.stops s
join public.tournees t on t.id = s.tournee_id
where s.status <> 'pending'
  and not exists (select 1 from public.deliveries d where d.stop_id = s.id);

notify pgrst, 'reload schema';
