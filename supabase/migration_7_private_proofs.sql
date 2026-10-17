-- STOPIX — migration #7 : preuves de livraison privées
-- À lancer dans Supabase → SQL Editor.
-- Idempotent : peut être relancé sans risque.
--
-- Les preuves (photos de domiciles, signatures) ne doivent être lisibles que
-- par le livreur qui les a prises. Avant cette migration (#5) :
--   - le bucket `proofs` était public en lecture (URL devinable = fichier lisible) ;
--   - tout utilisateur connecté pouvait uploader n'importe où dans le bucket.
--
-- Désormais :
--   - bucket privé : lecture uniquement via URL signée (createSignedUrl) ;
--   - chemin imposé : <user_id>/<stop_id>/<fichier> ;
--   - insert / select / update / delete autorisés seulement dans son propre
--     dossier : (storage.foldername(name))[1] = auth.uid()::text.

-- 1. Bucket privé
update storage.buckets set public = false where id = 'proofs';

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- 2. Anciennes politiques (#5) : lecture publique + upload sans restriction
drop policy if exists "proofs upload" on storage.objects;
drop policy if exists "proofs read"   on storage.objects;

-- 3. Politiques par propriétaire (dossier racine = auth.uid())
drop policy if exists "proofs insert own" on storage.objects;
create policy "proofs insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "proofs select own" on storage.objects;
create policy "proofs select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- update : `using` filtre la ligne existante, `with check` empêche de la
-- déplacer (renommer) vers le dossier d'un autre utilisateur.
drop policy if exists "proofs update own" on storage.objects;
create policy "proofs update own" on storage.objects
  for update to authenticated
  using      (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "proofs delete own" on storage.objects;
create policy "proofs delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. stops.proof_url / signature_url contiennent maintenant un CHEMIN dans le
--    bucket (ex. "<user_id>/<stop_id>/photo-123.jpg"), plus une URL publique.
--    On convertit les anciennes URL publiques en chemins.
update public.stops
set proof_url = regexp_replace(proof_url, '^.*/storage/v1/object/public/proofs/', '')
where proof_url like '%/storage/v1/object/public/proofs/%';

update public.stops
set signature_url = regexp_replace(signature_url, '^.*/storage/v1/object/public/proofs/', '')
where signature_url like '%/storage/v1/object/public/proofs/%';

comment on column public.stops.proof_url     is 'Chemin dans le bucket privé proofs (<user_id>/<stop_id>/<fichier>), pas une URL';
comment on column public.stops.signature_url is 'Chemin dans le bucket privé proofs (<user_id>/<stop_id>/<fichier>), pas une URL';

notify pgrst, 'reload schema';

-- NB : les fichiers uploadés AVANT cette migration sont rangés sous
-- <stop_id>/<fichier> (sans user_id en tête) : ils ne passent plus les
-- politiques et deviennent illisibles depuis l'app. Voir la requête de
-- diagnostic fournie avec la migration pour les lister.
