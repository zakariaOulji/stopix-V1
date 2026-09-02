-- STOPIX — migration #5 : preuve de livraison (photo + signature)
-- À lancer dans Supabase → SQL Editor.

-- 1. Colonnes sur les stops
alter table public.stops add column if not exists proof_url     text;
alter table public.stops add column if not exists signature_url text;

-- 2. Bucket de stockage (public en lecture pour afficher les preuves)
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

-- 3. Politiques : upload réservé aux connectés, lecture publique
drop policy if exists "proofs upload" on storage.objects;
create policy "proofs upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'proofs');

drop policy if exists "proofs read" on storage.objects;
create policy "proofs read" on storage.objects
  for select using (bucket_id = 'proofs');

notify pgrst, 'reload schema';
