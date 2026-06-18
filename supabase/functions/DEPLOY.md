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

## Fonction `extract-addresses` (OpenAI GPT-4o vision)

```bash
# Clé OpenAI en secret
npx supabase secrets set OPENAI_API_KEY=sk-...VOTRE_CLE

# Déployer
npx supabase functions deploy extract-addresses
```

Extrait les adresses (+ destinataire / téléphone / colis / vrac) d'une photo de feuille de route.

## Vérifier
- Dashboard Supabase → **Edge Functions** → `geocode` doit apparaître (déployée).
- Dans l'app (avec `EXPO_PUBLIC_USE_MOCKS=false`), tape une adresse dans la création de tournée → des suggestions doivent apparaître.

## Notes
- `verify_jwt` est activé par défaut : l'app envoie automatiquement le token de l'utilisateur connecté.
- Côté Google Cloud, active **Places API** + **Geocoding API** + **Directions API** sur la clé.
  (La fonction `geocode` gère l'autocomplétion, le géocodage ET le tracé d'itinéraire.)
- **Après chaque modif du code de la fonction, redéploie** : `npx supabase functions deploy geocode`.
