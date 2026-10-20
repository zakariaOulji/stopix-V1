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

## Limites d'usage (migration 10)

Les deux fonctions consomment un quota **par livreur et global, par jour** (fuseau Europe/Brussels) avant d'appeler OpenAI / Google. Un appel sans utilisateur connecté (clé anon seule) est refusé (401), un quota atteint renvoie 429.

Ordre de mise en place :

1. Lancer `supabase/migration_10_usage_limits.sql` dans le SQL Editor (crée `api_limits`, `api_usage`, `api_usage_global`, `consume_quota`).
2. Redéployer les deux fonctions (le code partagé `_shared/quota.ts` est embarqué automatiquement) :
   ```bash
   npx supabase functions deploy geocode
   npx supabase functions deploy extract-addresses
   ```
3. Vérifier avec `supabase/tests/quota_test.sql` (tableau PASS/FAIL, ne modifie rien).

Régler les limites sans redéployer :

```sql
select * from public.api_limits;
update public.api_limits set per_user_daily = 30 where kind = 'ai_extract';
```

Voir la consommation du jour :

```sql
select u.kind, p.email, u.count
from public.api_usage u join public.profiles p on p.id = u.user_id
where u.day = (now() at time zone 'Europe/Brussels')::date
order by u.kind, u.count desc;
```

Garde-fous indépendants, à poser aussi : limite de budget mensuelle dans le dashboard OpenAI, quotas journaliers par API + alerte de budget dans Google Cloud.
