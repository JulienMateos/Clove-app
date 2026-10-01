// ---------------------------------------------------------------------------
// Clove — match engine. SERVER-AUTHORITATIVE.
//
// Proximity detection, eligibility, the session state machine, the challenge
// draw, timeouts and the meeting spot are all decided here. Clients only
// render what they are pushed (events consumed by window.__cloveEvent).
//
// Sequential double consent:
//   1. both photos are in → only the first decider ("elle") is moved to REVIEW
//      and may see the other's photo;
//   2. if she declines the session fails — the second decider never sees her photo;
//   3. if she accepts, her photo is revealed to him and he decides;
//   4. his acceptance creates the match (a meeting spot, no chat).
// ---------------------------------------------------------------------------
import * as store from './store.js';
import * as hub from './hub.js';
import { distanceMeters, neighborBuckets } from './geo.js';
import {
  MODE, ATTRACTION, GENDER, SESSION_STATUS as S, TERMINAL, STEP_TTL_MS, DEFI_COUNT,
  MEETING_SPOTS, SPOT_MAX_DISTANCE_M, DEFAULT_RADIUS_M,
} from './constants.js';

export class FlowError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}

// -- Eligibility -----------------------------------------------------------
const attracted = (attraction, gender) => attraction === ATTRACTION.LES_DEUX || attraction === gender;

function eligible(a, b) {
  if (a.id === b.id) return false;
  if (!attracted(a.attraction, b.gender) || !attracted(b.attraction, a.gender)) return false;
  if (store.isBlockedBetween(a.id, b.id)) return false;
  if (store.openReportCountAgainst(a.id) >= 3 || store.openReportCountAgainst(b.id) >= 3) return false;
  if (store.havePairedBefore(a.id, b.id)) return false;
  return true;
}

// -- Proximity scan --------------------------------------------------------
export function scanForMatch(userId) {
  const me = store.getPresence(userId);
  if (!me || me.mode !== MODE.FULL || me.lat == null || store.liveSessionFor(userId)) return null;
  const meUser = store.getUserById(userId);

  for (const c of store.fullPresencesInBuckets(neighborBuckets(me.lat, me.lng))) {
    if (c.user_id === userId || store.liveSessionFor(c.user_id)) continue;
    const other = store.getUserById(c.user_id);
    if (!other || !eligible(meUser, other)) continue;
    const d = distanceMeters(me, c);
    if (d <= Math.min(me.radius || DEFAULT_RADIUS_M, c.radius || DEFAULT_RADIUS_M)) {
      return openSession(meUser, other, d);
    }
  }
  return null;
}

function openSession(a, b, distance) {
  // "Elle" decides first. Without exactly one woman in the pair, the responder does.
  const aF = a.gender === GENDER.FEMME, bF = b.gender === GENDER.FEMME;
  const first = aF && !bF ? a.id : b.id;
  const session = store.createSession({
    user_a: a.id, user_b: b.id, first_decider: first, status: S.PENDING,
    distance: Math.round(distance), interest: {}, photos: {}, defi_index: null, place: null,
  });
  hub.sendTo(a.id, 'interest', store.publicProfile(b));
  hub.sendTo(b.id, 'interest', store.publicProfile(a));
  return session;
}

// -- Helpers ---------------------------------------------------------------
const otherOf = (s, uid) => (s.user_a === uid ? s.user_b : s.user_a);
const secondOf = (s) => otherOf(s, s.first_decider);

function requireLive(userId) {
  const s = store.liveSessionFor(userId);
  if (!s) throw new FlowError('aucune session en cours', 404);
  return s;
}

// -- Steps -----------------------------------------------------------------
export function respondInterest(userId, accept) {
  const s = requireLive(userId);
  if (!accept) return fail(s, userId, 'declined');
  if (s.status !== S.PENDING) throw new FlowError('étape invalide');
  const interest = { ...s.interest, [userId]: true };
  if (interest[s.user_a] && interest[s.user_b]) {
    const defiIndex = Math.floor(Math.random() * DEFI_COUNT);
    store.updateSession(s.id, { interest, status: S.CHALLENGE, defi_index: defiIndex });
    for (const uid of [s.user_a, s.user_b]) hub.sendTo(uid, 'challenge', { defiIndex });
  } else {
    store.updateSession(s.id, { interest });
  }
  return s;
}

// photoId may be null: the UI lets a user "shoot" without attaching a file.
export function submitPhoto(userId, photoId, defi) {
  const s = requireLive(userId);
  if (s.status !== S.CHALLENGE) throw new FlowError('étape invalide');
  if (userId in s.photos) throw new FlowError('photo déjà envoyée');
  const photos = { ...s.photos, [userId]: photoId };
  const defis = { ...s.defis, [userId]: defi || null };
  if (s.user_a in photos && s.user_b in photos) {
    store.updateSession(s.id, { photos, defis, status: S.FIRST });
    // Only the first decider moves on to REVIEW; the other stays on "her turn".
    hub.sendTo(s.first_decider, 'herDecision', { accept: true });
  } else {
    store.updateSession(s.id, { photos, defis });
  }
  return s;
}

export function decide(userId, accept) {
  const s = requireLive(userId);
  if (!accept) return fail(s, userId, 'declined');
  if (s.status === S.FIRST && userId === s.first_decider) {
    store.updateSession(s.id, { status: S.SECOND });
    hub.sendTo(secondOf(s), 'herDecision', { accept: true });
    return s;
  }
  if (s.status === S.SECOND && userId === secondOf(s)) return complete(s);
  // Sequential consent: nobody can accept out of turn.
  throw new FlowError('ce n’est pas ton tour de décider');
}

function complete(s) {
  const place = meetingPlace(s);
  store.updateSession(s.id, { status: S.MATCH, place });
  const m = store.createMatch({ userA: s.user_a, userB: s.user_b, sessionId: s.id, place });
  for (const uid of [s.user_a, s.user_b]) {
    hub.sendTo(uid, 'match', matchView(m, uid));
    hub.sendTo(uid, 'matches', { list: matchesFor(uid) });
  }
  release(s);
  return s;
}

// byUserId: who ended it (null = timeout). Everyone else sees "by: 'her'".
export function fail(s, byUserId, reason) {
  if (TERMINAL.has(s.status)) return s;
  const blockers = byUserId ? [byUserId] : blockersOf(s);
  store.updateSession(s.id, { status: S.FAILED, failed_at: s.status, fail_reason: reason, failed_by: byUserId });
  for (const uid of [s.user_a, s.user_b]) {
    hub.sendTo(uid, 'failed', { by: blockers.includes(uid) ? 'me' : 'her' });
  }
  release(s);
  return s;
}

// Who the session was waiting on when it timed out.
function blockersOf(s) {
  const both = [s.user_a, s.user_b];
  if (s.status === S.PENDING) return both.filter((u) => !s.interest[u]);
  if (s.status === S.CHALLENGE) return both.filter((u) => !(u in s.photos));
  if (s.status === S.FIRST) return [s.first_decider];
  if (s.status === S.SECOND) return [secondOf(s)];
  return both;
}

// The UI goes back to Ghost after a session (closeSession), mirror it here.
function release(s) {
  for (const uid of [s.user_a, s.user_b]) store.updatePresence(uid, { mode: MODE.GHOST });
}

export function sweepTimeouts() {
  const t = Date.now();
  for (const s of store.liveSessions()) {
    const ttl = STEP_TTL_MS[s.status];
    if (ttl && t - s.step_at > ttl) fail(s, null, 'timeout');
  }
}

// -- Photo reveal ----------------------------------------------------------
// Returns the other person's challenge photo id only when the rules allow it.
export function visibleOtherPhoto(userId) {
  const s = store.lastSessionFor(userId);
  if (!s) return null;
  const first = s.first_decider;
  const step = s.status === S.FAILED ? s.failed_at : s.status;
  const herTurnOrLater = [S.FIRST, S.SECOND, S.MATCH].includes(step);
  const hisTurnOrLater = [S.SECOND, S.MATCH].includes(step);
  if (userId === first && herTurnOrLater) return s.photos[secondOf(s)] || null;
  if (userId !== first && hisTurnOrLater) return s.photos[first] || null;
  return null;
}

// -- Meeting place ---------------------------------------------------------
function meetingPlace(s) {
  const a = store.getPresence(s.user_a), b = store.getPresence(s.user_b);
  const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  let best = null, bestD = Infinity;
  for (const p of MEETING_SPOTS) {
    const d = distanceMeters(mid, p);
    if (d < bestD) { best = p; bestD = d; }
  }
  if (best && bestD <= SPOT_MAX_DISTANCE_M) {
    return { spot: best.spot, addr: best.addr, mapsQuery: best.mapsQuery };
  }
  const q = `${mid.lat.toFixed(5)},${mid.lng.toFixed(5)}`;
  return { spot: 'POINT DE RENCONTRE', addr: 'À mi-chemin entre vous deux', mapsQuery: q };
}

// -- Views -----------------------------------------------------------------
function matchView(m, uid) {
  const other = store.getUserById(m.user_a === uid ? m.user_b : m.user_a);
  return { id: m.id, name: other ? other.first_name : '', ...m.place };
}

export function matchesFor(uid) {
  return store.matchesFor(uid).map((m) => matchView(m, uid));
}
