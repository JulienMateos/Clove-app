# Clove — backend

Serveur Node **sans dépendance** (modules natifs uniquement) qui sert le front compilé `web/`
et l'API utilisée par `web/clove-api.js`.

```bash
npm start                  # http://localhost:4000 (front + API + WebSocket)
npm test                   # test de bout en bout (2 utilisateurs, serveur jetable)
```

Variables d'environnement :

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `4000` | Port HTTP |
| `CLOVE_DATA_DIR` | `data/` | Base JSON + photos (`data/photos/`) |
| `CORS_ORIGIN` | `*` | Si le front est servi ailleurs (WebView, autre domaine) |
| `ALERT_WEBHOOK_URL` | — | Reçoit un POST JSON à chaque alerte Sécurité (voir plus bas) |

## Pont UI ⇄ serveur

`clove-api.js` appelle `/api/health` au chargement ; s'il répond, `CloveAPI.live = true` et les
timers de démo se coupent. Sans serveur (`npx serve web`), l'app reste en mode démo.
L'identité est un jeton renvoyé par `saveProfile` et gardé en `localStorage`.

| `CloveAPI.*` | Route | Événements poussés (WebSocket `/live`) |
|---|---|---|
| `saveProfile` | `POST /api/profile` → `{token}` | `matches` à la connexion |
| `setAvailability` + position GPS toutes les 15 s | `POST /api/availability` | `interest {name, age}` aux deux |
| `respondInterest` | `POST /api/interest` | `challenge {defiIndex}` quand les deux ont accepté |
| `sendChallengePhoto` (blob → data URL) | `POST /api/challenge-photo` | quand les 2 photos sont là : `herDecision {accept:true}` **à elle seule** |
| `decide {accept:true}` | `POST /api/decide` | elle → `herDecision` à lui ; lui → `match` + `matches` aux deux |
| `decide {accept:false}` | `POST /api/decide` | `failed {by:'her'}` à l'autre, `{by:'me'}` à soi |
| `report` | `POST /api/report` | — (vise l'autre personne de la dernière session, et la bloque) |
| `alert` | `POST /api/alert` | — |
| `saveEmergencyContact` | `POST /api/emergency-contact` | — |

Autres routes : `GET /api/me`, `DELETE /api/me` (suppression du compte),
`GET /api/matches`, `GET /api/session/photo` (photo de l'autre, seulement quand la règle l'autorise).

## Règles métier appliquées côté serveur

1. **Consentement séquentiel** — « elle » (la femme du duo ; à défaut la personne détectée en second)
   décide en premier sur la photo de l'autre. Tant qu'elle n'a pas accepté, lui ne peut ni décider
   (`409`) ni récupérer sa photo (`404`). Si elle refuse, il ne la voit jamais.
2. **Pas de chat** — un match = `{id, name, spot, addr, mapsQuery}`. Le lieu est le spot public le plus
   proche du point milieu (liste dans `constants.js`, < 3 km), sinon le point milieu lui-même.
3. **Profil non public** — seuls prénom et âge sortent du serveur.
4. **Empreinte modifiable 1 fois / 30 jours** — un `saveProfile` qui change l'empreinte trop tôt
   garde l'ancienne (`shapeLocked: true`).

Aussi : 17 ans minimum, pas de re-proposition d'une paire déjà vue, utilisateurs bloqués ou visés par
3 signalements ouverts exclus, timeouts par étape (`STEP_TTL_MS`, le défi a 90 s + marge), retour en
mode ghost à la fin de chaque session.

## Alerte Sécurité / SMS

Aucun service payant n'est branché. Une alerte est enregistrée, journalisée et, si
`ALERT_WEBHOOK_URL` est défini, envoyée en POST (contact de confiance, position, lien Google Maps).
Pour envoyer un vrai SMS au contact de confiance, brancher ce webhook sur un fournisseur SMS
(Twilio, Vonage, Brevo…) **après avoir vérifié son prix par SMS et l'accès API du forfait choisi**.

## Limites connues

- Le front est écrit du point de vue « lui » : la personne qui décide en premier voit les textes
  « à elle de décider » puis l'écran de revue (même UI pour les deux). Le prénom « Emma » reste
  codé en dur dans certains textes (voir `CLAUDE.md`).
- L'édition de l'empreinte depuis le profil n'appelle aucune méthode `CloveAPI` : le serveur ne la
  voit qu'au prochain `saveProfile`.
- Le front ne prévoit pas d'écran pour afficher la photo de l'autre : `GET /api/session/photo` est prêt
  pour quand ce sera le cas.
- Stockage : fichier JSON + photos sur disque, un seul processus. Pour la prod : Postgres/PostGIS +
  stockage objet (même interface que `store.js`).
