# Clove — App Privacy « Nutrition Labels »

> À saisir dans **App Store Connect → Confidentialité de l'app**. Ces réponses
> sont **alignées sur ce que le code collecte réellement** aujourd'hui. Si tu
> ajoutes de l'analytics, de la pub ou un paiement plus tard, il faudra mettre
> ce tableau à jour AVANT la soumission concernée.

## Résumé

- **Suivi (tracking)** : ❌ **Non.** Clove ne suit pas les utilisateurs entre
  apps/sites tiers et n'utilise pas d'identifiant publicitaire. → Répondre
  « Non » à *App Tracking Transparency* n'est pas requis (pas de tracking).
- **Données liées à l'identité** : oui, certaines (voir tableau).
- **Données NON liées à l'identité** : diagnostics éventuels (voir plus bas).

---

## Données collectées

Dans App Store Connect, pour chaque type coché : indiquer **objectif(s)**, si
c'est **lié à l'identité** de l'utilisateur, et si c'est utilisé pour le **suivi**.

| Type de donnée | Collectée ? | Objectif(s) | Liée à l'identité | Utilisée pour le suivi |
|---|---|---|---|---|
| **Localisation approximative / précise** | ✅ Oui | Fonctionnalité de l'app (détection de proximité pour le matching) | ✅ Oui | ❌ Non |
| **Nom d'utilisateur / pseudo** | ✅ Oui | Fonctionnalité de l'app | ✅ Oui | ❌ Non |
| **Adresse e-mail** *(si auth par e-mail)* | ✅ Oui | Fonctionnalité de l'app, Authentification | ✅ Oui | ❌ Non |
| **ID utilisateur** | ✅ Oui | Fonctionnalité de l'app | ✅ Oui | ❌ Non |
| **Photos** (défis) | ✅ Oui | Fonctionnalité de l'app | ✅ Oui | ❌ Non |
| **Autre contenu utilisateur** (messages, bio) | ✅ Oui | Fonctionnalité de l'app | ✅ Oui | ❌ Non |
| **Orientation sexuelle** *(catégorie « sensible »)* | ✅ Oui | Fonctionnalité de l'app (compatibilité) | ✅ Oui | ❌ Non |
| **Données de diagnostic** (logs crash) *(optionnel)* | ➖ Si activé | Fonctionnalité de l'app / Diagnostics | ❌ Non | ❌ Non |

> ⚠️ **Orientation sexuelle** : le champ « je cherche à rencontrer » (hommes /
> femmes / les deux) combiné au genre déduit une préférence. Apple classe cela
> comme **donnée sensible** — il faut la déclarer et ne l'utiliser que pour la
> fonctionnalité (jamais pour la pub ni le tracking). C'est bien le cas ici.

---

## Correspondance code ⇄ label (justification pour la review)

| Donnée déclarée | Où dans le code | Usage réel |
|---|---|---|
| Localisation | `server/store.js` (`presence.lat/lng`), `POST /api/heartbeat` | Calcul de distance Haversine côté serveur pour déclencher un match. Non stockée en historique de trajet ; écrasée à chaque heartbeat. |
| Pseudo, ID, bio, genre, préférence | `users` (`store.createUser`) | Profil + éligibilité de matching. Révélation progressive (`publicProfile`). |
| Photos | `sessions.photo_*` (`submitPhoto`) | Visibles uniquement par la personne rencontrée, à l'étape « review ». |
| Messages | `messages` (`addMessage`) | Chat débloqué seulement après un match confirmé. |
| Consentement | `users.consent_*` (`setConsent`) | Preuve de consentement localisation + conditions (RGPD / Guideline 5.1). |

---

## Conservation & suppression

- **Suppression de compte in-app** : `DELETE /api/me` → `store.deleteAccount()`
  purge immédiatement profil, présence, sessions, matchs, messages, blocages.
- **Minimisation** : pas de feed public, pas de revente à des tiers, pas de
  partage avec une IA sans consentement explicite, pas d'identifiant publicitaire.
- **Localisation** : utilisée uniquement en modes Glance/Full ; jamais en Ghost ;
  consentement révocable depuis le profil.

---

## Ce qu'on NE fait PAS (à garder tel quel pour rester « No tracking »)

- ❌ Pas de SDK publicitaire / d'attribution.
- ❌ Pas de partage de données avec des data brokers.
- ❌ Pas de fingerprinting ni d'IDFA.
- ❌ Pas de revente des photos/messages.

> Si l'un de ces points change (ex. ajout d'AdMob), il faudra : cocher « Suivi »,
> implémenter le prompt **App Tracking Transparency**, et mettre à jour ces labels.
