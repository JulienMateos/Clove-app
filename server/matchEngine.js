// ---------------------------------------------------------------------------
// Clove — match engine. SERVER-AUTHORITATIVE (analysis Q2 & Q3).
//
// The server owns proximity detection, eligibility, the session state machine,
// challenge assignment, meeting-spot reveal, and TTL-based lock recovery.
// Clients only render; they never decide whether a match is valid.
// ---------------------------------------------------------------------------
import * as store from './store.js';
import * as hub from './hub.js';
import { distanceMeters, neighborBuckets } from './geo.js';
import {
  MODE,
  ATTRACTION,
  SOCIAL_STYLE,
  SESSION_STATUS,
  MATCH_RADIUS_M,
  LOCK_TTL_MS,
  randomChallenge,
  randomMeetingSpot,
} from './constants.js';

// -- Eligibility -----------------------------------------------------------
// Mutual attraction check. attraction values: 'homme' | 'femme' | 'les_deux'.
function attracted(fromAttraction, toGender) {
  if (fromAttraction === ATTRACTION.LES_DEUX) return true;
  return fromAttraction === toGender;
}

function mutuallyEligible(a, b) {
  if (a.user_id === b.user_id) return false;
  // Marketing note: the IRL-challenge journey is opt-in for extroverts.
  // Both must be extraverti to enter the challenge flow (protects the
  // experience quality — "filtering at the entry").
  if (a.social_style !== SOCIAL_STYLE.EXTRAVERTI) return false;
  if (b.social_style !== SOCIAL_STYLE.EXTRAVERTI) return false;
  if (!attracted(a.attraction, b.gender)) return false;
  if (!attracted(b.attraction, a.gender)) return false;
  return true;
}

// -- Lock recovery (analysis Q5) ------------------------------------------
export function releaseStaleLocks() {
  const active = store.activePresences();
  const cutoff = Date.now() - LOCK_TTL_MS;
  for (const p of active) {
    if (p.in_match && p.lock_at != null && p.lock_at < cutoff) {
      store.setLock(p.user_id, false);
      const live = store.findLiveSessionForUser(p.user_id);
      if (live) cancelSession(live.id, 'timeout');
    }
  }
}

// -- Proximity scan --------------------------------------------------------
// Called whenever a Full-mode user heartbeats a location. Only compares
// against candidates in the same/neighbouring geo buckets.
export function scanForMatch(userId) {
  const me = store.getPresence(userId);
  if (!me || me.mode !== MODE.FULL || me.in_match || me.lat == null) return null;

  const meUser = store.getUserById(userId);
  const buckets = neighborBuckets(me.lat, me.lng);
  const candidates = store.presencesInBuckets(buckets);

  for (const c of candidates) {
    if (c.user_id === userId || c.in_match) continue;
    if (!mutuallyEligible(meUser, c)) continue;

    // Don't re-open a session that is already live between these two.
    if (store.findLiveSessionBetween(userId, c.user_id)) continue;

    const d = distanceMeters(
      { lat: me.lat, lng: me.lng },
      { lat: c.lat, lng: c.lng }
    );
    // Respect the tighter of the two radii, capped at the global threshold.
    const threshold = Math.min(MATCH_RADIUS_M, me.radius || MATCH_RADIUS_M, c.radius || MATCH_RADIUS_M);
    if (d <= threshold) {
      return openSession(userId, c.user_id, d);
    }
  }
  return null;
}

// -- State machine ---------------------------------------------------------
function openSession(initiatorId, responderId, distance) {
  // Lock both users up front to avoid concurrent sessions.
  store.setLock(initiatorId, true);
  store.setLock(responderId, true);

  const session = store.createSession({
    initiatorId,
    responderId,
    challenge: randomChallenge(),
    distance: Math.round(distance),
    status: SESSION_STATUS.PENDING,
  });

  broadcastSession(session);
  return session;
}

function roleOf(session, userId) {
  if (session.initiator_id === userId) return 'initiator';
  if (session.responder_id === userId) return 'responder';
  return null;
}

// Interest step: both must say yes -> PHOTO_CHALLENGE.
export function respondInterest(sessionId, userId, interested) {
  let session = store.getSession(sessionId);
  if (!session || isTerminal(session.status)) return session;
  const role = roleOf(session, userId);
  if (!role) return session;

  if (!interested) {
    return failSession(sessionId, 'declined');
  }

  const field = role === 'initiator' ? 'interest_init' : 'interest_resp';
  session = store.updateSession(sessionId, { [field]: 1 });

  if (session.interest_init === 1 && session.interest_resp === 1) {
    session = store.updateSession(sessionId, { status: SESSION_STATUS.PHOTO_CHALLENGE });
  } else {
    session = store.updateSession(sessionId, { status: SESSION_STATUS.INTEREST_WAIT });
  }
  broadcastSession(session);
  return session;
}

// Photo submission -> once both photos in, move to PHOTO_REVIEW.
export function submitPhoto(sessionId, userId, photoUrl) {
  let session = store.getSession(sessionId);
  if (!session || isTerminal(session.status)) return session;
  const role = roleOf(session, userId);
  if (!role) return session;

  const field = role === 'initiator' ? 'photo_init' : 'photo_resp';
  session = store.updateSession(sessionId, { [field]: photoUrl });

  if (session.photo_init && session.photo_resp) {
    session = store.updateSession(sessionId, { status: SESSION_STATUS.PHOTO_REVIEW });
  }
  broadcastSession(session);
  return session;
}

// Photo-review acceptance -> both accept => COMPLETED + meeting spot + match.
export function reviewDecision(sessionId, userId, accept) {
  let session = store.getSession(sessionId);
  if (!session || isTerminal(session.status)) return session;
  const role = roleOf(session, userId);
  if (!role) return session;

  if (!accept) {
    return failSession(sessionId, 'passed');
  }

  const field = role === 'initiator' ? 'accept_init' : 'accept_resp';
  session = store.updateSession(sessionId, { [field]: 1 });

  if (session.accept_init === 1 && session.accept_resp === 1) {
    return completeSession(sessionId);
  }
  broadcastSession(session);
  return session;
}

function completeSession(sessionId) {
  const spot = randomMeetingSpot();
  let session = store.updateSession(sessionId, {
    status: SESSION_STATUS.COMPLETED,
    meeting_spot: JSON.stringify(spot),
  });

  const match = store.createMatch({
    userA: session.initiator_id,
    userB: session.responder_id,
    sessionId: session.id,
    meetingSpot: spot,
  });

  store.setLock(session.initiator_id, false);
  store.setLock(session.responder_id, false);

  broadcastSession(session, { matchId: match.id });
  return session;
}

export function failSession(sessionId, reason) {
  const session = store.updateSession(sessionId, { status: SESSION_STATUS.FAILED });
  if (session) {
    store.setLock(session.initiator_id, false);
    store.setLock(session.responder_id, false);
    broadcastSession(session, { reason });
  }
  return session;
}

export function cancelSession(sessionId, reason) {
  const session = store.updateSession(sessionId, { status: SESSION_STATUS.CANCELLED });
  if (session) {
    store.setLock(session.initiator_id, false);
    store.setLock(session.responder_id, false);
    broadcastSession(session, { reason });
  }
  return session;
}

function isTerminal(status) {
  return (
    status === SESSION_STATUS.COMPLETED ||
    status === SESSION_STATUS.FAILED ||
    status === SESSION_STATUS.CANCELLED
  );
}

// -- Broadcasting ----------------------------------------------------------
// Serialise a session into a per-user view (progressive reveal aware).
export function sessionView(session, forUserId, extra = {}) {
  const role = roleOf(session, forUserId);
  const otherId = role === 'initiator' ? session.responder_id : session.initiator_id;
  const other = store.getUserById(otherId);

  const completed = session.status === SESSION_STATUS.COMPLETED;
  const inReview =
    session.status === SESSION_STATUS.PHOTO_REVIEW || completed;

  const myPhoto = role === 'initiator' ? session.photo_init : session.photo_resp;
  const otherPhoto = role === 'initiator' ? session.photo_resp : session.photo_init;

  return {
    sessionId: session.id,
    status: session.status,
    role,
    challenge: session.challenge,
    distance: session.distance,
    // Progressive reveal: full profile only once matched.
    other: store.publicProfile(other, completed ? 'full' : 'teaser'),
    myPhoto: myPhoto || null,
    // The other person's photo is only visible during review / after match.
    otherPhoto: inReview ? otherPhoto || null : null,
    myInterest: role === 'initiator' ? session.interest_init : session.interest_resp,
    myAccept: role === 'initiator' ? session.accept_init : session.accept_resp,
    meetingSpot: session.meeting_spot ? JSON.parse(session.meeting_spot) : null,
    ...extra,
  };
}

function broadcastSession(session, extra = {}) {
  for (const uid of [session.initiator_id, session.responder_id]) {
    hub.sendTo(uid, 'session', sessionView(session, uid, extra));
  }
}
