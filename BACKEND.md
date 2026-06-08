# Backend — Supabase

L'app passe des **mocks** à **Supabase** via le flag `EXPO_PUBLIC_USE_MOCKS`. Seule la couche `src/services/*` change ; écrans et stores sont inchangés.

```
écrans → stores (Zustand) → services → ┬─ mocks            (USE_MOCKS=true)
                                        └─ supabase client  (USE_MOCKS=false)
```

## ✅ Déjà fait (code)
- Client : `src/api/supabase.ts` (session persistée dans AsyncStorage)
- Services branchés Supabase : `auth` · `tournee` · `stats` (`src/services/*`)
- Restauration de session au démarrage + chargement des tournées (`app/_layout.tsx`)
- Schéma SQL complet : `supabase/schema.sql`
- Variables d'env : `src/config/env.ts` + `.env.example`

## 🟡 3 étapes manuelles (toi)

### 1. Créer le projet Supabase
- [supabase.com](https://supabase.com) → **New project** (note le mot de passe DB).
- **Settings → API** : copie la **Project URL** et la clé **anon public**.

### 2. Lancer le schéma
- **SQL Editor → New query** → colle tout `supabase/schema.sql` → **Run**.
- **Authentication → Providers → Email** : pour le dev, **désactive "Confirm email"** (sinon l'inscription ne crée pas de session immédiate).

### 3. Renseigner `.env` et activer
```bash
cp .env.example .env
```
```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```
Puis redémarrer Metro avec cache vidé :
```bash
npx expo start --clear
```

## Modèle de données
`profiles` (1-1 avec `auth.users`) · `tournees` (→ user) · `stops` (→ tournee).
Compteurs `stopsCount/deliveredCount/failedCount` calculés à la volée. RLS : chaque livreur ne voit que ses données. Trigger `handle_new_user` crée le profil à l'inscription. Stats via la fonction `get_stats()`.

## Tester
1. **Inscription** depuis l'app → crée `auth.users` + `profiles`.
2. Au début il n'y a **aucune tournée** (normal : la DB est vide). Pour des données de démo, insère quelques `tournees` + `stops` liés à ton `user_id` (SQL Editor), ou via l'écran de création.

## 🔜 Reste à finir (petit glue, optionnel)
- **Création de tournée** : l'écran construit les stops en local. Pour persister dans Supabase, appeler `tourneeService.createTournee({ name, stops })` quand `!USE_MOCKS` au lieu de `addTournee` local.
- **Storage** : bucket pour les photos de preuve de livraison (à ajouter).
- **Realtime** : `supabase.channel('stops')` pour le suivi live (optionnel).
- **Géocodage** des adresses saisies (service externe) — actuellement coords mockées.
