-- STOPIX — test d'isolation du bucket `proofs` (après migration_7)
-- À lancer dans Supabase → SQL Editor. Ne modifie rien : tout est annulé (rollback).
--
-- Prérequis : deux comptes de test A et B, chacun ayant uploadé au moins une
-- preuve depuis l'app (pour que B ait des fichiers que A pourrait viser).
-- Remplace les deux UUID ci-dessous (Authentication → Users → User UID).
--
-- Résultat attendu : uniquement des lignes « PASS » dans l'onglet Messages/Notices.

begin;

do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';  -- ← UID de l'utilisateur A
  b uuid := '00000000-0000-0000-0000-00000000000b';  -- ← UID de l'utilisateur B
  n int;
begin
  -- Pré-check (en tant que postgres) : B doit avoir des fichiers, sinon le test ne prouve rien.
  select count(*) into n from storage.objects
  where bucket_id = 'proofs' and (storage.foldername(name))[1] = b::text;
  if n = 0 then
    raise exception 'B n''a aucun fichier dans proofs : fais une livraison avec photo depuis le compte B d''abord';
  end if;
  raise notice 'B possède % fichier(s) dans proofs', n;

  -- Bucket privé
  if (select public from storage.buckets where id = 'proofs') then
    raise notice 'FAIL bucket proofs encore public';
  else
    raise notice 'PASS bucket proofs privé';
  end if;

  -- On devient A
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- 1. A ne voit aucun fichier de B
  select count(*) into n from storage.objects
  where bucket_id = 'proofs' and (storage.foldername(name))[1] = b::text;
  raise notice '% A lit les fichiers de B : % visible(s)', case when n = 0 then 'PASS' else 'FAIL' end, n;

  -- 2. A ne voit que son propre dossier
  select count(*) into n from storage.objects
  where bucket_id = 'proofs' and (storage.foldername(name))[1] <> a::text;
  raise notice '% A voit des fichiers hors de son dossier : %', case when n = 0 then 'PASS' else 'FAIL' end, n;

  -- 3. A ne peut pas écrire dans le dossier de B
  begin
    insert into storage.objects (bucket_id, name) values ('proofs', b::text || '/stop-test/hack.jpg');
    raise notice 'FAIL A a pu créer un fichier dans le dossier de B';
  exception when insufficient_privilege then
    raise notice 'PASS A ne peut pas écrire dans le dossier de B';
  end;

  -- 4. A ne peut pas écrire à la racine du bucket (ancien format <stop_id>/...)
  begin
    insert into storage.objects (bucket_id, name) values ('proofs', 'stop-test/hack.jpg');
    raise notice 'FAIL A a pu écrire hors de son dossier';
  exception when insufficient_privilege then
    raise notice 'PASS A ne peut pas écrire hors de son dossier';
  end;

  -- 5. A ne peut pas modifier (renommer / déplacer) un fichier de B
  update storage.objects set name = a::text || '/vole.jpg'
  where bucket_id = 'proofs' and (storage.foldername(name))[1] = b::text;
  get diagnostics n = row_count;
  raise notice '% A modifie les fichiers de B : % ligne(s)', case when n = 0 then 'PASS' else 'FAIL' end, n;

  -- 6. A ne peut pas déplacer son propre fichier vers le dossier de B
  begin
    insert into storage.objects (bucket_id, name) values ('proofs', a::text || '/stop-test/mien.jpg');
    update storage.objects set name = b::text || '/stop-test/mien.jpg'
    where bucket_id = 'proofs' and name = a::text || '/stop-test/mien.jpg';
    raise notice 'FAIL A a pu déplacer un fichier vers le dossier de B';
  exception when insufficient_privilege then
    raise notice 'PASS A ne peut pas déplacer un fichier vers le dossier de B';
  end;

  -- 7. Contrôle positif : A peut écrire dans son propre dossier
  begin
    insert into storage.objects (bucket_id, name) values ('proofs', a::text || '/stop-test/ok.jpg');
    raise notice 'PASS A peut écrire dans son propre dossier';
  exception when insufficient_privilege then
    raise notice 'FAIL A ne peut pas écrire dans son propre dossier (policy trop stricte)';
  end;
end $$;

rollback;
