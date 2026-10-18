-- STOPIX — migration #8 : retours récupérés à la livraison (vrac + sacs)
-- À lancer dans Supabase → SQL Editor.
-- Idempotent : peut être relancé sans risque.
--
-- Saisis dans la fiche « Preuve de livraison ». Remis à 0 quand la tournée
-- est réutilisée ou que le stop passe en échec / sauté.

alter table public.stops add column if not exists return_vrac int not null default 0;
alter table public.stops add column if not exists return_bags int not null default 0;

alter table public.stops drop constraint if exists stops_returns_non_negative;
alter table public.stops add constraint stops_returns_non_negative
  check (return_vrac >= 0 and return_bags >= 0);

notify pgrst, 'reload schema';
