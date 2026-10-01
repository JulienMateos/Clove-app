# Clove — backend Firebase

Le front `web/index.html` n'est pas modifié. `web/clove-api.js` le relie à Firebase :

| `CloveAPI.*` (UI) | Cloud Function | Événements poussés dans `users/{uid}/events` |
|---|---|---|
| `saveProfile` | `saveProfile` | — |
| `setAvailability` + position GPS toutes les 15 s | `setAvailability` | `interest {name, age}` aux deux |
| `respondInterest` | `respondInterest` | `challenge {defiIndex}` quand les deux ont accepté |
| `sendChallengePhoto` (compressée en JPEG ≤ 1400 px) | `sendChallengePhoto` | quand les 2 photos sont là : `herDecision {accept:true}` **à elle seule** |
| `decide {accept:true}` | `decide` | elle → `herDecision` à lui ; lui → `match` + `matches` aux deux |
| `decide {accept:false}` | `decide` | `failed {by:'her'}` à l'autre, `{by:'me'}` à soi |
| `report` | `report` | — (vise l'autre personne de la dernière session, et la bloque) |
| `alert` | `alert` | — |
| `saveEmergencyContact` | `saveEmergencyContact` | — |
| (démarrage) | `listMatches` | `matches {list}` |
| `deleteAccount`, `getOtherPhoto` | idem | — (prêts, pas encore appelés par l'UI) |

Chaque événement est transmis à `window.__cloveEvent` puis effacé. Les clients ne peuvent lire
**que** leur propre boîte d'événements : tout le reste (profils, positions, sessions, photos) est
fermé par `firestore.rules` et `storage.rules`, et seul le code des Cloud Functions y accède.

## Règles métier (dans `functions/index.js`)

1. **Consentement séquentiel** : « elle » (la femme du duo ; sinon la personne détectée en second)
   décide d'abord sur la photo de l'autre. Avant son oui, lui ne peut ni décider ni récupérer sa photo.
   Si elle refuse, il ne la voit jamais.
2. **Pas de chat** : un match = `{id, name, spot, addr, mapsQuery}`. Le lieu est le spot public le plus
   proche du point milieu (liste dans `functions/constants.js`, < 3 km), sinon le point milieu.
3. **Profil non public** : seuls prénom et âge sortent du serveur.
4. **Empreinte modifiable 1 fois / 30 jours** (`shapeLocked: true` sinon).

Aussi : 17 ans minimum, une paire n'est jamais reproposée, signaler = bloquer, 3 signalements ouverts
= retiré du radar, timeouts par étape (`STEP_TTL_MS`), retour en ghost après chaque session.
L'ouverture d'une session est une transaction : une personne ne peut pas être dans deux sessions.

## Mise en ligne (une fois)

1. **Créer le projet** sur https://console.firebase.google.com (Google Analytics : facultatif).
2. **Passer en Blaze** : ⚙︎ → *Utilisation et facturation* → *Modifier le forfait*. Obligatoire pour
   les Cloud Functions et le stockage des photos. Crée ensuite une **alerte de budget** (ex. 5 €)
   dans Google Cloud → *Facturation* → *Budgets et alertes*. Une alerte prévient, elle ne bloque pas.
3. **Authentication** → *Commencer* → *Mode de connexion* → activer **Anonyme**.
   Pour l'app iOS, active aussi **Apple** (voir `ios/README.md`, section « Se connecter avec Apple »).
4. **Firestore Database** → *Créer une base* → emplacement **europe-west1** (ou `eur3`) → mode production.
5. **Storage** → *Commencer* → emplacement **europe-west1** → mode production.
   Le quota gratuit de Storage n'existe qu'aux États-Unis (`us-central1`, `us-east1`, `us-west1`).
   En Europe, chaque Go est facturé dès le premier (quelques centimes par mois au volume de test),
   mais les photos restent dans l'UE, ce qui est plus simple pour le RGPD.
6. ⚙︎ → *Paramètres du projet* → *Vos applications* → icône **`</>`** (Web) → nom « Clove web ».
   Copie l'objet `firebaseConfig` et colle-le dans `web/clove-api.js` à la place de `FIREBASE_CONFIG = null`.
7. Dans un terminal, à la racine du dépôt :
   ```bash
   npm install && (cd functions && npm install)
   npx firebase login
   npx firebase use --add        # choisis ton projet, alias « default »
   npm run deploy                # règles, index, functions, hébergement
   ```
8. Ouvre `https://<ton-projet>.web.app` (ou mets cette adresse dans l'app iOS, voir `ios/README.md`).

Optionnel : `ALERT_WEBHOOK_URL` dans `functions/.env` reçoit un POST JSON à chaque alerte Sécurité
(contact de confiance, position, lien Google Maps). Aucun service SMS n'est branché : à choisir et à
chiffrer avant de le faire.

## Coûts (vérifiés en octobre 2026)

Blaze inclut des quotas gratuits ; au-delà, c'est à l'usage :

| Service | Gratuit inclus | Usage de Clove |
|---|---|---|
| Firestore | 1 Gio, 50 000 lectures / 20 000 écritures par jour | ~240 écritures par heure de radar actif et par personne |
| Cloud Functions | 2 M d'appels / mois | 1 appel toutes les 15 s en mode « full » |
| Cloud Storage | 5 Go + 100 Go de téléchargement / mois, **seulement aux États-Unis** ; en Europe, facturé dès le 1er Go | photos JPEG ≤ 1400 px (~200-400 Ko) |
| Cloud Scheduler | 3 tâches / mois par compte de facturation | 1 tâche (`sweepTimeouts`, chaque minute) |
| Authentication (anonyme + Apple) | gratuit jusqu'à 50 000 utilisateurs actifs / mois | — |
| Hosting | gratuit à ce volume | — |

Pour des tests entre amis, la facture attendue est de 0 € (ou quelques centimes avec les photos en Europe).

## Développement local

```bash
npm run emulators   # émulateurs + interface sur http://127.0.0.1:4000
                    # app : http://127.0.0.1:5002/?emulator=1&lat=40.4155&lng=-3.7074
npm test            # test de bout en bout sur les émulateurs (Java requis)
```

`?lat=&lng=` remplace le GPS (pratique pour simuler deux personnes au même endroit dans deux navigateurs).
Le SDK Firebase est embarqué dans `web/vendor/firebase/` (pas de CDN) ; `npm run vendor:firebase` le met à jour.

## Limites connues

- L'UI est écrite du point de vue « lui » : la personne qui décide en premier voit « à elle de décider »
  avant son écran de revue. « Emma » reste codé en dur dans certains textes (voir `CLAUDE.md`).
- Le bouton « Supprimer mon compte » de l'UI n'a pas d'action : `CloveAPI.deleteAccount()` est prêt
  mais rien ne l'appelle. **Apple exige la suppression de compte dans l'app** pour la publication.
- Modifier l'empreinte depuis le profil n'appelle pas `CloveAPI` : le serveur ne la voit qu'au prochain `saveProfile`.
- Pas de notifications push : une demande n'arrive que si l'app est ouverte.
- Sur le web, le compte reste anonyme et lié au navigateur. Dans l'app iOS, il est rattaché à
  « Se connecter avec Apple » et suit la personne d'un téléphone à l'autre.
- Le design est prévu pour les écrans d'environ 400 px de large : sur un iPhone SE de 1re génération
  (320 px), le bas de certains écrans est coupé.
