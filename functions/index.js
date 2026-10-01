// ---------------------------------------------------------------------------
// Clove — Cloud Functions (Firebase). SERVER-AUTHORITATIVE.
//
// The UI only calls these callables (via web/clove-api.js) and reads its own
// event inbox users/{uid}/events, which web/clove-api.js forwards to
// window.__cloveEvent. Every other document and every photo is closed to
// clients (firestore.rules, storage.rules): only these functions touch them.
//
// Sequential double consent:
//   1. both photos are in → only the first decider ("elle") moves to REVIEW
//      and may fetch the other's photo;
//   2. if she declines the session fails — the second decider never sees her photo;
//   3. if she accepts, her photo is revealed to him and he decides;
//   4. his acceptance creates the match (a meeting spot, no chat).
// ---------------------------------------------------------------------------
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
import {
  MODE, GENDER, ATTRACTION, MIN_AGE, SESSION_STATUS as S, TERMINAL, LIVE_STATUSES,
  DEFAULT_RADIUS_M, MAX_RADIUS_M, PRESENCE_TTL_MS, STEP_TTL_MS, DEFI_COUNT, SHAPE_COOLDOWN_MS,
  REPORT_REASONS, MEETING_SPOTS, SPOT_MAX_DISTANCE_M,
} from './constants.js';
import { moderateText, moderatePhoto } from './moderation.js';

initializeApp();
const db = getFirestore();
const bucket = () => getStorage().bucket();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';

// ---- Refs & helpers ------------------------------------------------------
const userRef = (uid) => db.doc(`users/${uid}`);
const presenceRef = (uid) => db.doc(`presence/${uid}`);
const sessionRef = (id) => db.doc(`sessions/${id}`);
const pairRef = (a, b) => db.doc(`pairs/${[a, b].sort().join('_')}`);
const eventsOf = (uid) => userRef(uid).collection('events');

const bad = (msg) => { throw new HttpsError('invalid-argument', msg); };
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function coordsOf(d) {
  const lat = num(d.lat), lng = num(d.lng);
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function ageOf(birth) {
  const b = new Date(birth + 'T12:00:00');
  if (isNaN(b)) return null;
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age;
}

// Profiles are never public: only first name + age leave the server.
const publicProfile = (u) => ({ name: u.first_name, age: ageOf(u.birth) });

// Queue an event for the user's UI (forwarded to window.__cloveEvent).
// `n` keeps the order of several events written in the same transaction.
function emit(tx, uid, type, data, n = 0) {
  tx.set(eventsOf(uid).doc(), { type, data, at: Date.now(), n });
}

async function savePhoto(uid, dataUrl, kind) {
  const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
  const path = `photos/${uid}/${kind}-${Date.now()}`;
  await bucket().file(path).save(Buffer.from(m[2], 'base64'), { contentType: m[1], resumable: false });
  return path;
}

async function readPhoto(path) {
  if (!path) return null;
  const file = bucket().file(path);
  const [[data], [meta]] = await Promise.all([file.download(), file.getMetadata()]);
  return `data:${meta.contentType};base64,${data.toString('base64')}`;
}

// Callable wrapper: requires Firebase Auth (anonymous is fine) and, by default, a saved profile.
function callable(handler, { needProfile = true } = {}) {
  return onCall(async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'connexion requise');
    const uid = req.auth.uid;
    let user = null;
    if (needProfile) {
      const snap = await userRef(uid).get();
      if (!snap.exists) throw new HttpsError('failed-precondition', 'profil requis');
      user = { id: uid, ...snap.data() };
    }
    return handler(req.data || {}, uid, user);
  });
}

// ---- Profile -------------------------------------------------------------
export const saveProfile = callable(async (d, uid) => {
  const firstName = String(d.firstName || '').trim().slice(0, 40);
  const lastName = String(d.lastName || '').trim().slice(0, 60);
  if (!firstName || !moderateText(firstName).ok) bad('Prénom invalide.');
  if (lastName && !moderateText(lastName).ok) bad('Nom invalide.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.birth || '')) bad('Date de naissance invalide.');
  const age = ageOf(d.birth);
  if (age == null || age > 120) bad('Date de naissance invalide.');
  if (age < MIN_AGE) bad(`Réservé aux ${MIN_AGE} ans et plus.`);
  if (!Object.values(GENDER).includes(d.gender)) bad('Genre invalide.');
  if (!Object.values(ATTRACTION).includes(d.attraction)) bad('Attirance invalide.');
  const traits = d.traits;
  if (!Array.isArray(traits) || traits.length !== 12 || !traits.every((t) => num(t) != null && t >= 0 && t <= 1)) {
    bad('Empreinte invalide.');
  }
  if (d.photo) {
    const check = moderatePhoto(d.photo);
    if (!check.ok) bad(check.reason);
  }

  const snap = await userRef(uid).get();
  const existing = snap.exists ? snap.data() : null;
  const fields = {
    first_name: firstName, last_name: lastName, birth: d.birth,
    gender: d.gender, attraction: d.attraction, updated_at: Date.now(),
  };
  if (d.photo) fields.photo_path = await savePhoto(uid, d.photo, 'profile');

  // The shape ("empreinte") can only change once every 30 days.
  const shape = { traits, hour: num(d.hour), vol: num(d.vol), el: num(d.el) };
  let shapeLocked = false;
  if (!existing) {
    Object.assign(fields, { shape, shape_edited_at: Date.now(), created_at: Date.now(), open_reports: 0, emergency: null });
  } else if (JSON.stringify(existing.shape) !== JSON.stringify(shape)) {
    if (Date.now() - (existing.shape_edited_at || 0) < SHAPE_COOLDOWN_MS) shapeLocked = true;
    else Object.assign(fields, { shape, shape_edited_at: Date.now() });
  }
  await userRef(uid).set(fields, { merge: true });
  if (!existing) {
    await presenceRef(uid).set({
      mode: MODE.GHOST, radius: DEFAULT_RADIUS_M, lat: null, lng: null, geohash: null,
      session_id: null, last_session_id: null, updated_at: Date.now(),
    });
  }
  const editedAt = fields.shape_edited_at || existing?.shape_edited_at || Date.now();
  return { shapeLocked, shapeEditableAt: editedAt + SHAPE_COOLDOWN_MS };
}, { needProfile: false });

export const deleteAccount = callable(async (d, uid) => {
  await withSession(uid, (tx, s) => fail(tx, s, uid, 'account-deleted')).catch(() => {});
  const [sessions, matches, pairs, reports] = await Promise.all([
    db.collection('sessions').where('users', 'array-contains', uid).get(),
    db.collection('matches').where('users', 'array-contains', uid).get(),
    db.collection('pairs').where('users', 'array-contains', uid).get(),
    db.collection('reports').where('reporter_id', '==', uid).get(),
  ]);
  const batch = db.batch();
  for (const snap of [sessions, matches, pairs, reports]) for (const doc of snap.docs) batch.delete(doc.ref);
  batch.delete(presenceRef(uid));
  await batch.commit();
  await db.recursiveDelete(userRef(uid));
  await bucket().deleteFiles({ prefix: `photos/${uid}/` });
  return { deleted: true };
});

// ---- Radar ---------------------------------------------------------------
// setAvailability {mode, radius} and periodic position updates {lat, lng}.
export const setAvailability = callable(async (d, uid) => {
  const patch = { updated_at: Date.now() };
  if (d.mode != null) {
    if (![MODE.GHOST, MODE.FULL].includes(d.mode)) bad('mode invalide');
    patch.mode = d.mode;
  }
  if (d.radius != null) {
    const r = num(d.radius);
    if (r == null || r <= 0) bad('radius invalide');
    patch.radius = Math.min(r, MAX_RADIUS_M);
  }
  const c = coordsOf(d);
  if (c) Object.assign(patch, c, { geohash: geohashForLocation([c.lat, c.lng]) });
  await presenceRef(uid).set(patch, { merge: true });
  const p = (await presenceRef(uid).get()).data();
  if (p.mode === MODE.FULL) await scanForMatch(uid, p);
  return { mode: p.mode, radius: p.radius, located: p.lat != null };
});

const attracted = (attraction, gender) => attraction === ATTRACTION.LES_DEUX || attraction === gender;

async function scanForMatch(uid, me) {
  if (me.lat == null || me.session_id) return;
  const meSnap = await userRef(uid).get();
  const meUser = { id: uid, ...meSnap.data() };
  if ((meUser.open_reports || 0) >= 3) return;

  const radius = me.radius || DEFAULT_RADIUS_M;
  const snaps = await Promise.all(
    geohashQueryBounds([me.lat, me.lng], radius).map(([start, end]) =>
      db.collection('presence').where('mode', '==', MODE.FULL).orderBy('geohash').startAt(start).endAt(end).get())
  );
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  const seen = new Set();
  for (const doc of snaps.flatMap((s) => s.docs)) {
    if (doc.id === uid || seen.has(doc.id)) continue;
    seen.add(doc.id);
    const c = doc.data();
    if (c.session_id || c.updated_at < cutoff || c.lat == null) continue;
    const dist = distanceBetween([me.lat, me.lng], [c.lat, c.lng]) * 1000;
    if (dist > Math.min(radius, c.radius || DEFAULT_RADIUS_M)) continue;
    const oSnap = await userRef(doc.id).get();
    if (!oSnap.exists) continue;
    const other = { id: doc.id, ...oSnap.data() };
    if (!attracted(meUser.attraction, other.gender) || !attracted(other.attraction, meUser.gender)) continue;
    if ((other.open_reports || 0) >= 3) continue;
    if (await openSession(meUser, other, dist)) return;
  }
}

// Atomic: both must still be free, and the pair must never have met (or been blocked).
function openSession(a, b, distance) {
  return db.runTransaction(async (tx) => {
    const [pa, pb, pair] = await Promise.all([tx.get(presenceRef(a.id)), tx.get(presenceRef(b.id)), tx.get(pairRef(a.id, b.id))]);
    if (pair.exists) return false;
    for (const p of [pa, pb]) if (!p.exists || p.data().session_id || p.data().mode !== MODE.FULL) return false;

    // "Elle" decides first. Without exactly one woman in the pair, the person found second does.
    const first = a.gender === GENDER.FEMME && b.gender !== GENDER.FEMME ? a.id : b.id;
    const ref = db.collection('sessions').doc();
    tx.set(ref, {
      users: [a.id, b.id], user_a: a.id, user_b: b.id, first_decider: first, status: S.PENDING,
      distance: Math.round(distance), interest: {}, photos: {}, defis: {}, defi_index: null, place: null,
      created_at: Date.now(), step_at: Date.now(),
    });
    for (const p of [pa, pb]) tx.update(p.ref, { session_id: ref.id, last_session_id: ref.id });
    tx.set(pairRef(a.id, b.id), { users: [a.id, b.id], session_id: ref.id, blocked: false, created_at: Date.now() });
    emit(tx, a.id, 'interest', publicProfile(b));
    emit(tx, b.id, 'interest', publicProfile(a));
    return true;
  });
}

// ---- Session steps -------------------------------------------------------
const otherOf = (s, uid) => (s.user_a === uid ? s.user_b : s.user_a);
const secondOf = (s) => otherOf(s, s.first_decider);
const expired = (s) => STEP_TTL_MS[s.status] && Date.now() - s.step_at > STEP_TTL_MS[s.status];

class Expired extends Error {}

// Runs fn inside a transaction on the user's live session. A session past its
// step deadline is failed (committed) and the call is rejected.
async function withSession(uid, fn) {
  try {
    return await db.runTransaction(async (tx) => {
      const p = await tx.get(presenceRef(uid));
      const sid = p.exists ? p.data().session_id : null;
      if (!sid) throw new HttpsError('not-found', 'aucune session en cours');
      const snap = await tx.get(sessionRef(sid));
      const s = { id: sid, ...snap.data() };
      if (!snap.exists || TERMINAL.has(s.status)) throw new HttpsError('not-found', 'aucune session en cours');
      if (expired(s)) { fail(tx, s, null, 'timeout'); return Expired; }
      return fn(tx, s);
    }).then((r) => { if (r === Expired) throw new Expired(); return r; });
  } catch (e) {
    if (e instanceof Expired) throw new HttpsError('deadline-exceeded', 'session expirée');
    throw e;
  }
}

function setStatus(tx, s, fields) {
  tx.update(sessionRef(s.id), { ...fields, ...(fields.status ? { step_at: Date.now() } : {}) });
}

export const respondInterest = callable(async (d, uid) => withSession(uid, (tx, s) => {
  if (d.accept !== true) return fail(tx, s, uid, 'declined');
  if (s.status !== S.PENDING) throw new HttpsError('failed-precondition', 'étape invalide');
  const interest = { ...s.interest, [uid]: true };
  if (interest[s.user_a] && interest[s.user_b]) {
    const defiIndex = Math.floor(Math.random() * DEFI_COUNT);
    setStatus(tx, s, { interest, status: S.CHALLENGE, defi_index: defiIndex });
    for (const u of s.users) emit(tx, u, 'challenge', { defiIndex });
  } else {
    setStatus(tx, s, { interest });
  }
  return { ok: true };
}));

// image may be null: the UI lets a user "shoot" without attaching a file.
export const sendChallengePhoto = callable(async (d, uid) => {
  if (d.image) {
    const check = moderatePhoto(d.image);
    if (!check.ok) bad(check.reason);
  }
  const path = d.image ? await savePhoto(uid, d.image, 'challenge') : null;
  return withSession(uid, (tx, s) => {
    if (s.status !== S.CHALLENGE) throw new HttpsError('failed-precondition', 'étape invalide');
    if (uid in s.photos) throw new HttpsError('already-exists', 'photo déjà envoyée');
    const photos = { ...s.photos, [uid]: path };
    const defis = { ...s.defis, [uid]: String(d.defi || '').slice(0, 120) };
    if (s.user_a in photos && s.user_b in photos) {
      setStatus(tx, s, { photos, defis, status: S.FIRST });
      // Only the first decider moves on to REVIEW; the other stays on "her turn".
      emit(tx, s.first_decider, 'herDecision', { accept: true });
    } else {
      setStatus(tx, s, { photos, defis });
    }
    return { ok: true };
  });
});

export const decide = callable(async (d, uid) => withSession(uid, async (tx, s) => {
  if (d.accept !== true) return fail(tx, s, uid, 'declined');
  if (s.status === S.FIRST && uid === s.first_decider) {
    setStatus(tx, s, { status: S.SECOND });
    emit(tx, secondOf(s), 'herDecision', { accept: true });
    return { ok: true };
  }
  if (s.status === S.SECOND && uid === secondOf(s)) return complete(tx, s);
  // Sequential consent: nobody can accept out of turn.
  throw new HttpsError('failed-precondition', 'ce n’est pas ton tour de décider');
}));

async function complete(tx, s) {
  // Transaction rule: every read before any write.
  const [pa, pb, ua, ub, ma, mb] = await Promise.all([
    tx.get(presenceRef(s.user_a)), tx.get(presenceRef(s.user_b)),
    tx.get(userRef(s.user_a)), tx.get(userRef(s.user_b)),
    tx.get(db.collection('matches').where('users', 'array-contains', s.user_a)),
    tx.get(db.collection('matches').where('users', 'array-contains', s.user_b)),
  ]);
  const place = meetingPlace(pa.data(), pb.data());
  const ref = db.collection('matches').doc();
  const m = {
    users: [s.user_a, s.user_b], session_id: s.id, place, matched_at: Date.now(),
    names: { [s.user_a]: ua.data().first_name, [s.user_b]: ub.data().first_name },
  };
  tx.set(ref, m);
  setStatus(tx, s, { status: S.MATCH, place });
  const all = { [s.user_a]: ma, [s.user_b]: mb };
  for (const u of s.users) {
    const list = [{ id: ref.id, ...m }, ...all[u].docs.map((x) => ({ id: x.id, ...x.data() }))];
    emit(tx, u, 'match', matchView({ id: ref.id, ...m }, u), 0);
    emit(tx, u, 'matches', { list: sortMatches(list).map((x) => matchView(x, u)) }, 1);
  }
  release(tx, s);
  return { ok: true };
}

// byUid: who ended it (null = timeout). Everyone else sees "by: 'her'".
function fail(tx, s, byUid, reason) {
  const blockers = byUid ? [byUid] : blockersOf(s);
  setStatus(tx, s, { status: S.FAILED, failed_at: s.status, fail_reason: reason, failed_by: byUid });
  for (const u of s.users) emit(tx, u, 'failed', { by: blockers.includes(u) ? 'me' : 'her' });
  release(tx, s);
  return { ok: true };
}

// Who the session was waiting on when it timed out.
function blockersOf(s) {
  if (s.status === S.PENDING) return s.users.filter((u) => !s.interest[u]);
  if (s.status === S.CHALLENGE) return s.users.filter((u) => !(u in s.photos));
  if (s.status === S.FIRST) return [s.first_decider];
  if (s.status === S.SECOND) return [secondOf(s)];
  return s.users;
}

// The UI goes back to Ghost after a session (closeSession): mirror it here.
function release(tx, s) {
  for (const u of s.users) tx.update(presenceRef(u), { session_id: null, mode: MODE.GHOST });
}

// Timeouts: every minute, plus lazily on any action (withSession).
export const sweepTimeouts = onSchedule('every 1 minutes', async () => {
  const live = await db.collection('sessions').where('status', 'in', LIVE_STATUSES).get();
  for (const doc of live.docs) {
    if (!expired(doc.data())) continue;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(doc.ref);
      const s = { id: doc.id, ...snap.data() };
      if (!TERMINAL.has(s.status) && expired(s)) fail(tx, s, null, 'timeout');
    });
  }
});

// ---- Photo reveal --------------------------------------------------------
// The other person's challenge photo, only once the sequential rule allows it.
export const getOtherPhoto = callable(async (d, uid) => {
  const p = (await presenceRef(uid).get()).data();
  const snap = p?.last_session_id ? await sessionRef(p.last_session_id).get() : null;
  if (!snap?.exists) throw new HttpsError('not-found', 'photo non disponible');
  const s = snap.data();
  const step = s.status === S.FAILED ? s.failed_at : s.status;
  const first = s.first_decider;
  let path = null;
  if (uid === first && [S.FIRST, S.SECOND, S.MATCH].includes(step)) path = s.photos[secondOf(s)];
  if (uid !== first && [S.SECOND, S.MATCH].includes(step)) path = s.photos[first];
  if (!path) throw new HttpsError('not-found', 'photo non disponible');
  return { image: await readPhoto(path) };
});

// ---- Matches -------------------------------------------------------------
const sortMatches = (list) => list.sort((a, b) => b.matched_at - a.matched_at);

function matchView(m, uid) {
  const otherId = m.users[0] === uid ? m.users[1] : m.users[0];
  return { id: m.id, name: m.names[otherId] || '', ...m.place };
}

export const listMatches = callable(async (d, uid) => {
  const snap = await db.collection('matches').where('users', 'array-contains', uid).get();
  return { list: sortMatches(snap.docs.map((x) => ({ id: x.id, ...x.data() }))).map((m) => matchView(m, uid)) };
}, { needProfile: false }); // called at startup, before onboarding too

function meetingPlace(a, b) {
  const mid = { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  let best = null, bestD = Infinity;
  for (const p of MEETING_SPOTS) {
    const dist = distanceBetween([mid.lat, mid.lng], [p.lat, p.lng]) * 1000;
    if (dist < bestD) { best = p; bestD = dist; }
  }
  if (best && bestD <= SPOT_MAX_DISTANCE_M) return { spot: best.spot, addr: best.addr, mapsQuery: best.mapsQuery };
  const q = `${mid.lat.toFixed(5)},${mid.lng.toFixed(5)}`;
  return { spot: 'POINT DE RENCONTRE', addr: 'À mi-chemin entre vous deux', mapsQuery: q };
}

// ---- Safety --------------------------------------------------------------
// The UI only knows the other person's first name: the report targets the
// other participant of the user's current (or most recent) session.
export const report = callable(async (d, uid) => {
  const idx = num(d.reasonIndex);
  if (idx == null || !REPORT_REASONS[idx]) bad('raison invalide');
  const p = (await presenceRef(uid).get()).data();
  const sid = p?.last_session_id;
  if (!sid) bad('personne à signaler introuvable');
  const sSnap = await sessionRef(sid).get();
  const s = { id: sid, ...sSnap.data() };
  const reportedId = otherOf(s, uid);
  const ref = db.collection('reports').doc();
  await db.runTransaction(async (tx) => {
    const live = (await tx.get(sessionRef(sid))).data();
    tx.set(ref, {
      reporter_id: uid, reported_id: reportedId, session_id: sid, reason: REPORT_REASONS[idx],
      name: String(d.name || '').slice(0, 40), status: 'open', created_at: Date.now(),
    });
    tx.update(userRef(reportedId), { open_reports: FieldValue.increment(1) });
    // Reporting also blocks: they will never be proposed to each other again.
    tx.set(pairRef(uid, reportedId), { blocked: true, blocked_by: uid }, { merge: true });
    if (!TERMINAL.has(live.status)) fail(tx, { ...s, ...live }, uid, 'reported');
  });
  return { reported: true, id: ref.id };
});

export const alert = callable(async (d, uid, user) => {
  if (!['text', 'danger'].includes(d.type)) bad('type invalide');
  const p = (await presenceRef(uid).get()).data();
  const coords = coordsOf(d) || (p?.lat != null ? { lat: p.lat, lng: p.lng } : null);
  const ref = await db.collection('alerts').add({
    user_id: uid, type: d.type, position: coords, session_id: p?.last_session_id || null,
    emergency: user.emergency || null, created_at: Date.now(),
  });
  console.warn(`[ALERT] ${d.type} user=${uid} contact=${user.emergency?.phone || '—'}`);
  if (ALERT_WEBHOOK_URL) {
    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ref.id, type: d.type, at: new Date().toISOString(), user: publicProfile(user),
        emergency: user.emergency || null, position: coords,
        mapsUrl: coords ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}` : null,
      }),
    }).catch((e) => console.error('alert webhook error', e.message));
  }
  return { ok: true, id: ref.id, forwarded: !!ALERT_WEBHOOK_URL };
});

export const saveEmergencyContact = callable(async (d, uid) => {
  const name = String(d.name || '').trim().slice(0, 60);
  const phone = String(d.phone || '').trim();
  if (!name) bad('nom requis');
  if (!/^\+?[\d\s.()-]{6,20}$/.test(phone)) bad('téléphone invalide');
  await userRef(uid).update({ emergency: { name, phone } });
  return { ok: true };
});
