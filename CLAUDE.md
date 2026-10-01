# CLAUDE.md — Clove (front identique + branchement backend)

> Colle ce fichier à la racine du repo. Claude Code le lit automatiquement.

## Règle n°1 : NE PAS REDESSINER
Le front est **fini**. `web/index.html` est l'app Clove complète, pixel-identique au design validé
(écrans, couleurs, transitions, animations). **Ne pas le réécrire, ne pas le convertir en React/Swift,
ne pas « nettoyer » le CSS.** C'est un fichier compilé (1,4 Mo, tout inclus, fonctionne hors ligne).

Le seul travail : **brancher un backend** via `web/clove-api.js`.

## Structure
```
web/
  index.html     ← l'app (NE PAS MODIFIER — fichier compilé)
  clove-api.js   ← pont UI ⇄ backend (LE fichier à modifier)
server/          ← à créer : ton backend
```
Lancer : `npx serve web` puis ouvrir http://localhost:3000 (ou n'importe quel serveur statique).
Sur mobile : servir `web/` tel quel (PWA) ou l'afficher dans une WebView (Expo `react-native-webview`, `WKWebView`).

## Comment l'UI parle au backend
- **Sortant** : l'UI appelle `window.CloveAPI.<méthode>(payload)` à chaque action utilisateur.
- **Entrant** : le backend pousse des événements en appelant `window.__cloveEvent(type, data)`.
- `CloveAPI.live = false` → mode démo (timers simulés, boutons « Démo : elle accepte / refuse » visibles).
  `live = true` → les timers et boutons démo disparaissent, l'UI attend les vrais événements.

Toutes les méthodes et événements sont documentés dans `web/clove-api.js`.

## Parcours et appels correspondants
| Moment dans l'app | Sortant (`CloveAPI.*`) | Entrant attendu (`__cloveEvent`) |
|---|---|---|
| Fin onboarding « ENTRER DANS CLOVE » | `saveProfile` | — |
| Tap sur le cœur du radar | `setAvailability {mode, radius}` | `interest` quand quelqu'un est proche |
| Accepter la demande | `respondInterest {accept:true}` | `challenge {defiIndex}` quand les deux ont accepté |
| Envoyer la photo du défi | `sendChallengePhoto {defi, image}` | `herDecision {accept}` (elle décide en 1er) |
| Lui accepte (étape 2/2) | `decide {accept:true}` | `match {id,name,spot,addr,mapsQuery}` |
| Refuser / abandonner | `decide {accept:false}` | — (l'UI affiche l'échec) |
| Elle refuse | — | `failed {by:'her'}` ou `herDecision {accept:false}` |
| Ouverture onglet Matchs | — | `matches {list}` |
| Signaler | `report {name, reasonIndex}` | — |
| Sécurité « gênant » / « danger » | `alert {type}` | — |
| Contact de confiance | `saveEmergencyContact {name, phone}` | — |

Règles métier à faire respecter **côté serveur** :
1. Double consentement **séquentiel** : la femme voit d'abord la photo du défi de l'homme et décide ; si elle refuse, fin (il ne voit jamais sa photo). Si elle accepte, sa photo est révélée et l'homme décide.
2. Pas de chat. Un match = un lieu de RDV (`spot`, `addr`, `mapsQuery` pour Google Maps).
3. Profil non public : seuls prénom + âge sont montrés.
4. Empreinte modifiable 1 fois / 30 jours.

## Backend suggéré (si rien n'existe)
Node + Fastify (ou Supabase) · Postgres + PostGIS (proximité via `radius`) · WebSocket pour les événements entrants · stockage objet pour les photos · Twilio pour `alert`.
Exemple de pont dans `clove-api.js` :
```js
const ws = new WebSocket('wss://api.clove.app/live');
ws.onmessage = (e) => { const {type, data} = JSON.parse(e.data); window.__cloveEvent(type, data); };
window.CloveAPI.live = true;
window.CloveAPI.setAvailability = (p) => fetch('/api/availability', {method:'POST', body:JSON.stringify(p)});
// … idem pour chaque méthode
```

## Limites connues du front (ne pas corriger sans demander)
- Le prénom de l'autre personne est écrit « Emma » dans certains textes (étapes du match, signalement). Si besoin de dynamique, modifier la source `Clove iOS v5.dc.html` puis recompiler — **demander avant**.
- La barre de progression de l'onboarding a 6 segments pour 7 étapes.

## Si une modif visuelle est vraiment nécessaire
Ne pas éditer `index.html`. La source est `design/Clove iOS v5.dc.html` (ouvrable dans un navigateur avec `support.js` + `ios-frame.jsx` à côté). Les docs `design/README.md` et `design/TRANSITIONS.md` décrivent chaque écran et transition.
