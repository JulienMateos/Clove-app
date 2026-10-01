// ---------------------------------------------------------------------------
// Clove — data-access layer on top of the JSON document store.
// Photos are written to data/photos/ (never inside the JSON document).
// ---------------------------------------------------------------------------
import { join } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { nanoid } from './ids.js';
import db, { dataDir } from './db.js';
import { bucketKey } from './geo.js';
import { MODE, TERMINAL, PRESENCE_TTL_MS, DEFAULT_RADIUS_M } from './constants.js';

const now = () => Date.now();
const users = () => db.table('users');
const presence = () => db.table('presence');
const sessions = () => db.table('sessions');
const matches = () => db.table('matches');

// ---- Photos --------------------------------------------------------------
const photoDir = join(dataDir, 'photos');
mkdirSync(photoDir, { recursive: true });

// dataUrl must already be validated (moderation.moderatePhoto). Returns a photo id.
export function savePhoto(dataUrl) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
  const id = nanoid();
  writeFileSync(join(photoDir, id), Buffer.from(m[2], 'base64'));
  writeFileSync(join(photoDir, id + '.type'), m[1]);
  return id;
}

export function readPhoto(id) {
  if (!id || !/^[\w-]+$/.test(id)) return null;
  const f = join(photoDir, id);
  if (!existsSync(f)) return null;
  return { type: readFileSync(f + '.type', 'utf8'), data: readFileSync(f) };
}

function deletePhoto(id) {
  if (!id) return;
  for (const f of [join(photoDir, id), join(photoDir, id + '.type')]) {
    try { unlinkSync(f); } catch {}
  }
}

// ---- Users ---------------------------------------------------------------
export function createUser(fields) {
  const ts = now();
  const user = { id: nanoid(), token: nanoid(32), created_at: ts, emergency: null, ...fields };
  users().push(user);
  presence().push({
    user_id: user.id, mode: MODE.GHOST, lat: null, lng: null, radius: DEFAULT_RADIUS_M,
    bucket: null, updated_at: ts,
  });
  db.persist();
  return user;
}

export const getUserById = (id) => users().find((u) => u.id === id) || null;
export const getUserByToken = (t) => users().find((u) => u.token === t) || null;

export function updateUser(id, fields) {
  const u = getUserById(id);
  if (!u) return null;
  Object.assign(u, fields);
  db.persist();
  return u;
}

export function ageOf(user) {
  const b = new Date(user.birth + 'T12:00:00');
  if (isNaN(b)) return null;
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age;
}

// Profiles are never public: only first name + age leave the server.
export function publicProfile(user) {
  if (!user) return null;
  return { name: user.first_name, age: ageOf(user) };
}

// ---- Presence ------------------------------------------------------------
export const getPresence = (userId) => presence().find((p) => p.user_id === userId) || null;

export function updatePresence(userId, { mode, radius, lat, lng }) {
  const p = getPresence(userId);
  if (!p) return null;
  if (mode != null) p.mode = mode;
  if (radius != null) p.radius = radius;
  if (lat != null && lng != null) {
    p.lat = lat;
    p.lng = lng;
    p.bucket = bucketKey(lat, lng);
  }
  p.updated_at = now();
  db.persist();
  return p;
}

// Full-mode, located, fresh presences in the given geo buckets.
export function fullPresencesInBuckets(buckets) {
  const set = new Set(buckets);
  const cutoff = now() - PRESENCE_TTL_MS;
  return presence().filter(
    (p) => p.mode === MODE.FULL && p.lat != null && p.updated_at >= cutoff && set.has(p.bucket)
  );
}

// ---- Sessions ------------------------------------------------------------
export function createSession(fields) {
  const ts = now();
  const s = { id: nanoid(), created_at: ts, updated_at: ts, step_at: ts, ...fields };
  sessions().push(s);
  db.persist();
  return s;
}

export const getSession = (id) => sessions().find((s) => s.id === id) || null;

export function updateSession(id, fields) {
  const s = getSession(id);
  if (!s) return null;
  if (fields.status && fields.status !== s.status) fields.step_at = now();
  Object.assign(s, fields, { updated_at: now() });
  db.persist();
  return s;
}

const involves = (s, uid) => s.user_a === uid || s.user_b === uid;

export function liveSessionFor(userId) {
  return sessions().find((s) => !TERMINAL.has(s.status) && involves(s, userId)) || null;
}

export function lastSessionFor(userId) {
  return sessions().filter((s) => involves(s, userId)).sort((a, b) => b.created_at - a.created_at)[0] || null;
}

export function liveSessions() {
  return sessions().filter((s) => !TERMINAL.has(s.status));
}

// Pairs that already went through a session (any outcome) are not re-proposed.
export function havePairedBefore(a, b) {
  return sessions().some((s) => involves(s, a) && involves(s, b));
}

// ---- Matches -------------------------------------------------------------
export function createMatch({ userA, userB, sessionId, place }) {
  const m = { id: nanoid(), user_a: userA, user_b: userB, session_id: sessionId, place, matched_at: now() };
  matches().push(m);
  db.persist();
  return m;
}

export function matchesFor(userId) {
  return matches().filter((m) => m.user_a === userId || m.user_b === userId)
    .sort((a, b) => b.matched_at - a.matched_at);
}

// ---- Blocks, reports, alerts ---------------------------------------------
export function isBlockedBetween(a, b) {
  return db.table('blocks').some(
    (x) => (x.blocker_id === a && x.blocked_id === b) || (x.blocker_id === b && x.blocked_id === a)
  );
}

export function blockUser(blockerId, blockedId) {
  if (blockerId === blockedId || isBlockedBetween(blockerId, blockedId)) return;
  db.table('blocks').push({ id: nanoid(), blocker_id: blockerId, blocked_id: blockedId, created_at: now() });
  db.persist();
}

export function createReport(fields) {
  const r = { id: nanoid(), status: 'open', created_at: now(), ...fields };
  db.table('reports').push(r);
  db.persist();
  return r;
}

export function openReportCountAgainst(userId) {
  return db.table('reports').filter((r) => r.reported_id === userId && r.status === 'open').length;
}

export function createAlert(fields) {
  const a = { id: nanoid(), created_at: now(), ...fields };
  db.table('alerts').push(a);
  db.persist();
  return a;
}

// ---- Account deletion ----------------------------------------------------
export function deleteAccount(userId) {
  const purge = (name, pred) => {
    const arr = db.table(name);
    for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) arr.splice(i, 1);
  };
  const u = getUserById(userId);
  if (u) deletePhoto(u.photo_id);
  for (const s of sessions()) if (involves(s, userId)) { deletePhoto(s.photo_a); deletePhoto(s.photo_b); }
  purge('sessions', (s) => involves(s, userId));
  purge('matches', (m) => m.user_a === userId || m.user_b === userId);
  purge('presence', (p) => p.user_id === userId);
  purge('blocks', (b) => b.blocker_id === userId || b.blocked_id === userId);
  purge('reports', (r) => r.reporter_id === userId);
  purge('alerts', (a) => a.user_id === userId);
  purge('users', (x) => x.id === userId);
  db.persist();
}
