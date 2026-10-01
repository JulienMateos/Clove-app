// ---------------------------------------------------------------------------
// Clove — domain constants (aligned on the web/ front, Clove iOS v5)
// ---------------------------------------------------------------------------

// Radar modes sent by the UI via setAvailability.
export const MODE = { GHOST: 'ghost', FULL: 'full' };

// Values used by the onboarding chips.
export const GENDER = { HOMME: 'homme', FEMME: 'femme', AUTRE: 'autre' };
export const ATTRACTION = { HOMME: 'homme', FEMME: 'femme', LES_DEUX: 'les_deux' };

export const MIN_AGE = 17; // the UI blocks onboarding under 17 ("RÉSERVÉ AUX 17 ANS ET PLUS")

// Session state machine (server-authoritative).
//   PENDING   → both see the request; each accepts (respondInterest)
//   CHALLENGE → both accepted; each sends the challenge photo
//   FIRST     → both photos in; the first decider ("elle") reviews the other's photo
//   SECOND    → she accepted; her photo is revealed, the second decider ("lui") decides
//   MATCH     → both accepted → meeting spot
//   FAILED    → someone declined / timed out
export const SESSION_STATUS = {
  PENDING: 'PENDING',
  CHALLENGE: 'CHALLENGE',
  FIRST: 'FIRST_DECISION',
  SECOND: 'SECOND_DECISION',
  MATCH: 'MATCH',
  FAILED: 'FAILED',
};
export const TERMINAL = new Set([SESSION_STATUS.MATCH, SESSION_STATUS.FAILED]);

// Default proximity radius (m) when the UI doesn't send one, and the hard cap.
export const DEFAULT_RADIUS_M = 200;
export const MAX_RADIUS_M = 2000;

// Presence is stale if no heartbeat for this long.
export const PRESENCE_TTL_MS = 60 * 1000;

// Per-step timeouts. The UI counts down 90 s for the challenge; we add a grace.
export const STEP_TTL_MS = {
  PENDING: 2 * 60 * 1000,
  CHALLENGE: 105 * 1000,
  FIRST_DECISION: 3 * 60 * 1000,
  SECOND_DECISION: 3 * 60 * 1000,
};

// Number of challenges in the UI's DEFIS array (defiIndex 0..6).
export const DEFI_COUNT = 7;

// Shape ("empreinte") can be changed once every 30 days.
export const SHAPE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

// Report reasons, indexed like the UI (reasonIndex).
export const REPORT_REASONS = [
  'photo_deplacee',
  'faux_profil',
  'comportement_insistant',
  'propos_haineux',
  'semble_mineur',
  'arnaque_spam',
  'autre',
];

// Curated public meeting spots. The nearest one to the pair's midpoint is used
// if it is within SPOT_MAX_DISTANCE_M; otherwise the midpoint itself is given.
export const SPOT_MAX_DISTANCE_M = 3000;
export const MEETING_SPOTS = [
  { spot: 'LE KIOSQUE · PLAZA MAYOR', addr: 'Plaza Mayor, côté sud, sous les arcades · Madrid', mapsQuery: 'Plaza Mayor, Madrid', lat: 40.4155, lng: -3.7074 },
  { spot: 'PUERTA DEL SOL · L’OURS', addr: 'Statue de l’Ours et l’Arbousier · Madrid', mapsQuery: 'El Oso y el Madroño, Madrid', lat: 40.417, lng: -3.7033 },
  { spot: 'PARQUE DEL RETIRO · ÉTANG', addr: 'Escaliers du monument à Alphonse XII · Madrid', mapsQuery: 'Monumento a Alfonso XII, Retiro, Madrid', lat: 40.4179, lng: -3.6823 },
  { spot: 'ACUEDUCTO', addr: 'Plaza del Azoguejo, sous les arches · Segovia', mapsQuery: 'Plaza del Azoguejo, Segovia', lat: 40.9481, lng: -4.1184 },
  { spot: 'PLAZA MAYOR', addr: 'Face à la cathédrale · Segovia', mapsQuery: 'Plaza Mayor, Segovia', lat: 40.9503, lng: -4.1263 },
  { spot: 'FONTAINE STRAVINSKY', addr: 'Place Igor-Stravinsky, côté Beaubourg · Paris', mapsQuery: 'Fontaine Stravinsky, Paris', lat: 48.8594, lng: 2.3514 },
  { spot: 'PONT DES ARTS', addr: 'Milieu du pont, côté Louvre · Paris', mapsQuery: 'Pont des Arts, Paris', lat: 48.8583, lng: 2.3375 },
  { spot: 'CANAL SAINT-MARTIN', addr: 'Passerelle de la Grange-aux-Belles · Paris', mapsQuery: 'Passerelle de la Grange-aux-Belles, Paris', lat: 48.8722, lng: 2.3655 },
];
