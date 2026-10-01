# Handoff : Clove iOS — v5 (néo-Mondrian)

> Doc destinée à Claude Code (ou à un·e dev) qui n'a pas suivi la conversation de design.
> Fichier de référence : `Clove iOS v5.dc.html` (inclus dans ce dossier).
> Repo cible : `JulienMateos/Clove-app` (branche `main`).

## Overview
Clove est une « anti-dating app » : pas de swipe, pas de feed. L'app repère une personne compatible à proximité, lance un **défi IRL** chronométré, puis un **double consentement séquentiel** (elle d'abord, lui ensuite) avant de révéler un point de rendez-vous. **Pas de chat** : le match débouche directement sur « Comment y aller » (Maps).

Flow v5 :
Accueil (mosaïque) → zoom dans le trou du pin → « Prêt à vibrer » → onboarding 7 étapes → Radar (cœur-interrupteur) → session (demande → attente → défi → elle décide → il décide → match) → Matchs (historique + adresse) · Profil · Sécurité.

## About the Design Files
`Clove iOS v5.dc.html` est une **référence de design en HTML**, pas du code de production. Il faut **recréer ces écrans dans l'environnement du repo** (patterns et libs existants). Si rien n'est en place : React Native (Expo) + TypeScript, ou SwiftUI si iOS-only.

Structure du fichier (pour le lire) :
- Template entre `<x-dc>…</x-dc>` : markup avec trous `{{ valeur }}`, `<sc-if value>` (conditionnel), `<sc-for list as>` (boucle). Tous les styles sont **inline**.
- Script `<script data-dc-script>` : une classe `Component` façon React class component. `state` = toute la machine d'état ; `renderVals()` = valeurs calculées exposées au template. **La logique est transposable, le markup non.**
- `ios-frame.jsx` : simple cadre iPhone (status bar, home indicator) — ne pas porter.
- `support.js` : runtime du prototype — ne pas porter.
- Démo : `window.__cloveDemo('<preset>')` saute à un état (`welcome`, `ob1`, `ob2`, `shape-tuto`, `shape`, `photo`, `final`, `radar-ghost`, `radar-full`, `pending`, `wait`, `challenge`, `her-turn`, `review`, `match`, `failed`…).

## Fidelity
**High-fidelity.** Couleurs, typo, copy, animations définitives. Placeholders assumés :
- Les « boutons démo » *Elle accepte / Elle refuse* sur l'étape 1 du match (à remplacer par la vraie réponse serveur).
- Photo d'Emma = rayures crème (à remplacer par sa photo réelle).
- Adresse du RDV codée en dur (`Plaza Mayor, Madrid`).
- Signalement : envoi simulé (pas d'API).

---

## Design Tokens

### Couleurs
| Token | Hex | Usage |
|---|---|---|
| `ink` | `#10182E` | Texte, bordures noires, barres de séparation |
| `paper` | `#F4F0E8` | Fond par défaut (blanc cassé) |
| `orange` | `#E24B0B` | Accent primaire, pin du logo, actif-bas du radar |
| `cobalt` | `#123C96` | Accent secondaire, actif-haut du radar |
| `teal` | `#0F6B60` | Vert de l'app : inactif-haut du radar, « C'est gênant », validation |
| `cream` | `#EFE4CE` | Aplats doux, inactif-bas du radar |
| `orangeDark` | `#C43E07` | Ombre droite du pin |
| `white` | `#FFFFFF` | Champs, cases |

Règle : texte en **noir (`ink`)** sur fonds clairs ou orange ; **blanc cassé** sur bleu/vert. Jamais d'orange sur vert.

### Typographie (Google Fonts)
- **Archivo** 500–900 : titres et interface. Titres en 900, `line-height .8–.9`, `letter-spacing -.04 à -.065em`, souvent UPPERCASE.
- **IBM Plex Mono** 500/700 : étiquettes, compteurs, statuts (10–14px, `letter-spacing .12–.22em`).
- Corps : Archivo 500–600, 13.5–15px, `line-height 1.35–1.4`.

### Formes
- Bordures `3px solid #10182E` (cartes, boutons), 4–5px pour les gros blocs.
- Ombre « dure » façon néo-brutalisme : `box-shadow: 4px 4px 0 #10182E` (ou `#123C96` / `#E24B0B`). Pas d'ombre floue sauf `drop-shadow` du cœur.
- Rayons : 0 partout, sauf l'appareil photo (corps 18px) et les cercles.
- Légères rotations (−2° à +2°) sur étiquettes, cartes et boutons principaux.

### Keyframes clés (dans `<helmet>`)
`cloveBeat` (battement 0.985↔1.025), `cloveRise` (entrée écran), `clovePulse`, `clovePop`, `cloveFloat`, `cloveGo` (ombre qui pulse noir→cobalt), `cloveArrow` (flèche qui avance), `cloveDemoShape / cloveDemoFinger / cloveDemoTag(2)` (démo de l'empreinte).

### Logo (cœur facetté + pin)
Dessiné en SVG `viewBox 0 0 240 266`. Les facettes sont dans `LOGO_F` (polygones) avec les couleurs `LC` : `O` = orange, `C` = cobalt, `K` = crème. Deux triangles fins sur les bords bas sont en **`#10182E`** (sinon on voit des « espaces blancs »). Pin : forme `path` orange + moitié droite `#C43E07` + anneau crème `r=18`. En mode Ghost, `logoList(false)` passe tout en gris/blanc.

---

## Screens / Views

### 1. Accueil (`welcome`)
- **Mosaïque plein écran** : grid `4 colonnes (1fr 1.25fr .55fr 1fr)` × `7 rangées (1.8 1.3 1.9 .55 .5 .7 .6 fr)`, `gap 5px`, fond `ink` (les gaps font les traits noirs).
- Case centrale (col 2–3, rangées 2–4) : fond `paper`, logo + wordmark « CL○VE » (le O est un anneau CSS, `border 8px`).
- Trois rangées sous le logo portent les slogans : **ANTI-DATING** (rangée 5, fond orange, texte noir), **NO SWIPE** (rangée 6, crème, texte noir), **IRL FIRST** (rangée 7 : la case est coupée par un trait noir → case orange à gauche + case bleue avec « IRL FIRST » en noir à droite). Case rangée 6 col 1 = blanc cassé.
- **Tap sur le logo → transition en 3 temps** (`openWelcome`) :
  1. Le cœur bat 2× (560 ms).
  2. Les blocs glissent en **tourbillon** (1000 ms, `cubic-bezier(.7,0,.2,1)`) : bas → gauche, gauche → haut, haut → droite, droite → bas. Les deux rangées sous le logo descendent d'abord **derrière** la dernière rangée, puis toute la bordure du bas part à gauche. Chaque bloc garde un contour noir `0 0 0 5px` pendant le mouvement ; le carré du logo n'a pas de bordure propre.
  3. **Zoom dans le trou du pin** (1050 ms, `cubic-bezier(.7,0,.16,1)`) : la mosaïque scale autour du centre du trou, la page 2 apparaît par un `clip-path: circle()` qui grandit depuis le trou ; un anneau noir 3px suit le bord du trou en apparaissant progressivement (opacité 0 → .85).
- **Page 2** « PRÊT À VIBRER. » (« VIBRER. » en orange) : bande de 4 blocs en haut, étiquette « CLOVE · ANTI-DATING », 3 cartes penchées qui glissent depuis les côtés (décalées de .12 s) : « ZÉRO SWIPE. » (orange), « UN DÉFI, EN VRAI. » (bleu), « UNE RENCONTRE. » (vert). En bas : flèche flottante + « SWIPE (UNE DERNIÈRE FOIS) POUR CRÉER TON PROFIL ». Swipe haut (>50px) ou tap → onboarding.

### 2. Onboarding (7 étapes, `OB=['ob1','ob2','obShapeTuto','obShape','obColors','obPhoto','obFinal']`)
1. **Profil (`ob1`)** : Prénom + Nom (2 colonnes), date de naissance (`input type=date`) avec **âge calculé** à droite (vert si ≥17, orange sinon). Carte « Aperçu de ton profil » : « Santiago R., 27 ans » + date en toutes lettres. Les autres ne voient que prénom + âge.
2. **Compatibilité (`ob2`)** : « JE SUIS » (3 boutons) + « JE CHERCHE À RENCONTRER » (3 boutons), boutons penchés, sélection = fond plein + ombre. Encadré « Aucun profil public. » bleu + bloc orange/crème, **collé en bas d'écran**.
3. **Tuto empreinte (`obShapeTuto`)** : « COMMENT MARCHE TON EMPREINTE », démo animée 230px (doigt orange qui étire « SPORT · À FOND » puis rétracte « SORTIES · PAS DU TOUT », boucle 4.2 s), 3 étapes numérotées. Bouton « J'AI COMPRIS → ».
4. **Empreinte (`obShape`)** : tient **sans scroll**, contenu réparti verticalement (spacers flex). Forme radiale 300px à 12 branches étirables au doigt. Labels **en entier** autour : CAFÉ, RÉVEIL, SÉRIES, CUISINE, DANSE, VOCAUX, SPORT, VOYAGE, PLANTES, KARAOKÉ, CHIENS, NUIT. Carte du dessous : nom de l'habitude + niveau (**5 barres** : PAS DU TOUT / UN PEU / MOYEN / BEAUCOUP / À FOND) + **phrase propre à chaque niveau et habitude** (`TRAITS[i].lo / m1 / (moyen commun) / m3 / hi`).
5. **Couleurs (`obColors`)** → révélation : « RAVI DE TE RENCONTRER ! », étiquette « RÉVÉLATION · PRÉNOM NOM », texte **humoristique** composé de 3 morceaux (heure × volume × élément, voir `revealLine`).
6. **Photo (`obPhoto`)** : appareil photo dessiné (corps arrondi 18px, viseur bleu, objectif orange). Après choix : **cadrage** (glisser pour déplacer, slider −/+ zoom 1→3, grille des tiers), « Changer de photo ». « TRANSFORMER → » rogne en carré 900×900 (`applyCrop`) avant de continuer. « Plus tard » possible.
7. **Final (`obFinal`)** : gros bouton « ENTRER DANS CLOVE → » (orange, ombre 6px, s'enfonce au tap).

### 3. Radar
- **Fond bicolore plein écran** coupé par une barre noire 10px (centrée sur le cœur, ~44% hauteur) :
  - Inactif (Ghost) : **vert en haut**, **blanc cassé en bas**.
  - Actif (Full) : **bleu en haut**, **rouge/orange en bas**.
- **Tap sur le cœur** : la barre fait un **demi-tour** (rotation 180°, 1100 ms, `cubic-bezier(.65,0,.25,1)`) d'un carré de 2400px, les couleurs basculent pendant la rotation. Simultanément, **4 bandes colorées** partent de l'étiquette d'état et montent jusqu'au-delà du haut de l'écran (900 ms, décalage 55 ms/bande).
- Header : « CLOVE » blanc cassé, « BONJOUR SANTIAGO » (bleu nuit en inactif, blanc cassé en actif), pas de logo.
- Cœur : battement `cloveBeat` en Full, `drop-shadow` conservé. Étiquette d'état **largeur fixe 172px** : « ○ ALLUME-MOI » / « ● À L'ÉCOUTE » (fond noir en actif).
- Rayon : titre « Rayon » Archivo 22px, puce valeur (orange en inactif, noir en actif), slider 50–350 m, phrase « Jusqu'où Clove cherche quelqu'un pour toi. ».
- En Full + `autoSpark`, une demande arrive après 2 s (`status:'PENDING'`).

### 4. Session de rencontre (overlay plein écran)
Barre d'étapes en haut. États (`status`) :
`PENDING` (accepter/refuser l'intérêt) → `WAIT` (1.8 s) → `CHALLENGE` → `HER_TURN` → `REVIEW` → `MATCH`, ou `FAILED`.
- **CHALLENGE** : défi tiré au hasard parmi 7 (`DEFIS`), bouton « ↻ AUTRE DÉFI », compte à rebours 90 s. Zone photo = **ouvre la caméra** (`input capture="environment"`), photo affichée dans la case, « Reprendre ».
- **HER_TURN (étape 1/2)** : « EMMA DÉCIDE EN PREMIER. » Sa photo est **verrouillée** (cadenas), la tienne « ENVOYÉE ✓ ». Indicateur « EMMA REGARDE TA PHOTO… ». Si elle refuse → `FAILED` (« Emma a préféré passer son tour… »), tu ne vois jamais sa photo. Auto-accepte après 4.5 s en démo.
- **REVIEW (étape 2/2)** : « EMMA A DIT OUI. ET TOI ? », sa photo se dévoile (`clovePop` + badge « ✓ A DIT OUI »). Boutons Non / « OUI, ON CONTINUE ».
- **MATCH** : tient **sur une page sans scroll**. Mosaïque réduite (`46/72/60/32px`) + 2 avatars qui se rejoignent, titre 54px, carte « EMMA, 29 ANS » (22px, sans 2ᵉ avatar ni habitudes), carte lieu « LE KIOSQUE · PLAZA MAYOR ». Bouton **« COMMENT Y ALLER »** vivant (orange, pin crème, flèche qui avance, ombre qui pulse, rotation −0.8°). **Pas de chat, pas de bouton Continuer.** Ouvre Google Maps ; au retour dans l'app (focus/visibilitychange) → session fermée et écran **Matchs**.
- **Signaler Emma** : présent sur HER_TURN et REVIEW (drapeau 24×28, texte 17px).

### 5. Signalement (bottom sheet)
Fond `rgba(16,24,46,.55)`, feuille crème bordure haute 4px. 7 raisons (cases à cocher carrées) : Photo déplacée ou choquante · Faux profil ou photo volée · Comportement insistant ou menaçant · Propos haineux ou offensants · Semble avoir moins de 18 ans · Arnaque, spam ou publicité · Autre raison. « ENVOYER LE SIGNALEMENT » (désactivé sans raison) → écran « MERCI. » (examen sous 24 h, anonyme). Pendant une session : fermer = fin de session.

### 6. Matchs (historique)
Liste ; chaque ligne : avatar, **nom + lieu** sur une ligne, **adresse du RDV** dessous (« Plaza Mayor, côté sud, sous les arcades · Madrid »). Tap ligne → Maps. Colonne droite 66px « SIGNALER » (drapeau) → « SIGNALÉ » sur fond orange après envoi.

### 7. Profil
Prénom en grand + badge « ✓ VÉRIFIÉ » / « NON VÉRIFIÉ ». Si non vérifié : gros bouton orange « VÉRIFIER MON PROFIL » (pièce d'identité + selfie, obligatoire pour lancer une rencontre) → parcours Vérification (intro → pièce recto/verso → selfie → terminé), la pièce ouvre la caméra arrière, le selfie la caméra frontale. Avatar 200px (photo fondue dans la forme), légende « LIRE TA FORME » (habitudes + barres), 4 tuiles de stats, « Modifier mon empreinte ». Si la dernière modif date de < 1 mois, le tap affiche seulement alors l'encadré « Verrouillée jusqu'au … Une empreinte, c'est un engagement : une modification par mois. » (re-tap = masquer). Sinon → édition directe (sans tuto).

### 8. Sécurité
Deux grosses cases : **« C'est gênant »** (fond vert `teal`, visage gêné qui transpire, SMS seulement) et **« Je me sens en danger »** (gyrophare, SMS + appel). Premier passage : config du « contact super-héros » (prénom + téléphone validé) → « ACTIVER LA SÉCURITÉ ». Ensuite les deux cases + ligne « CONTACT · SAM · +33… » (Modifier). Chaque case ouvre un écran « Alerte envoyée » (SMS pré-rédigé ; danger = SMS + appel avec compteur).

### Tab bar (4 onglets)
RADAR · MATCHS · PROFIL · SÉCURITÉ, hauteur 104px, visible seulement hors session/alerte/vérif.

---

## Interactions globales
- **Effet au toucher** (`tapFx`, défaut `blocs`) : sur boutons/labels, flash de blocs colorés + **battement du texte**, battements **synchronisés** entre éléments (même `startTime`). Le cœur du radar a `data-nobands` : pas de flash local, mais les 4 bandes montantes décrites plus haut.
- Entrée d'écran : `cloveRise .3s`.
- Swipe (accueil) via pointer events.

## State Management (essentiel)
```
screen: 'welcome' | 'ob1' | 'ob2' | 'obShapeTuto' | 'obShape' | 'obColors' | 'obPhoto' | 'obFinal' | 'radar' | 'matches' | 'profile' | 'safety'
name, lastName, birth            // profil
traits: number[12]  (0..1)       // empreinte
hour, vol(0..4), el(0..3)        // couleurs → revealLine
photoRaw, photoUrl, cropTx, cropTy, cropZ, photoW, photoH   // cadrage
mode: 'ghost' | 'full', radius (50..350), radarTurn (compteur de demi-tours)
status: null | 'PENDING' | 'WAIT' | 'CHALLENGE' | 'HER_TURN' | 'REVIEW' | 'MATCH' | 'FAILED'
failBy: 'her' | 'me', defi (index), cd (sec), photo, chImg
matches: [{id,name,spot,addr,...}], reported: {[name]: true}, report: {name, reason, done} | null
wOpen, wDone                     // transition d'accueil
```

## Props / Tweaks du prototype
`welcomeVariant` (Grille | Originale), `startScreen` (Accueil | Onboarding | Radar | Matchs | Profil — défaut **Accueil**), `autoSpark` (bool), `empreinteRecente` (bool, verrouille la modif d'empreinte), `tapFx` (blocs | balayage).

## Assets
Aucun bitmap : logo et illustrations (appareil photo, cadenas, drapeau, gyrophare, visage gêné) sont en SVG/CSS dans le fichier. Polices Google Fonts : Archivo, IBM Plex Mono.

## Files
- `TRANSITIONS.md` — **code exact** de chaque transition (à lire avant d'animer quoi que ce soit).
- `screens/` — 27 captures, une par écran / état (animations figées), nommées dans l'ordre du parcours : `01-accueil-mosaique` … `17-match` … `27-verif-selfie`.
- `Clove iOS v5.dc.html` — prototype complet (source de vérité).
- `ios-frame.jsx`, `support.js` — nécessaires pour ouvrir le prototype dans un navigateur, à ne pas porter.

## Points d'attention
- La barre de progression de l'onboarding (`obBars`) n'a que 6 segments alors qu'il y a 7 étapes : en ajouter un à l'implémentation.
- L'écran Chat existe encore dans le fichier mais n'est plus accessible : **ne pas l'implémenter**.
- Les timings démo (auto-accept 4.5 s, spark 2 s) sont à remplacer par des événements serveur.
- Les captures sont prises animations coupées : pour le mouvement, ouvrir `Clove iOS v5.dc.html` dans un navigateur et lire `TRANSITIONS.md`.
- En cas de doute entre ce README et le fichier, **le fichier fait foi**.
