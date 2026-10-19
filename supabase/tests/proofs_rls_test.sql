-- STOPIX — test d'isolation du bucket `proofs` (après migration_7)
-- À lancer dans Supabase → SQL Editor. Ne modifie rien : chaque écriture de
-- test est annulée (sous-transaction), et la fonction de test est temporaire.
--
-- Prérequis : deux comptes de test A et B, B ayant au moins une preuve
-- uploadée depuis l'app (sinon le test ne prouve rien).
--
-- Usage : remplace les deux UUID dans le SELECT tout en bas
-- (Authentication → Users → User UID), puis lance tout le fichier.
-- Résultat : un tableau, une ligne par test, colonne `etat` = PASS / FAIL.
-- (Le SQL Editor n'affiche pas les RAISE NOTICE, d'où le tableau.)

create or replace function pg_temp.proofs_rls_test(a uuid, b uuid)
returns table (test text, etat text, detail text)
language plpgsql
as $$
declare
  n int;
begin
  -- Pré-checks, en tant que postgres
  select count(*) into n from storage.objects
  where bucket_id = 'proofs' and (storage.foldername(name))[1] = b::text;
  test := 'Pré-requis : B a des fichiers'; etat := case when n > 0 then 'PASS' else 'FAIL' end;
  detail := n || ' fichier(s) de B' || case when n = 0 then ' — fais une livraison avec photo depuis B' else '' end;
  return next;

  select count(*) into n from storage.buckets where id = 'proofs' and not public;
  test := 'Bucket proofs privé'; etat := case when n = 1 then 'PASS' else 'FAIL' end; detail := null;
  return next;

  -- On devient A pour la suite
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  -- 1. Lecture des fichiers de B
  select count(*) into n from storage.objects
  where bucket_id = 'proofs' and (storage.foldername(name))[1] = b::text;
  test := 'A ne voit pas les fichiers de B'; etat := case when n = 0 then 'PASS' else 'FAIL' end;
  detail := n || ' visible(s)'; return next;

  -- 2. A ne voit que son dossier
  select count(*) into n from storage.objects
  where bucket_id = 'proofs' and (storage.foldername(name))[1] <> a::text;
  test := 'A ne voit rien hors de son dossier'; etat := case when n = 0 then 'PASS' else 'FAIL' end;
  detail := n || ' visible(s)'; return next;

  -- 3. Écriture dans le dossier de B
  test := 'A ne peut pas écrire chez B';
  begin
    insert into storage.objects (bucket_id, name) values ('proofs', b::text || '/stop-test/hack.jpg');
    raise exception using errcode = 'P0001', message = 'undo';
  exception
    when insufficient_privilege then etat := 'PASS'; detail := 'refusé par RLS';
    when sqlstate 'P0001' then etat := 'FAIL'; detail := 'insert accepté (annulé)';
    when others then etat := '?'; detail := SQLERRM;
  end;
  return next;

  -- 4. Écriture hors de tout dossier utilisateur (ancien format <stop_id>/…)
  test := 'A ne peut pas écrire hors de son dossier';
  begin
    insert into storage.objects (bucket_id, name) values ('proofs', 'stop-test/hack.jpg');
    raise exception using errcode = 'P0001', message = 'undo';
  exception
    when insufficient_privilege then etat := 'PASS'; detail := 'refusé par RLS';
    when sqlstate 'P0001' then etat := 'FAIL'; detail := 'insert accepté (annulé)';
    when others then etat := '?'; detail := SQLERRM;
  end;
  return next;

  -- 5. Modification / déplacement d'un fichier de B
  test := 'A ne peut pas modifier les fichiers de B';
  begin
    update storage.objects set name = a::text || '/vole.jpg'
    where bucket_id = 'proofs' and (storage.foldername(name))[1] = b::text;
    get diagnostics n = row_count;
    raise exception using errcode = 'P0001', message = 'undo';
  exception
    when sqlstate 'P0001' then
      etat := case when n = 0 then 'PASS' else 'FAIL' end; detail := n || ' ligne(s) modifiée(s)';
    when others then etat := '?'; detail := SQLERRM;
  end;
  return next;

  -- 6. Déplacement d'un de ses fichiers vers le dossier de B
  test := 'A ne peut pas déplacer un fichier chez B';
  begin
    insert into storage.objects (bucket_id, name) values ('proofs', a::text || '/stop-test/mien.jpg');
    update storage.objects set name = b::text || '/stop-test/mien.jpg'
    where bucket_id = 'proofs' and name = a::text || '/stop-test/mien.jpg';
    raise exception using errcode = 'P0001', message = 'undo';
  exception
    when insufficient_privilege then etat := 'PASS'; detail := 'refusé par RLS';
    when sqlstate 'P0001' then etat := 'FAIL'; detail := 'déplacement accepté (annulé)';
    when others then etat := '?'; detail := SQLERRM;
  end;
  return next;

  -- 7. Contrôle positif : écriture dans son propre dossier
  test := 'A peut écrire dans son dossier (contrôle)';
  begin
    insert into storage.objects (bucket_id, name) values ('proofs', a::text || '/stop-test/ok.jpg');
    raise exception using errcode = 'P0001', message = 'undo';
  exception
    when sqlstate 'P0001' then etat := 'PASS'; detail := 'accepté (annulé)';
    when insufficient_privilege then etat := 'FAIL'; detail := 'refusé : policy trop stricte';
    when others then etat := '?'; detail := SQLERRM;
  end;
  return next;

  perform set_config('role', 'postgres', true);
end;
$$;

--                              ↓ UID de A                              ↓ UID de B
select * from pg_temp.proofs_rls_test('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
