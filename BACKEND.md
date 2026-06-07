# Brancher le backend

L'app est conçue pour passer des **mocks** au **vrai backend** sans toucher aux écrans ni aux stores.

```
écrans → stores (Zustand) → services → ┬─ mocks        (EXPO_PUBLIC_USE_MOCKS=true)
                                        └─ api client → backend (USE_MOCKS=false)
```

## 1. Basculer en mode réel

```bash
cp .env.example .env
```
Puis dans `.env` :
```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_API_URL=https://votre-api.com
```
Redémarrer Metro avec cache vidé : `npx expo start --clear`.

C'est tout côté app : chaque service (`src/services/*.ts`) bascule automatiquement sur le client HTTP.

## 2. Couches

| Fichier | Rôle |
|---|---|
| `src/config/env.ts` | Lit les vars `EXPO_PUBLIC_*` + flag `USE_MOCKS` |
| `src/api/client.ts` | Wrapper `fetch` : URL de base, header `Authorization: Bearer`, timeout, `ApiError` typée |
| `src/api/authToken.ts` | Stockage du token (mémoire + AsyncStorage). _Prod : préférer `expo-secure-store`._ |
| `src/services/*.service.ts` | 1 méthode = branche mock **ou** appel API + mapping DTO→domaine |
| `src/hooks/useStats.ts` | Stats via le service |

## 3. Contrat d'API attendu

| Méthode | Endpoint | Réponse |
|---|---|---|
| `POST` | `/auth/login` | `{ user: UserDTO, token }` |
| `POST` | `/auth/register` | `{ user: UserDTO, token }` |
| `GET` | `/auth/me` | `UserDTO` |
| `POST` | `/auth/logout` | — |
| `GET` | `/tournees` | `Tournee[]` |
| `GET` | `/tournees/:id/stops` | `Stop[]` |
| `POST` | `/tournees` | `{ tournee, stops }` |
| `POST` | `/tournees/:id/start` | — |
| `PATCH`| `/stops/:id` | `{ status, failureReason?, completedAt? }` |
| `GET` | `/stats` | `Stats` |

`UserDTO` est en `snake_case` (`full_name`, `avatar_url`…) et mappé vers le type `User` dans `auth.service.ts`. Les autres réponses suivent déjà les types de `src/types/index.ts` (ajouter un mapper si le backend diffère).

## 4. Reste à faire au branchement

- **Auth** : déjà câblée (login/register/logout/token). `me()` dispo pour restaurer une session via le token persisté.
- **Tournées** : lecture via `tourneeStore.load()` (à appeler au montage des écrans), écritures (`markDelivered`/`markFailed`/`skipStop`/`startTournee`) déjà poussées au serveur (no-op en mock).
- **Création** : l'écran construit les stops localement en mock ; en réel, faire passer par `tourneeService.createTournee(payload)`.
- **Refresh tokens / 401** : ajouter un intercepteur dans `client.ts` (refresh + retry) si l'API utilise des tokens courts.
- **SecureStore** : remplacer AsyncStorage par `expo-secure-store` dans `authToken.ts` pour la prod (attention : pas de support web).
