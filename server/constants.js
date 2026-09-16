// ---------------------------------------------------------------------------
// Clove — domain constants
// ---------------------------------------------------------------------------

// Availability modes (see product spec: Ghost / Glance / Full)
export const MODE = {
  GHOST: 'ghost', // invisible, no solicitations
  GLANCE: 'glance', // minimally visible, exploring — no active matching
  FULL: 'full', // fully active, ready for an IRL challenge right now
};

// Gender & attraction (used only for eligibility filtering, NOT for match roles)
export const GENDER = { HOMME: 'homme', FEMME: 'femme', AUTRE: 'autre' };
export const ATTRACTION = {
  HOMME: 'homme',
  FEMME: 'femme',
  LES_DEUX: 'les_deux',
};

// Persona flag from the marketing notes: the extra IRL-challenge steps are
// OPTIONAL and only surfaced for users who describe themselves as extroverted.
export const SOCIAL_STYLE = { INTROVERTI: 'introverti', EXTRAVERTI: 'extraverti' };

// Match session state machine.
// initiatorId / responderId roles — deliberately gender-neutral (see analysis Q4).
export const SESSION_STATUS = {
  PENDING: 'PENDING', // proximity detected, awaiting mutual interest
  INTEREST_WAIT: 'INTEREST_WAIT', // one side said yes, waiting for the other
  PHOTO_CHALLENGE: 'PHOTO_CHALLENGE', // both interested, taking challenge photos
  PHOTO_REVIEW: 'PHOTO_REVIEW', // both photos in, reviewing each other
  COMPLETED: 'COMPLETED', // mutual accept -> real match + meeting spot
  FAILED: 'FAILED', // someone declined
  CANCELLED: 'CANCELLED', // timeout / disconnect / abort
};

// Server-authoritative distance threshold (metres) to trigger a session.
export const MATCH_RADIUS_M = 120;

// TTL-based lock recovery (analysis Q5): if inMatch with no heartbeat for this
// long, the user is auto-released.
export const LOCK_TTL_MS = 3 * 60 * 1000; // 3 minutes

// A user is considered stale / offline if not seen for this long.
export const PRESENCE_TTL_MS = 45 * 1000;

// Playful IRL ice-breaker challenges (from the brief).
export const CHALLENGES = [
  'Prends une photo avec une chaussure sur ta tête !',
  'Prends une photo où tu touches du rouge !',
  'Prends une photo avec un animal !',
  'Prends une photo style film d’horreur !',
  'Prends une photo où tu parles à un objet !',
  'Prends une photo où tu boxes en l’air !',
  'Prends une photo avec un·e commerçant·e !',
  'Prends une photo avec un objet pointu et un objet rond !',
  'Prends une photo avec un·e random !',
  'Prends une photo de toi en courant !',
  'Prends une photo de toi avec un vêtement à l’envers !',
  'Prends une photo assis·e !',
  'Prends une photo en câlinant la nature !',
  'Prends une photo de toi qui manges !',
  'Prends une photo de toi qui danses !',
  'Prends une photo où tu mimes un brocoli !',
  'Prends une photo de toi perdu·e !',
  'Prends une photo de toi qui cries !',
  'Prends une photo de toi comme si tu étais à la plage !',
  'Prends une photo de toi comme si tu étais devant un lion !',
  'Prends une photo de toi qui sens tes aisselles !',
  'Prends une photo avec ce que t’as dans les poches !',
];

// Curated public meeting spots (Segovia, per the original codebase).
export const MEETING_SPOTS = [
  {
    name: 'Acueducto de Segovia',
    hint: 'Retrouvez-vous sous les arches romaines.',
    lat: 40.9481,
    lng: -4.1184,
  },
  {
    name: 'Plaza Mayor',
    hint: 'Sur la terrasse la plus proche de la cathédrale.',
    lat: 40.9503,
    lng: -4.1263,
  },
  {
    name: 'Alcázar de Segovia',
    hint: 'À l’entrée du jardin, face au château.',
    lat: 40.9525,
    lng: -4.1327,
  },
  {
    name: 'Mirador de la Pradera de San Marcos',
    hint: 'Au banc avec la meilleure vue sur l’Alcázar.',
    lat: 40.9556,
    lng: -4.1349,
  },
  {
    name: 'Jardín de los Zuloaga',
    hint: 'Près de la fontaine centrale.',
    lat: 40.9538,
    lng: -4.1301,
  },
];

export function randomChallenge() {
  return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
}

export function randomMeetingSpot() {
  return MEETING_SPOTS[Math.floor(Math.random() * MEETING_SPOTS.length)];
}
