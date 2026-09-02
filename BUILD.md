# Déployer une version de test (iOS + Android) avec EAS Build

EAS Build construit l'app dans le cloud (pas besoin de Mac pour iOS).

## Prérequis
- **Compte Expo** (gratuit) → https://expo.dev
- **iOS** : un **compte Apple Developer** (99 $/an) pour distribuer sur TestFlight.
- **Android** : une **clé Google Maps Android** (active "Maps SDK for Android" sur ta clé Google Cloud), à mettre dans `app.json` → `android.config.googleMaps.apiKey` (remplace `YOUR_ANDROID_GOOGLE_MAPS_API_KEY`).
  - iOS n'a pas besoin de clé : il utilise Apple Plans par défaut.

## Setup (une fois)
```bash
# Connexion EAS (ouvre le navigateur)
npx eas-cli login
```
`eas.json` est déjà configuré (profils `preview` + `production`, avec `USE_MOCKS=false` et les clés Supabase).
> Vérifie que `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans `eas.json` correspond bien à celle de ton `.env`.

## 📱 Android — APK de test (le plus simple)
```bash
npx eas-cli build -p android --profile preview
```
- À la 1re fois : EAS propose de générer un **keystore** → accepte.
- À la fin : un **lien de téléchargement** du `.apk` → installe-le sur n'importe quel Android (active "sources inconnues").

## 🍎 iOS — TestFlight
```bash
npx eas-cli build -p ios --profile production
```
- EAS demande tes identifiants **Apple Developer** et gère les certificats automatiquement.
- Puis envoie le build à TestFlight :
```bash
npx eas-cli submit -p ios --latest
```
- Dans **App Store Connect → TestFlight**, ajoute tes testeurs (par email) → ils reçoivent une invitation.

## Les deux d'un coup
```bash
npx eas-cli build --platform all --profile preview   # iOS (ad hoc) + Android (apk)
```
> Pour iOS en **ad hoc** (sans TestFlight), il faut enregistrer les appareils : `npx eas-cli device:create`. TestFlight est plus simple pour distribuer.

## ⚠️ Limites de cette version de test
- Le **tracé routier** des cartes suit les vraies routes seulement si la fonction `geocode` est redéployée + **Directions API** activée (sinon lignes droites).
- L'**import photo IA** marche seulement si la fonction `extract-addresses` est déployée (`npx supabase functions deploy extract-addresses` + secret `OPENAI_API_KEY`).
- Sur **Android**, la carte reste grise si la clé Google Maps Android n'est pas renseignée dans `app.json`.

## Mettre à jour le code sans rebuild (OTA)
Après un premier build, tu peux pousser des corrections JS sans rebuilder :
```bash
npx eas-cli update --branch preview
```
