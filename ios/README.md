# Clove — app iOS (Xcode)

Une app SwiftUI minimale qui affiche l'app web (`web/`, servie par Firebase Hosting) en plein écran
dans une `WKWebView`. Le front n'est pas réécrit : tout se passe dans `web/` et `web/clove-api.js`.

- `Clove/CloveApp.swift` : point d'entrée.
- `Clove/CloveWebView.swift` : la WebView. Elle ouvre Google Maps, `tel:` et les autres liens externes
  dans les apps du système. Hors ligne au lancement, elle affiche la copie embarquée de `web/` en mode démo.

## Créer le projet (une fois)

1. Xcode → *File → New → Project…* → **iOS → App**.
   Nom : `Clove` · Interface : **SwiftUI** · Langage : **Swift** · Identifiant : ex. `app.clove.ios`.
   Enregistre le projet dans ce dossier `ios/`.
2. Supprime le `ContentView.swift` et le `CloveApp.swift` générés, puis glisse dans le projet les deux
   fichiers de `ios/Clove/` (coche *Copy items if needed* : non, *Add to target* : Clove).
3. Dans `CloveWebView.swift`, remplace `https://TON-PROJET.web.app/` par l'adresse de ton projet
   (voir `FIREBASE.md`, étape 8).
4. Cible *Clove* → onglet **Info** → ajoute :
   | Clé | Valeur (exemple) |
   |---|---|
   | `Privacy - Location When In Use Usage Description` | Clove utilise ta position quand le radar est actif pour trouver quelqu'un tout près. |
   | `Privacy - Camera Usage Description` | Clove utilise l'appareil photo pour les défis photo et ta photo de profil. |
5. *(Optionnel, mode démo hors ligne)* glisse le dossier `web/` dans le projet en choisissant
   **Create folder references** (dossier bleu).
6. Cible *Clove* → **Signing & Capabilities** → *Team* : ton compte Apple Developer.

## Lancer sur ton iPhone

Branche l'iPhone (la première fois : *Réglages → Confidentialité et sécurité → Mode développeur*),
choisis-le en haut d'Xcode, puis ▶︎.

## TestFlight (tes testeurs)

*Product → Archive* → *Distribute App* → *App Store Connect* → *Upload*. Ensuite, dans App Store
Connect → ton app → **TestFlight** : ajoute des testeurs internes (immédiat) ou externes (après une
courte vérification d'Apple).

## Avant de viser l'App Store

- **Suppression de compte** : Apple l'exige dans l'app. Le bouton existe dans l'UI mais n'appelle
  rien ; `CloveAPI.deleteAccount()` est prêt côté backend.
- **« Juste un site dans une app »** : Apple peut refuser une app qui n'apporte rien de plus qu'un site
  (règle 4.2). Les notifications push et l'usage natif de la position aident à passer ce cap.
- Une fois l'app en ligne, iOS demande aussi l'autorisation de position *pour le site*, en plus de
  celle de l'app : c'est le comportement normal d'une WebView.
