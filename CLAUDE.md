# STOPIX — contexte projet pour Claude Code

App mobile Expo/React Native pour livreurs (tournées optimisées, exécution terrain, preuves de livraison). Stack : Expo SDK 54, React Native 0.81, TypeScript strict, Expo Router v6, Zustand, Supabase (Postgres + Auth + Storage + Edge Functions).

Voir `README.md` et `BACKEND.md` pour le détail technique. Voir **`ROADMAP.md`** pour le plan de finition en cours (priorités, état d'avancement, planning).

## Situation du dépôt

- Au 19 oct. 2026, `dev` = `zakaria/feat/web-app` (fast-forward) : preuve de livraison, bucket de preuves privé, web app phase 1 (voir `WEB_MIGRATION.md`), retours vrac/sacs, historique des livraisons. Toujours vérifier `git status`/`git diff` avant d'analyser une feature.
- `package.json` a un changement local non committé (scripts `android`/`ios` → `expo run:*`) qui ne vient pas d'une session Claude : ne pas l'inclure dans les commits sans demander.
- `main` sur GitHub reste figé sur le frontend mocké initial : le vrai backend (auth, tournées, geocoding, extraction IA par photo, preuve de livraison) vit sur `dev` et n'est pas mergé dans `main`.
- Base Supabase : migrations à appliquer à la main dans le SQL Editor, numérotées `supabase/migration_N_*.sql`. Appliquées jusqu'à la **#9** (`migration_9_delivery_history.sql`, 19 oct.). Une nouvelle colonne référencée par le code doit être migrée AVANT de déployer ce code, sinon les écritures sur `stops` échouent.
- Historique des livraisons : table `deliveries` remplie par trigger sur `stops` (pas par l'app), lecture seule côté client.
- `.env` contient de vrais identifiants Supabase (URL + clé anon) et est suivi par git sur certaines branches — à corriger (voir ROADMAP, section sécurité).

## Repères utiles

- `src/services/*.service.ts` : bascule mock ↔ Supabase via `EXPO_PUBLIC_USE_MOCKS`.
- `supabase/schema.sql` + migrations : RLS posée par utilisateur (`auth.uid()`), fonction `get_stats()` pour le dashboard.
- `supabase/functions/geocode` et `extract-addresses` : edge functions qui protègent les clés Google Places / OpenAI côté serveur, mais sans limite d'usage par utilisateur pour l'instant.
- `src/utils/optimize.ts` : l'« optimisation IA » de tournée est en réalité un algorithme classique plus-proche-voisin + 2-opt (pas de ML), à ne pas présenter comme prédictif.
