# STOPIX — Plan de finition

Issu de l'analyse business / UX / fonctionnelle / sécurité / scalabilité du 27 août 2026 (rapport complet + plan interactif : demander le lien à Claude si besoin). Rythme visé : ~10h/semaine (soirs de semaine + week-end), sur 7 semaines à partir du 31 août 2026.

**Mise à jour du 2 sept. 2026** : en comparant ce plan au dépôt local (branche `zakaria/add/photoIa`), la preuve de livraison (photo + signature + géolocalisation, via un nouveau composant `ProofSheet` et `attachProof` dans le store) est **déjà en cours d'implémentation**, non committée. La Semaine 1 ci-dessous est donc à vérifier/finir plutôt qu'à démarrer de zéro — ajuste les cases cochées en conséquence.

## Ordre de priorité (ne pas changer)

1. **Bloquant avant utilisateurs réels** — la preuve de livraison est l'argument produit n°1 du document de vision, elle doit être solide avant tout le reste.
2. **Fiabilité** — plus aucune perte silencieuse de données côté serveur.
3. **Roadmap produit** — communication client, re-planification après échec, première brique du modèle économique.

## Semaine 1 (31 août – 6 sept.) — Preuve de livraison : vérifier / finir
- [x] Vérifier que le schéma Supabase a bien les colonnes proof_url / signature_url / lat / lng / delivered_at côté `stops` (migration à écrire si pas encore fait en base, même si le code les référence déjà) — ✅ 6 oct. : manquaient proof_lat/proof_lng/delivered_at (ancienne version de la #5 appliquée), corrigé par `migration_6_proof_gps.sql`
- [x] Policies RLS sur le bucket Supabase Storage des preuves — ✅ 6 oct. : bucket `proofs` + policies présents (lecture publique à durcir, cf. sécurité)
- [ ] Vérifier le flux `ProofSheet` → `attachProof` → upload Storage → écriture `proof_url`/`signature_url` en base de bout en bout
- [x] Capture GPS au moment de la confirmation — confirmer qu'elle est bien envoyée au serveur, pas seulement affichée localement — ✅ 6 oct. : proof_lat/proof_lng/delivered_at bien écrits en base
- [ ] Tester sur device réel (pas seulement Expo Go web) : permissions caméra + localisation

## Semaine 2 (7 – 13 sept.) — Clôture preuve de livraison + verrous sécurité
- [ ] Afficher la preuve (photo + signature + heure + GPS) dans le détail de tournée
- [ ] Rate limiting sur les edge functions `geocode` + `extract-addresses` (compteur par utilisateur/jour)
- [ ] Purger `.env` de l'historique git + rotation de la clé Supabase + `.gitignore`
- [ ] Durcir la politique de mot de passe côté projet Supabase de production (8+ caractères)
- [ ] Committer le travail en cours par petits commits propres (le diff actuel est trop gros pour une seule review)

## Semaine 3 (14 – 20 sept.) — Test de charge, clôture du bloquant
- [ ] Script de charge k6 : login → tournées → confirmation d'arrêt → `get_stats`
- [ ] Exécuter contre un projet Supabase de staging + lire les métriques (latence, connexions, erreurs 5xx)
- [ ] Documenter le palier de rupture trouvé
- [ ] Démarrer la migration du token vers `expo-secure-store`
- [ ] Concevoir la file locale (outbox) pour les actions en attente
- **Jalon : Étape 1 terminée** — l'app tient sa promesse P0 et les failles connues sont fermées.

## Semaine 4 (21 – 27 sept.) — Fiabilité terrain
- [ ] Finir la migration `expo-secure-store` (fallback web)
- [ ] Retry automatique au retour réseau
- [ ] Indicateur visuel « en attente d'envoi » sur `StopCard`
- [ ] Tests manuels en mode avion
- [ ] Intercepter les échecs (`markDelivered`/`markFailed`/`skipStop`) → mise en file d'attente
- [ ] Merge `dev` / `zakaria/add/photoIa` → `main` : revue du diff

## Semaine 5 (28 sept. – 4 oct.) — Clôture fiabilité, démarrage roadmap
- [ ] Merge → `main` : tests complets + mise à jour du README (retirer « zéro backend »)
- [ ] CI : scan de secrets (gitleaks) + audit des dépendances
- [ ] Communication client : choisir le provider (Twilio / WhatsApp Business)
- [ ] Communication client : edge function d'envoi
- [ ] Communication client : déclenchement à l'étape clé (ETA / confirmation 1 clic)
- **Jalon : Étape 2 terminée** — plus de perte silencieuse de données, `main` reflète le vrai backend.

## Semaine 6 (5 – 11 oct.) — Communication client
- [ ] Finir le déclenchement (ETA / confirmation)
- [ ] Gestion des erreurs d'envoi
- [ ] Templates de message + traduction basique
- [ ] Tests avec un vrai numéro / compte test
- [ ] Re-planification après échec : UI « consigne / voisin / nouvelle tentative »

## Semaine 7 (12 – 18 oct.) — Re-planification + première brique de plan
- [ ] Re-planification : logique métier (nouveau stop / déplacement)
- [ ] Re-planification : tests
- [ ] Champ `plan` dans `profiles` + migration
- [ ] Restriction de features selon le plan (front)
- [ ] Écran « plan actuel » dans le profil
- **Jalon : Étape 3 terminée** — les trois écarts du doc de vision (preuve, communication, échecs) sont comblés.

## Rappel

Les durées sont indicatives, pas des deadlines strictes — si une semaine glisse, décale la suite d'autant. Ne change pas l'ordre entre les trois grandes étapes : c'est ce qui permet d'ouvrir l'app à de vrais livreurs le plus tôt possible en toute sécurité.
