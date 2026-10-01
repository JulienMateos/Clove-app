// clove-api.js — LE SEUL fichier à modifier pour brancher le backend.
// Chargé AVANT l'app. Tant que `live` vaut false, l'app tourne en mode démo (identique au prototype).
//
// SORTANT  : l'UI appelle window.CloveAPI.<méthode>(payload)
// ENTRANT  : le backend (WebSocket, SSE, push…) appelle window.__cloveEvent(type, data)

window.CloveAPI = {
  live: false, // ← passer à true quand le backend répond : les timers de démo se coupent

  // Fin de l'onboarding (bouton « ENTRER DANS CLOVE »)
  // { firstName, lastName, birth:'YYYY-MM-DD', gender, attraction, traits:number[12] (0..1), hour, vol(0..4), el(0..3), photo:dataURL }
  saveProfile(p)          { console.log('[CloveAPI] saveProfile', p); },

  // Tap sur le cœur du radar. { mode:'ghost'|'full', radius:number (m) }
  setAvailability(p)      { console.log('[CloveAPI] setAvailability', p); },

  // L'utilisateur accepte la demande reçue (étape PENDING). { accept:true }
  respondInterest(p)      { console.log('[CloveAPI] respondInterest', p); },

  // Envoi de la photo du défi. { defi:string, image:blobURL }
  sendChallengePhoto(p)   { console.log('[CloveAPI] sendChallengePhoto', p); },

  // Décision de l'homme à l'étape 2/2, ou abandon à n'importe quelle étape. { accept:boolean, status? }
  decide(p)               { console.log('[CloveAPI] decide', p); },

  // Signalement. { name, reasonIndex } — raisons : 0 photo déplacée, 1 faux profil, 2 comportement insistant,
  // 3 propos haineux, 4 semble mineur·e, 5 arnaque/spam, 6 autre
  report(p)               { console.log('[CloveAPI] report', p); },

  // Bouton Sécurité. { type:'text' (c'est gênant) | 'danger' }
  alert(p)                { console.log('[CloveAPI] alert', p); },

  // Contact de confiance. { name, phone }
  saveEmergencyContact(p) { console.log('[CloveAPI] saveEmergencyContact', p); },
};

// ── Événements entrants (à déclencher depuis ton client temps réel) ──────────
// __cloveEvent('interest',    { name:'Emma', age:29 })                 → écran « demande »
// __cloveEvent('challenge',   { defiIndex:0..6 })                      → écran défi (compte à rebours 90 s)
// __cloveEvent('herDecision', { accept:true|false })                   → étape 2/2 ou échec
// __cloveEvent('match',       { id, name, spot, addr, mapsQuery })     → écran « C'est un match »
// __cloveEvent('failed',      { by:'her'|'me' })                       → session terminée
// __cloveEvent('matches',     { list:[{ id, name, spot, addr, mapsQuery }] }) → historique Matchs
