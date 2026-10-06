-- STOPIX — migration #6 : position GPS + horodatage de la preuve de livraison
-- À lancer dans Supabase → SQL Editor.
-- Idempotent : peut être relancé sans risque.
--
-- Ces colonnes ont été ajoutées à migration_5_proof.sql après coup (commit
-- f697160) : une base qui avait déjà exécuté la première version de la #5 ne
-- les a pas. Sans elles, updateStop échoue dès que markDelivered envoie la
-- position ou l'heure de livraison.

alter table public.stops add column if not exists proof_lat    double precision;
alter table public.stops add column if not exists proof_lng    double precision;
alter table public.stops add column if not exists delivered_at timestamptz;

notify pgrst, 'reload schema';
