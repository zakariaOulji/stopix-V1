# STOPIX — Passage en web app mobile-first

Objectif : n'importe quel chauffeur peut s'inscrire et lancer une tournée en quelques clics depuis son navigateur, sans rien télécharger, pour une phase de test.

## État au 17 oct. 2026

`npx expo export --platform web` **compile déjà** (bundle ~3,1 Mo). `react-native-web` est installé et `StopsMap.web.tsx` existe. Ce qui manque, c'est que l'app se comporte correctement sur le web.

## Blocages (phase 1 : rendre l'app utilisable sur web)

1. **`Alert.alert` ne fait rien sur web** (no-op dans react-native-web). Les choix et confirmations sont donc morts : déconnexion, suppression de tournée, choix caméra/galerie (`tournees/create`), confirmation dans `execute.tsx`, reset démo. → créer un helper `confirm()`/`choose()` multiplateforme (modal maison ou `window.confirm`) et remplacer les appels.
2. **Upload des preuves** : `src/services/storage.service.ts` passe par `expo-file-system` (`uploadAsync`, `cacheDirectory`), qui n'existe pas sur web. → sur web, `fetch(uri) → blob` (ou un Blob depuis le base64/SVG) puis `supabase.storage.from('proofs').upload(path, blob)`.
3. **Liens de navigation** : `src/utils/navigation.ts` ouvre d'abord `comgooglemaps://` / `waze://`. Sur web, `Linking.openURL` ne lève pas d'erreur si l'app est absente, donc le repli ne se déclenche jamais. → sur web, utiliser directement les URLs https (`google.com/maps/dir/...`, `waze.com/ul?...`), qui ouvrent l'app si elle est installée.
4. **Auth Supabase** : `detectSessionInUrl: false` dans `src/api/supabase.ts` casse les liens de confirmation d'email et de reset password sur web. → `true` sur web, et configurer Site URL + Redirect URLs dans Supabase. Pour un parcours « en quelques clics », envisager de désactiver la confirmation email pendant la bêta.

### Avancement phase 1 (17 oct. 2026, branche `zakaria/feat/web-app`)

Code fait, typecheck + tests + `expo export --platform web` OK, **pas encore testé dans un navigateur** :

- [x] 1. `showAlert()` (`src/utils/dialog.ts`) : même signature qu'`Alert.alert`, OS natif sur mobile, modale `DialogHost` sur web. Les 21 appels `Alert.alert` sont remplacés (y compris les simples messages d'erreur, eux aussi muets sur web).
- [x] 2. `uploadProof` sur web : Blob + `supabase.storage.upload`, même chemin `<user_id>/<stop_id>/…`.
- [x] 3. `openNavigation` sur web : liens https directs (`window.open`, repli sur la navigation en place si popup bloqué) ; « Autre app… » (`geo:`) masqué sur web.
- [x] 4. `detectSessionInUrl` à `true` sur web, `emailRedirectTo = window.location.origin` à l'inscription. Corrigé au passage : avec confirmation email activée, l'inscription connectait l'utilisateur sans session ; elle renvoie maintenant vers la connexion avec un message.
- [ ] Côté Supabase (à faire à la main) : Auth → URL Configuration → Site URL + Redirect URLs. Ajouter pour chaque environnement l'origine **et** `/update-password` (ex. `http://localhost:8081/**`).
- [ ] Test navigateur de bout en bout (inscription, mot de passe oublié, livraison avec photo/signature, navigation), dont iPhone Safari (ouverture caméra après demande de permission).
- [x] Mot de passe oublié (18 oct.) : `reset-password.tsx` envoie le vrai email (`resetPasswordForEmail`, redirection `/update-password` sur web) ; nouvel écran `app/update-password.tsx` (nouveau mot de passe 8+ caractères, « lien invalide ou expiré » sinon). Un lien qui retombe sur la Site URL est redirigé vers `/update-password`.

## Phase 2 : expérience et mise en ligne

5. **Vraie carte** : `StopsMap.web.tsx` dessine une fausse carte stylisée, sans fond de carte. → Leaflet + OpenStreetMap (gratuit) ou Google Maps JS (clé déjà côté Google).
   - [x] 18 oct. : fait avec Leaflet + tuiles OpenStreetMap assombries par filtre CSS (CARTO exige désormais une clé). Mêmes props que la carte native, cadrage automatique sur les arrêts, arrêts à la même adresse écartés en éventail, position live + bouton recentrer. Les tuiles OSM publiques sont tolérées pour une bêta mais leur politique d'usage interdit un trafic important : passer à un fournisseur avec clé (MapTiler / Stadia / Google Maps JS) avant ouverture large.
6. **PWA + hébergement** : manifest, icônes, `theme-color`, « Ajouter à l'écran d'accueil », safe areas iOS, largeur max ~480 px sur desktop. Héberger en HTTPS (obligatoire pour la géoloc et la caméra) : EAS Hosting (`eas deploy`) ou Vercel/Netlify avec rewrite SPA. Variables `EXPO_PUBLIC_*` à définir côté build (sinon `USE_MOCKS` vaut `true` par défaut).
   - [x] 27 oct. : PWA (`public/manifest.json`, `public/index.html` : theme-color, balises iOS, `viewport-fit=cover`, largeur max 480 px sur desktop), icônes provisoires « S. » aux couleurs de l'app (`public/icons/`, à remplacer par un vrai logo). Vérifié dans Edge : manifest sans erreur, **installable**. Pas de service worker (risque de cache figé ; à envisager avec la file hors ligne).
   - [x] Sortie `single` conservée : `static` casse au build (Supabase / AsyncStorage / Leaflet exécutés côté Node sans `window`).
   - [x] 27 oct. : 1er déploiement d'aperçu EAS Hosting (projet EAS `9d98e8e9-…`, sous-domaine `stopix`). Vérifié : toutes les URL profondes servent l'app (pas de 404), manifest + icônes servis, installable en HTTPS, build branché sur Supabase (formulaire de connexion vide).
   - [ ] Supabase → Auth → URL Configuration : Site URL `https://stopix.expo.app` + Redirect URLs, puis `node scripts/deploy-web.mjs --prod`.

## Avant d'ouvrir l'inscription publique

- **Rate limiting** sur les edge functions `geocode` et `extract-addresses` : avec une inscription ouverte, n'importe qui peut consommer les crédits OpenAI / Google. Déjà dans ROADMAP (Semaine 2).
- Mot de passe 8+ caractères côté Supabase.

## Sans souci sur web

`expo-haptics` (no-op), `expo-location` (API Geolocation, HTTPS requis), `expo-image-picker` (`<input type=file capture>`), `expo-image-manipulator` (canvas), AsyncStorage (localStorage), SignaturePad (PanResponder + SVG, à tester au doigt sur mobile).

## Note dépôt

Le travail bucket privé est commité localement sur `zakaria/fix/private-proofs` (`eae67b3`, non poussé). La phase 1 web part de ce commit, sur `zakaria/feat/web-app`.
