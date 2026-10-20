-- STOPIX — test de consume_quota (après migration_10)
-- À lancer dans Supabase → SQL Editor. Ne modifie rien : limites et compteurs
-- de test sont annulés à la fin (sous-transaction), la fonction est temporaire.
--
-- Usage : mets deux UID d'utilisateurs existants (Authentication → Users) dans
-- le SELECT tout en bas, puis lance tout le fichier.
-- Résultat : un tableau, une ligne par test, colonne `etat` = PASS / FAIL.

create or replace function pg_temp.quota_test(a uuid, b uuid)
returns table (test text, etat text, detail text)
language plpgsql
as $$
declare
  names   text[] := '{}';
  states  text[] := '{}';
  details text[] := '{}';
  r       json;
  today   date := (now() at time zone 'Europe/Brussels')::date;
  n       int;

begin
  begin
    -- Limites minuscules + compteurs du jour remis à zéro (tout est annulé à la fin)
    update public.api_limits set per_user_daily = 2, global_daily = 3 where kind = 'ai_extract';
    delete from public.api_usage where day = today and kind = 'ai_extract';
    delete from public.api_usage_global where day = today and kind = 'ai_extract';

    -- Utilisateur A : 2 appels acceptés, le 3e refusé (limite par utilisateur)
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    r := public.consume_quota('ai_extract');
    names := names || 'A : 1er appel accepté'::text; states := states || case when (r->>'allowed')::bool then 'PASS' else 'FAIL' end; details := details || r::text;
    r := public.consume_quota('ai_extract');
    names := names || 'A : 2e appel accepté'::text; states := states || case when (r->>'allowed')::bool and (r->>'used')::int = 2 then 'PASS' else 'FAIL' end; details := details || r::text;
    r := public.consume_quota('ai_extract');
    names := names || 'A : 3e appel refusé (limite livreur)'::text; states := states || case when not (r->>'allowed')::bool and r->>'scope' = 'user' then 'PASS' else 'FAIL' end; details := details || r::text;

    -- Utilisateur B : 1 appel accepté (global = 3), le suivant refusé (limite globale)
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    r := public.consume_quota('ai_extract');
    names := names || 'B : 1er appel accepté'::text; states := states || case when (r->>'allowed')::bool then 'PASS' else 'FAIL' end; details := details || r::text;
    r := public.consume_quota('ai_extract');
    names := names || 'B : 2e appel refusé (limite globale)'::text; states := states || case when not (r->>'allowed')::bool and r->>'scope' = 'global' then 'PASS' else 'FAIL' end; details := details || r::text;

    -- Les refus n'ont rien consommé
    select count into n from public.api_usage where user_id = a and day = today and kind = 'ai_extract';
    names := names || 'Compteur A = 2'::text; states := states || case when n = 2 then 'PASS' else 'FAIL' end; details := details || coalesce(n::text, 'null');
    select count into n from public.api_usage where user_id = b and day = today and kind = 'ai_extract';
    names := names || 'Compteur B = 1'::text; states := states || case when n = 1 then 'PASS' else 'FAIL' end; details := details || coalesce(n::text, 'null');
    select count into n from public.api_usage_global where day = today and kind = 'ai_extract';
    names := names || 'Compteur global = 3'::text; states := states || case when n = 3 then 'PASS' else 'FAIL' end; details := details || coalesce(n::text, 'null');

    -- Un coût supérieur à la limite est refusé sans laisser de trace
    update public.api_limits set per_user_daily = 100, global_daily = 100 where kind = 'maps';
    delete from public.api_usage_global where day = today and kind = 'maps';
    r := public.consume_quota('maps', 500);
    select coalesce(sum(count), 0) into n from public.api_usage_global where day = today and kind = 'maps';
    names := names || 'Coût > limite refusé, rien consommé'::text; states := states || case when not (r->>'allowed')::bool and n = 0 then 'PASS' else 'FAIL' end; details := details || (r::text || ' / global=' || n);

    -- Sans utilisateur (clé anon seule) : refusé
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    r := public.consume_quota('ai_extract');
    names := names || 'Sans utilisateur : refusé'::text; states := states || case when not (r->>'allowed')::bool and r->>'scope' = 'auth' then 'PASS' else 'FAIL' end; details := details || r::text;

    raise exception using errcode = 'P0001', message = 'undo';
  exception
    when sqlstate 'P0001' then null; -- tout est annulé
    when others then
      names := names || 'Erreur inattendue'::text; states := states || '?'::text; details := details || SQLERRM;
  end;

  for i in 1 .. coalesce(array_length(names, 1), 0) loop
    test := names[i]; etat := states[i]; detail := details[i];
    return next;
  end loop;
end;
$$;

--                        ↓ UID d'un utilisateur A                 ↓ UID d'un utilisateur B
select * from pg_temp.quota_test('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
