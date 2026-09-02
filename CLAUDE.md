# STOPIX — contexte projet pour Claude Code

App mobile Expo/React Native pour livreurs (tournées optimisées, exécution terrain, preuves de livraison). Stack : Expo SDK 54, React Native 0.81, TypeScript strict, Expo Router v6, Zustand, Supabase (Postgres + Auth + Storage + Edge Functions).

Voir `README.md` et `BACKEND.md` pour le détail technique. Voir **`ROADMAP.md`** pour le plan de finition en cours (priorités, état d'avancement, planning).

## Situation du dépôt

- Ce dossier local est en avance sur `origin` : branche `zakaria/add/photoIa`, avec un gros lot de modifications **non committées** (execute.tsx, tourneeStore.ts, tournee.service.ts, StopCard.tsx, types/index.ts…) qui implémentent la preuve de livraison (photo + signature + géolocalisation via `ProofSheet` / `attachProof`). Ne pas supposer que le code sur GitHub reflète l'état réel — toujours vérifier `git status`/`git diff` avant d'analyser une feature.
- `main` sur GitHub est figé sur le frontend mocké initial. Le vrai backend (auth, tournées, geocoding, extraction IA par photo, preuve de livraison) vit sur `dev` / `zakaria/add/*` et n'est pas mergé.
- `.env` contient de vrais identifiants Supabase (URL + clé anon) et est suivi par git sur certaines branches — à corriger (voir ROADMAP, section sécurité).

## Repères utiles

- `src/services/*.service.ts` : bascule mock ↔ Supabase via `EXPO_PUBLIC_USE_MOCKS`.
- `supabase/schema.sql` + migrations : RLS posée par utilisateur (`auth.uid()`), fonction `get_stats()` pour le dashboard.
- `supabase/functions/geocode` et `extract-addresses` : edge functions qui protègent les clés Google Places / OpenAI côté serveur, mais sans limite d'usage par utilisateur pour l'instant.
- `src/utils/optimize.ts` : l'« optimisation IA » de tournée est en réalité un algorithme classique plus-proche-voisin + 2-opt (pas de ML), à ne pas présenter comme prédictif.
