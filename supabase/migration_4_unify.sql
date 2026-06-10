-- STOPIX — migration #4 : unification (une seule entité "Tournée", réutilisable)
-- À lancer dans Supabase → SQL Editor.
--
-- On abandonne le système de "modèles" séparé : la tournée elle-même est
-- réutilisable (reset sur place). On repart d'une base propre (données de test).

-- 1. Vider les tournées de test (les stops partent en cascade)
delete from public.tournees;

-- 2. Supprimer les tables de modèles (plus utilisées)
drop table if exists public.template_stops;
drop table if exists public.tournee_templates;

notify pgrst, 'reload schema';
