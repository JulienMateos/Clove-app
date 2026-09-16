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

```bash
npm start          # démarre le serveur sur http://localhost:4000
# ou en mode watch :
npm run dev
```

Puis ouvrez http://localhost:4000.

> ⚙️ **Zéro dépendance** : le serveur n'utilise que les modules natifs de Node
> (`http`, `crypto`), avec un WebSocket RFC 6455 écrit à la main et un store
> JSON persistant sur disque. Le front est en JavaScript vanilla (pas de build).

### Tester une rencontre à deux
1. Ouvrez l'app dans **deux onglets** (ou deux navigateurs).
2. Créez deux profils **compatibles** (ex. l'un « homme cherche femmes », l'autre
   « femme cherche hommes »), tous deux réglés sur **extraverti·e**.
3. Passez les deux en mode **Full**, et cliquez sur **« Segovia »** dans les deux
   pour les placer à la même position.
4. Une rencontre se déclenche automatiquement : intérêt → défi photo → verdict → match 🎉

Un test automatisé complet est fourni : `bash scripts/e2e.sh` (serveur démarré au préalable).

---

## Architecture

```
server/
  index.js        HTTP (routeur maison) + service statique + WebSocket
  ws.js           Implémentation WebSocket RFC 6455 (zéro dépendance)
  matchEngine.js  Moteur de match SERVEUR-AUTORITAIRE + machine à états
  store.js        Accès données (au-dessus du store JSON)
  db.js           Store documentaire JSON persistant (écriture atomique)
  geo.js          Distance Haversine + partitionnement géographique (buckets)
  constants.js    Modes, défis, spots de rencontre, TTL, seuils
  ids.js          Générateur d'identifiants (remplace nanoid)
public/
  index.html, styles.css
  app.js          État global + routeur + WebSocket + toasts
  dom.js          Micro-hyperscript h()
  screens/        onboarding, home (radar+modes), matchModal, matches, profile
```

### Machine à états d'une rencontre
`PENDING → INTEREST_WAIT → PHOTO_CHALLENGE → PHOTO_REVIEW → COMPLETED`
(avec `FAILED` / `CANCELLED` comme sorties). Le serveur est seul juge de chaque
transition ; le client ne fait qu'afficher.

---

## Comment le code répond au brief produit

| Fonction du brief | Implémentation |
|---|---|
| **No swipe** | Aucun feed de profils. Le radar écoute ; le serveur propose. |
| **Rencontre IRL immédiate** | Une proximité < seuil déclenche une session tout de suite. |
| **Matching algorithmique** | `matchEngine.scanForMatch` filtre par attraction mutuelle + proximité. |
| **Défi IRL brise-glace** | Liste de défis (`constants.CHALLENGES`) tirée aléatoirement par session. |
| **Révélation progressive** | `store.publicProfile(user, 'teaser'|'full')` : profil complet seulement après le match. |
| **No chat avant la rencontre** | La messagerie n'est ouverte que sur un match `COMPLETED`. |
| **Modes Ghost / Glance / Full** | `constants.MODE` + `/api/mode` ; Ghost = invisible, Glance = exploration, Full = matching actif. |
| **Point de rencontre** | Spots publics curatés (`constants.MEETING_SPOTS`, Segovia). |
| **Persona / filtrage à l'entrée** (notes marketing) | Le parcours à défi n'est proposé qu'aux profils **extravertis** (opt-in). |

## Comment le code répond à l'analyse de codebase (Q1–Q8)

- **Q1 — Découpage du méga-composant** : logique séparée en modules (`matchEngine`, `store`, `geo`, `ws`) et écrans isolés côté client.
- **Q2 & Q3 — Autorité serveur / sécurité** : la proximité, l'éligibilité et les transitions sont **calculées côté serveur** ; le client n'envoie que sa position et n'a jamais le pouvoir de valider un match. Chaque écriture est authentifiée par token (un utilisateur n'agit que sur ses propres données / sa session).
- **Q4 — Rôles neutres** : `initiatorId` / `responderId` remplacent `maleId` / `femaleId` ; aucune sémantique de genre dans la machine à états.
- **Q5 — Récupération du verrou (TTL)** : `LOCK_TTL_MS = 3 min` ; un balayage périodique (`releaseStaleLocks`) libère tout utilisateur bloqué sans heartbeat.
- **Q7 — Partitionnement géo** : `geo.bucketKey` / `neighborBuckets` limitent le scan aux buckets voisins (préfigure GeoFirestore/geohash).

---

## Modèle de données (store JSON)

- `users` — profil (identité vérifiée, style social, bio, avatar)
- `presence` — mode, position, rayon, verrou `in_match` + `lock_at`, bucket géo
- `sessions` — machine à états d'une rencontre live
- `matches` — matchs confirmés (avec point de rencontre)
- `messages` — chat débloqué après match

Persisté dans `data/clove.json` (écriture atomique via fichier temporaire + rename).

---

## Note

Réseau sandbox = *integrations-only* : le registre npm et les services externes
(Firebase, CDNs) sont inaccessibles. L'app a donc été conçue **sans aucune
dépendance externe** — tout est en modules natifs + vanilla JS, et reste
directement transposable vers une stack React Native/Firebase.
