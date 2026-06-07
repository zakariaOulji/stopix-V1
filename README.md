# STOPIX

Application mobile pour **livreurs** — tournées optimisées, exécution sur le terrain, preuves de livraison.

> **Frontend complet, 100% mocké.** Zéro backend, zéro réseau : toutes les données viennent de `src/mocks/*`. L'app est entièrement navigable et prête à brancher un vrai backend en un flag (voir [BACKEND.md](BACKEND.md)).

## ✨ Fonctionnalités

- **Auth** — onboarding (3 slides), login, inscription (wizard 3 étapes), mot de passe oublié
- **Dashboard** — KPIs animés, tournée en cours, mini-carte, pull-to-refresh
- **Tournées** — liste, détail, **exécution terrain** (carte plein écran, swipe-to-confirm, échec/report, choix de l'app de navigation)
- **Création de tournée** — wizard 4 étapes + optimisation « IA »
- **Carte** — tous les stops du jour, markers par statut
- **Stats** — graphe hebdomadaire animé, CO₂ économisé
- **Profil** — infos, réglages, déconnexion
- **Persistance** (AsyncStorage) — reste connecté + progression sauvegardée

## 🧱 Stack

- **Expo SDK 54** · React Native 0.81 · Expo Router v6 (file-based)
- **TypeScript** strict
- **Zustand** (state) + persistance AsyncStorage
- **react-native-reanimated** / **gesture-handler** (animations, swipe, bottom sheets)
- **react-native-maps**, **expo-haptics**, **expo-linear-gradient**
- Polices : **Space Grotesk** (titres) + **Inter** (corps)

## 🎨 Design system — « Field OS »

Dark mode only, pensé pour l'extérieur en mouvement. Tokens dans `src/theme/` (couleurs, typo, espacements, ombres). Composants réutilisables dans `src/components/` (Button, Input, Card, Badge, BottomSheet, SwipeConfirm, StopCard, TourneeCard, KpiCard, StopsMap, TabBar, etc.).

## 📁 Structure

```
app/                 # routes (Expo Router)
  (tabs)/            # dashboard · tournees · map · stats · profile
  tournees/[id]/     # détail + execute
  tournees/create/   # wizard de création
  onboarding · login · register · reset-password
src/
  components/        # design system
  theme/             # tokens (colors, typography, spacing, shadows, mapStyle)
  stores/            # Zustand (auth, tournee, ui)
  services/          # couche d'accès données (mock | API)
  api/               # client fetch + token
  config/            # env / flags
  hooks/             # useStats…
  mocks/             # données mockées
  utils/             # format, status, navigation…
  types/             # types du domaine
```

## 🚀 Démarrage

```bash
npm install
npx expo start
```

Puis :
- **`w`** → navigateur (aperçu rapide ; la carte n'y est pas interactive)
- **Expo Go** (Android/iOS) → scanner le QR code. Si le téléphone est en 4G ou derrière un pare-feu : `npx expo start --tunnel`

> ⚠️ Nécessite **Expo Go compatible SDK 54**. Les écrans **carte** ne sont pleinement fonctionnels que sur **mobile** (`react-native-maps` n'a pas de rendu web → fallback stylisé).

### Compte de démo
L'auth est mockée : **n'importe quels identifiants** fonctionnent (pré-remplis sur l'écran de login). Pour repartir de zéro : **Profil → Réinitialiser la démo**.

## 📱 Dev build (cartes réelles + détection des apps de navigation)

Expo Go suffit pour la plupart des écrans, mais un **dev build** est nécessaire pour :
- la carte Google Maps sur Android avec ta propre clé,
- la **détection précise** des apps de navigation installées (Google Maps / Waze / Plans), via la visibilité des schémas d'URL.

La config native est déjà en place :
- `app.json` → `ios.infoPlist.LSApplicationQueriesSchemes` + `android.config.googleMaps.apiKey`
- `plugins/withNavQueries.js` → ajoute les `<queries>` Android (Android 11+)

Étapes :
```bash
# 1. Renseigner la clé Google Maps Android dans app.json (android.config.googleMaps.apiKey)
# 2. Construire et lancer le dev build
npx expo run:android      # nécessite Android Studio / SDK
npx expo run:ios          # nécessite Xcode (macOS)
```
En dev build, le sélecteur de navigation n'affiche que les apps **réellement installées** ; en Expo Go il affiche la liste complète avec fallback web (dégradation gracieuse).

## 🔌 Brancher un backend

Tout passe par une couche `services/` qui bascule sur un flag. Voir **[BACKEND.md](BACKEND.md)** pour le contrat d'API et la marche à suivre :

```bash
cp .env.example .env   # puis EXPO_PUBLIC_USE_MOCKS=false + EXPO_PUBLIC_API_URL=...
```

## 📜 Scripts

| Commande | Effet |
|---|---|
| `npx expo start` | Démarre Metro (dev) |
| `npx expo start --tunnel` | Dev via tunnel (4G / pare-feu) |
| `npx tsc --noEmit` | Vérification TypeScript |
| `npx expo export -p web` | Build web (smoke test du bundle) |
# stopix-V1
