// ---------------------------------------------------------------------------
// Clove — data-access layer on top of the JSON document store.
//
// Row shapes mirror the original SQLite schema (snake_case fields) so the rest
// of the server code is unchanged.
// ---------------------------------------------------------------------------
import { nanoid } from './ids.js';
import db from './db.js';
import { bucketKey } from './geo.js';
import { MODE, PRESENCE_TTL_MS } from './constants.js';

const now = () => Date.now();

const users = () => db.table('users');
const presence = () => db.table('presence');
const sessions = () => db.table('sessions');
const matches = () => db.table('matches');
const messages = () => db.table('messages');

// ---- Users ---------------------------------------------------------------

export function createUser({ username, gender, attraction, socialStyle, bio, avatar }) {
  const id = nanoid();
  const token = nanoid(32);
  const ts = now();
  const user = {
    id,
    token,
    username,
    gender,
    attraction,
    social_style: socialStyle,
    bio: bio || '',
    avatar: avatar || '',
    photo_url: '',
    verified: 1,
    created_at: ts,
  };
  users().push(user);
  presence().push({
    user_id: id,
    mode: MODE.GHOST,
    lat: null,
    lng: null,
    radius: 120,
    bucket: null,
    in_match: 0,
    lock_at: null,
    updated_at: ts,
  });
  db.persist();
  return getUserById(id);
}

export function getUserById(id) {
  return users().find((u) => u.id === id) || null;
}

export function getUserByToken(token) {
  return users().find((u) => u.token === token) || null;
}

export function updateProfile(id, { username, bio, avatar, socialStyle, attraction }) {
  const u = getUserById(id);
  if (!u) return null;
  if (username != null) u.username = username;
  if (bio != null) u.bio = bio;
  if (avatar != null) u.avatar = avatar;
  if (socialStyle != null) u.social_style = socialStyle;
  if (attraction != null) u.attraction = attraction;
  db.persist();
  return u;
}

// Public projection — respects progressive reveal.
export function publicProfile(user, reveal = 'teaser') {
  if (!user) return null;
  const base = {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    socialStyle: user.social_style,
    verified: !!user.verified,
  };
  if (reveal === 'full') {
    return { ...base, gender: user.gender, bio: user.bio, photoUrl: user.photo_url };
  }
  return { id: user.id, username: user.username, avatar: user.avatar, verified: !!user.verified };
}

// ---- Presence ------------------------------------------------------------

export function getPresence(userId) {
  return presence().find((p) => p.user_id === userId) || null;
}

export function setMode(userId, mode) {
  const p = getPresence(userId);
  if (!p) return null;
  p.mode = mode;
  p.updated_at = now();
  db.persist();
  return p;
}

export function heartbeat(userId, { lat, lng, radius, mode }) {
  const p = getPresence(userId);
  if (!p) return null;
  if (lat != null) p.lat = lat;
  if (lng != null) p.lng = lng;
  if (radius != null) p.radius = radius;
  if (mode != null) p.mode = mode;
  if (p.lat != null && p.lng != null) p.bucket = bucketKey(p.lat, p.lng);
  p.updated_at = now();
  db.persist();
  return p;
}

// Active = not Ghost, seen recently, located.
export function activePresences() {
  const cutoff = now() - PRESENCE_TTL_MS;
  return presence()
    .filter((p) => p.mode !== MODE.GHOST && p.updated_at >= cutoff && p.lat != null)
    .map(withUserFields);
}

// Candidates in the given geo buckets, Full mode only.
export function presencesInBuckets(buckets) {
  if (!buckets.length) return [];
  const set = new Set(buckets);
  const cutoff = now() - PRESENCE_TTL_MS;
  return presence()
    .filter(
      (p) =>
        set.has(p.bucket) &&
        p.mode === MODE.FULL &&
        p.updated_at >= cutoff &&
        p.lat != null
    )
    .map(withUserFields);
}

function withUserFields(p) {
  const u = getUserById(p.user_id);
  return {
    ...p,
    username: u?.username,
    gender: u?.gender,
    attraction: u?.attraction,
    social_style: u?.social_style,
  };
}

export function setLock(userId, locked) {
  const p = getPresence(userId);
  if (!p) return;
  p.in_match = locked ? 1 : 0;
  p.lock_at = locked ? now() : null;
  db.persist();
}

// ---- Sessions ------------------------------------------------------------

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

export function findLiveSessionBetween(a, b) {
  return (
    sessions()
      .filter(
        (s) =>
          !TERMINAL.has(s.status) &&
          ((s.initiator_id === a && s.responder_id === b) ||
            (s.initiator_id === b && s.responder_id === a))
      )
      .sort((x, y) => y.created_at - x.created_at)[0] || null
  );
}

export function findLiveSessionForUser(userId) {
  return (
    sessions()
      .filter(
        (s) =>
          !TERMINAL.has(s.status) &&
          (s.initiator_id === userId || s.responder_id === userId)
      )
      .sort((x, y) => y.created_at - x.created_at)[0] || null
  );
}

export function createSession({ initiatorId, responderId, challenge, distance, status }) {
  const ts = now();
  const s = {
    id: nanoid(),
    initiator_id: initiatorId,
    responder_id: responderId,
    status,
    challenge,
    distance,
    interest_init: null,
    interest_resp: null,
    photo_init: null,
    photo_resp: null,
    accept_init: null,
    accept_resp: null,
    meeting_spot: null,
    created_at: ts,
    updated_at: ts,
  };
  sessions().push(s);
  db.persist();
  return s;
}

export function getSession(id) {
  return sessions().find((s) => s.id === id) || null;
}

export function updateSession(id, fields) {
  const s = getSession(id);
  if (!s) return null;
  Object.assign(s, fields);
  s.updated_at = now();
  db.persist();
  return s;
}

// ---- Matches -------------------------------------------------------------

export function createMatch({ userA, userB, sessionId, meetingSpot }) {
  const m = {
    id: nanoid(),
    user_a: userA,
    user_b: userB,
    session_id: sessionId,
    meeting_spot: JSON.stringify(meetingSpot || null),
    matched_at: now(),
  };
  matches().push(m);
  db.persist();
  return m;
}

export function getMatch(id) {
  return matches().find((m) => m.id === id) || null;
}

export function matchesForUser(userId) {
  return matches()
    .filter((m) => m.user_a === userId || m.user_b === userId)
    .sort((a, b) => b.matched_at - a.matched_at);
}

// ---- Messages ------------------------------------------------------------

export function addMessage(matchId, senderId, body) {
  const msg = {
    id: nanoid(),
    match_id: matchId,
    sender_id: senderId,
    body,
    created_at: now(),
  };
  messages().push(msg);
  db.persist();
  return msg;
}

export function messagesForMatch(matchId) {
  return messages()
    .filter((m) => m.match_id === matchId)
    .sort((a, b) => a.created_at - b.created_at);
}
