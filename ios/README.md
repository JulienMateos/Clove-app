# Clove — app iOS (Xcode)

Une app SwiftUI minimale qui affiche l'app web (`web/`, servie par Firebase Hosting sur
https://clove-dating-app.web.app) en plein écran dans une `WKWebView`. Le front n'est pas réécrit :
tout se passe dans `web/` et `web/clove-api.js`.

- `Clove.xcodeproj` : le projet, **déjà configuré** (identifiant `com.clove.mvp`, portrait, iPhone seul,
  autorisations position + appareil photo, « Se connecter avec Apple », icône).
- `Clove/CloveApp.swift` : point d'entrée.
- `Clove/CloveWebView.swift` : la WebView. Elle ouvre Google Maps, `tel:` et les autres liens externes
  dans les apps du système, et affiche la feuille native **« Se connecter avec Apple »** quand
  `web/clove-api.js` la demande (à la fin de l'onboarding, une seule fois).
- `Clove/Assets.xcassets` : icône de l'app (logo du design sur fond crème).
- `Clove.entitlements` : droit « Sign in with Apple ».

Dans l'app (et sur tout téléphone), `clove-api.js` passe en **mode app** : le bandeau de présentation et
l'iPhone dessiné de `index.html` sont masqués, l'écran de l'app occupe tout l'écran.

## Lancer sur ton iPhone

Prérequis : Xcode avec la plateforme **iOS** installée (*Xcode → Settings → Components*), soit
~20 Go libres sur le Mac.

1. `git pull`, puis double-clique sur **`ios/Clove.xcodeproj`**.
2. Clique sur le projet bleu **Clove** en haut à gauche → cible **Clove** → onglet
   **Signing & Capabilities** → **Team** : ton compte Apple Developer. C'est le seul réglage à faire.
3. Branche l'iPhone (la première fois : touche « Se fier », puis *Réglages → Confidentialité et
   sécurité → Mode développeur* → activer, l'iPhone redémarre).
4. En haut au centre d'Xcode, choisis **ton iPhone**, puis ▶︎ (Cmd + R).

## « Se connecter avec Apple » côté Firebase (une fois)

1. Console Firebase → **Authentication** → **Mode de connexion** → **Apple** → **Activer**. Laisse vides
   les champs « ID de service » et « Flux de code OAuth » (ils ne servent que pour le web et Android).
2. ⚙︎ → **Paramètres du projet** → **Vos applications** : une app **iOS** avec l'ID du bundle
   `com.clove.mvp` doit exister (c'est déjà le cas sur `clove-dating-app`).

Si la personne annule la feuille Apple, son profil est quand même enregistré sur un compte anonyme,
et la feuille lui sera reproposée à la prochaine fin d'onboarding.

## TestFlight (tes testeurs)

1. En haut d'Xcode, choisis **Any iOS Device (arm64)** à la place de ton iPhone.
2. *Product → Archive*. À la fin, la fenêtre *Organizer* s'ouvre → **Distribute App** →
   **App Store Connect** → **Upload**.
3. Sur https://appstoreconnect.apple.com → ton app → **TestFlight** : ajoute des testeurs internes
   (immédiat) ou externes (après une courte vérification d'Apple).

Si App Store Connect n'a pas encore d'app pour `com.clove.mvp`, crée-la d'abord : *Apps* → **+** →
*Nouvelle app* → plateforme iOS, ID du bundle `com.clove.mvp`.

## Avant de viser l'App Store

- **Suppression de compte** : Apple l'exige dans l'app. Le bouton existe dans l'UI mais n'appelle
  rien ; `CloveAPI.deleteAccount()` est prêt côté backend. Avec « Se connecter avec Apple », Apple
  demande aussi de **révoquer le jeton Apple** à la suppression : à ajouter en même temps.
- **« Juste un site dans une app »** : Apple peut refuser une app qui n'apporte rien de plus qu'un site
  (règle 4.2). Les notifications push et l'usage natif de la position aident à passer ce cap.
- iOS demande l'autorisation de position *pour le site*, en plus de celle de l'app : c'est le
  comportement normal d'une WebView.
