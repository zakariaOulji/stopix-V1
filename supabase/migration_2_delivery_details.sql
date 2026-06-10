-- STOPIX — migration #2 : détails de livraison (téléphone + nb de vrac)
-- À lancer dans Supabase → SQL Editor si tu as déjà exécuté schema.sql avant.
-- Idempotent : peut être relancé sans risque.
-- (Un stop peut avoir des colis ET du vrac : on garde `packages` pour les colis
--  et on ajoute `vrac` pour les unités de vrac.)

alter table public.stops add column if not exists phone text;
alter table public.stops add column if not exists vrac  int default 0;
