# Déployer les Edge Functions STOPIX

Les Edge Functions gardent les clés API (Google, OpenAI) **côté serveur** — jamais dans l'app.
On utilise le Supabase CLI via `npx` (aucune installation globale, pas de Docker pour déployer).

## Prérequis (une seule fois)

```bash
# 1. Se connecter (ouvre le navigateur)
npx supabase login

# 2. Lier le projet (ref visible dans l'URL du dashboard / Settings)
npx supabase link --project-ref wxivfmoqkgwjgoytzznj
```

## Fonction `geocode` (Google Places)

```bash
# 3. Enregistrer la clé Google (Places API + Geocoding API activées)
npx supabase secrets set GOOGLE_PLACES_KEY=VOTRE_CLE_GOOGLE

# 4. Déployer
npx supabase functions deploy geocode
```

## (Plus tard) Fonction `extract-addresses` (OpenAI)
```bash
npx supabase secrets set OPENAI_API_KEY=VOTRE_CLE_OPENAI
npx supabase functions deploy extract-addresses
```

## Vérifier
- Dashboard Supabase → **Edge Functions** → `geocode` doit apparaître (déployée).
- Dans l'app (avec `EXPO_PUBLIC_USE_MOCKS=false`), tape une adresse dans la création de tournée → des suggestions doivent apparaître.

## Notes
- `verify_jwt` est activé par défaut : l'app envoie automatiquement le token de l'utilisateur connecté.
- Côté Google Cloud, active **Places API** ET **Geocoding API** sur la clé.
- Redéployer après modif du code : relancer `npx supabase functions deploy geocode`.
