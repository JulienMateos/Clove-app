# Clove — l'anti-dating app qui renverse les règles du jeu

Clove est une application de rencontre **IRL-first** : pas de swipe, pas de chat
sans fin. L'algorithme détecte une personne compatible **tout près de vous**,
vous propose un **défi ludique** à relever ensemble en vrai, puis ne débloque le
chat qu'**après** votre rencontre. Vous pilotez votre visibilité avec trois modes :
**Ghost / Glance / Full**.

Cette implémentation est une **web app full-stack fonctionnelle** (le concept
d'origine était une app React Native + Firebase ; ici tout est porté sur le web,
sans dépendance externe, pour tourner dans cet environnement sandbox).

---

## Démarrer

Le front est `web/index.html` (compilé, ne pas modifier). Il parle au backend **Firebase** via
`web/clove-api.js`. Mise en ligne, coûts et règles métier : [`FIREBASE.md`](FIREBASE.md).
App iPhone (Xcode, TestFlight) : [`ios/README.md`](ios/README.md).

```bash
npm install && (cd functions && npm install)
npm run emulators  # tout en local : http://127.0.0.1:5002/?emulator=1&lat=40.4155&lng=-3.7074
npm test           # test de bout en bout sur les émulateurs
npm run deploy     # mise en ligne sur ton projet Firebase
```

### Tester une rencontre à deux (en local)
1. `npm run emulators`, puis ouvre dans **deux navigateurs** (ou un normal + une fenêtre privée) :
   http://127.0.0.1:5002/?emulator=1&lat=40.4155&lng=-3.7074 et
   http://127.0.0.1:5002/?emulator=1&lat=40.4156&lng=-3.7074 (`lat`/`lng` remplacent le GPS).
2. Fais l'onboarding avec deux profils compatibles (ex. femme → hommes, homme → femmes).
3. Touche le cœur du radar des deux côtés : demande → défi photo → elle décide → il décide → match.

> L'ancien front `public/` (avec chat) n'est plus utilisé ; il est gardé pour référence.

---

## Architecture

```
web/
  index.html          L'app compilée (NE PAS MODIFIER)
  clove-api.js        Pont UI ⇄ Firebase (Cloud Functions + boîte d'événements temps réel)
  vendor/firebase/    SDK Firebase embarqué (pas de CDN)
functions/
  index.js            Cloud Functions : moteur de match, consentement séquentiel, sécurité
  constants.js        Étapes, timeouts, spots de rencontre, raisons de signalement
  moderation.js       Filtre texte + validation des photos
firestore.rules       Tout fermé, sauf la boîte d'événements de chaque utilisateur
storage.rules         Photos fermées : seules les Cloud Functions les servent
ios/                  App SwiftUI (WKWebView) pour Xcode / TestFlight
scripts/e2e.mjs       Test de bout en bout (émulateurs)
```

### Machine à états d'une rencontre
`PENDING → CHALLENGE → FIRST_DECISION (elle) → SECOND_DECISION (lui) → MATCH`,
avec `FAILED` comme sortie (refus, abandon, signalement, timeout). Le serveur est seul juge de chaque
transition ; le client ne fait qu'afficher.

### Données (Firestore + Storage)
`users` (profil privé, empreinte, contact de confiance) + `users/{uid}/events` (boîte d'événements) ·
`presence` (mode, position, geohash, session en cours) · `sessions` · `matches` (lieu de RDV) ·
`pairs` (déjà rencontrés / bloqués) · `reports` · `alerts` · photos dans `photos/{uid}/`.

---

## Soumission App Store

La documentation prête pour App Store Connect est dans `docs/` :
- **`docs/APP_STORE.md`** — nom, sous-titre, descriptions FR + EN, texte promo,
  mots-clés, catégories, 17+, URLs, notes pour l'examen + comptes de démo,
  liste des captures d'écran.
- **`docs/PRIVACY_LABELS.md`** — « nutrition labels » de confidentialité alignés
  sur ce que le code collecte réellement (localisation, pseudo, photos, messages,
  orientation), avec la correspondance code ⇄ label. Pas de suivi publicitaire.

## Conformité App Store (App Review Guidelines)

Clove intègre les garde-fous qu'Apple exige pour une app de rencontre avec
contenu généré par les utilisateurs :

| Exigence Apple | Implémentation |
|---|---|
| **1.2 — Filtre de contenu** | `server/moderation.js` valide chaque photo (type/taille) et filtre le texte (pseudo, bio, messages). |
| **1.2 — Signalement** | Menu ⋯ sur chaque profil rencontré → `POST /api/report` (motif + détails). Traité sous 24 h. |
| **1.2 — Blocage** | `POST /api/block` ; les personnes bloquées ne sont plus jamais proposées (exclusion dans le match engine) et toute session en cours est fermée. |
| **1.2 — Contact éditeur** | Page « À propos & légal » → support@clove.app. |
| **1.2 — Éjection des récidivistes** | ≥ 3 signalements ouverts ⇒ l'utilisateur est retiré du pool de matching. |
| **5.1.1(v) — Suppression de compte in-app** | Profil → « Supprimer mon compte » → `DELETE /api/me` (purge totale : profil, présence, sessions, matchs, messages, blocages). |
| **5.1 — Consentement & confidentialité** | Étape de consentement explicite à l'inscription (localisation + conditions), politique de confidentialité et conditions in-app, toggle de localisation révocable. |
| **Classification 17+** | Affichée dans l'app ; réservé aux 17 ans et plus. |

## Direction artistique

- **Base iOS / Apple HIG** : thème clair (systemGroupedBackground), pile de
  polices système (SF + New York en serif éditorial pour les titres), séparateurs
  hairline, ombres douces, coins 22 px, safe-area insets, **dark mode** automatique.
- **Langage De Stijl / Mondrian** : primaires rouge · bleu · jaune posées avec
  retenue, lignes noires nettes, barre signature, **logo SVG maison** (mark en
  blocs Mondrian + étincelle).
- **Couche artisanale** : grain papier subtil en overlay, animations d'entrée
  soignées, feuilles modales (bottom sheets) iOS, listes façon Réglages,
  interrupteurs animés, icônes SVG line (aucune dépendance à une police emoji).

## Note

Réseau sandbox = *integrations-only* : le registre npm et les services externes
(Firebase, CDNs) sont inaccessibles. L'app a donc été conçue **sans aucune
dépendance externe** — tout est en modules natifs + vanilla JS, et reste
directement transposable vers une stack React Native/Firebase.
