// End-to-end test of the Clove Firebase backend (sequential double consent).
// Runs against the local emulators (auth, firestore, functions, storage):
//   npm test
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { initializeApp as initAdmin } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';

const PROJECT = 'demo-clove';
const admin = adminFirestore(initAdmin({ projectId: PROJECT }));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const traits = Array(12).fill(0.5);
let n = 0;

async function client(label) {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT, appId: 'demo' }, `c${n++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const fns = getFunctions(app, 'europe-west1');
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  const { user } = await signInAnonymously(auth);
  const c = { label, uid: user.uid, db, events: [] };
  // Same inbox handling as web/clove-api.js: read, then delete.
  c.unsub = onSnapshot(collection(db, 'users', user.uid, 'events'), (snap) => {
    for (const ch of snap.docChanges()) {
      if (ch.type !== 'added') continue;
      c.events.push(ch.doc.data());
      deleteDoc(ch.doc.ref);
    }
  });
  c.call = (name, data = {}) => httpsCallable(fns, name)(data).then((r) => r.data);
  c.fails = (name, data, code) => httpsCallable(fns, name)(data).then(
    () => assert.fail(`${label}.${name} should fail with ${code}`),
    (e) => assert.equal(e.code, `functions/${code}`, `${label}.${name}: ${e.message}`)
  );
  return c;
}

async function user(firstName, gender, attraction, lat, lng) {
  const c = await client(firstName);
  await c.call('saveProfile', { firstName, lastName: 'Test', birth: '1996-05-04', gender, attraction, traits, hour: 19, vol: 2, el: 1, photo: PNG });
  Object.assign(c, { lat, lng });
  return c;
}

async function nextEvent(c, type) {
  for (let i = 0; i < 100; i++) {
    const idx = c.events.findIndex((e) => e.type === type);
    if (idx >= 0) return c.events.splice(idx, 1)[0].data;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`${c.label}: no '${type}' event (got ${c.events.map((e) => e.type)})`);
}
const noEvent = async (c, type) => {
  await new Promise((r) => setTimeout(r, 700));
  assert.ok(!c.events.some((e) => e.type === type), `${c.label} should not get '${type}'`);
};
const go = (c) => c.call('setAvailability', { mode: 'full', radius: 200, lat: c.lat, lng: c.lng });

// ── Validation & security rules ──
const anon = await client('anon');
await anon.fails('saveProfile', { firstName: 'Kid', birth: '2015-01-01', gender: 'homme', attraction: 'femme', traits }, 'invalid-argument');
await anon.fails('decide', { accept: true }, 'failed-precondition'); // no profile yet

// ── Happy path ──
const emma = await user('Emma', 'femme', 'homme', 40.4155, -3.7074);
const leo = await user('Léo', 'homme', 'femme', 40.4157, -3.7075);
await assert.rejects(getDoc(doc(emma.db, 'users', emma.uid)), /permission/i, 'profiles are closed to clients');
await assert.rejects(getDoc(doc(emma.db, 'users', leo.uid, 'events', 'x')), /permission/i, 'other inboxes are closed');

await go(emma);
await go(leo);
const age = new Date().getFullYear() - 1996 - (new Date() < new Date(new Date().getFullYear(), 4, 4) ? 1 : 0);
assert.deepEqual(await nextEvent(emma, 'interest'), { name: 'Léo', age }, 'only first name + age leak');
assert.deepEqual(await nextEvent(leo, 'interest'), { name: 'Emma', age });

await emma.call('respondInterest', { accept: true });
await noEvent(emma, 'challenge');
await leo.call('respondInterest', { accept: true });
const ch = await nextEvent(emma, 'challenge');
assert.ok(ch.defiIndex >= 0 && ch.defiIndex < 7);
assert.deepEqual(await nextEvent(leo, 'challenge'), ch);

await leo.call('sendChallengePhoto', { defi: 'TROUVEZ UN OBJET ROUGE', image: PNG });
await leo.fails('decide', { accept: true }, 'failed-precondition'); // he cannot decide before her
await emma.call('sendChallengePhoto', { defi: 'TROUVEZ UN OBJET ROUGE', image: PNG });

// She decides first; he does not get to REVIEW and cannot see her photo yet.
assert.deepEqual(await nextEvent(emma, 'herDecision'), { accept: true });
await noEvent(leo, 'herDecision');
await leo.fails('getOtherPhoto', {}, 'not-found');
assert.match((await emma.call('getOtherPhoto')).image, /^data:image\/png;base64,/);
await leo.fails('decide', { accept: true }, 'failed-precondition');

await emma.call('decide', { accept: true });
assert.deepEqual(await nextEvent(leo, 'herDecision'), { accept: true });
assert.match((await leo.call('getOtherPhoto')).image, /^data:image/, 'revealed after her yes');

await leo.call('decide', { accept: true });
const m1 = await nextEvent(emma, 'match');
const m2 = await nextEvent(leo, 'match');
assert.equal(m1.name, 'Léo');
assert.equal(m2.name, 'Emma');
assert.equal(m1.spot, 'LE KIOSQUE · PLAZA MAYOR');
assert.ok(m1.mapsQuery && m1.addr && m1.id === m2.id);
assert.equal((await nextEvent(leo, 'matches')).list.length, 1);
assert.equal((await emma.call('listMatches')).list[0].id, m1.id);

// Same pair is not proposed again.
await go(emma); await go(leo);
await noEvent(emma, 'interest');

// ── She refuses: he never sees her photo ──
const zoe = await user('Zoé', 'femme', 'homme', 48.8594, 2.3514);
const tom = await user('Tom', 'homme', 'les_deux', 48.8595, 2.3515);
await go(zoe); await go(tom);
await nextEvent(zoe, 'interest'); await nextEvent(tom, 'interest');
await zoe.call('respondInterest', { accept: true });
await tom.call('respondInterest', { accept: true });
await zoe.call('sendChallengePhoto', { image: PNG });
await tom.call('sendChallengePhoto', { image: PNG });
await nextEvent(zoe, 'herDecision');
await zoe.call('decide', { accept: false });
assert.deepEqual(await nextEvent(tom, 'failed'), { by: 'her' });
assert.deepEqual(await nextEvent(zoe, 'failed'), { by: 'me' });
await tom.fails('getOtherPhoto', {}, 'not-found');

// ── Incompatible attraction: no session ──
const ana = await user('Ana', 'femme', 'femme', 48.8722, 2.3655);
const max = await user('Max', 'homme', 'femme', 48.8722, 2.3656);
await go(ana); await go(max);
await noEvent(ana, 'interest');

// ── Timeout: a stalled step fails the session ──
const ines = await user('Inès', 'femme', 'homme', 40.9481, -4.1184);
const hugo = await user('Hugo', 'homme', 'femme', 40.9482, -4.1184);
await go(ines); await go(hugo);
await nextEvent(ines, 'interest'); await nextEvent(hugo, 'interest');
await ines.call('respondInterest', { accept: true });
const sid = (await admin.doc(`presence/${ines.uid}`).get()).get('session_id');
await admin.doc(`sessions/${sid}`).update({ step_at: Date.now() - 10 * 60 * 1000 });
await hugo.fails('respondInterest', { accept: true }, 'deadline-exceeded');
assert.deepEqual(await nextEvent(hugo, 'failed'), { by: 'me' }, 'he was the one who stalled');
assert.deepEqual(await nextEvent(ines, 'failed'), { by: 'her' });

// ── Safety ──
assert.equal((await tom.call('report', { name: 'ZOÉ', reasonIndex: 2 })).reported, true);
assert.equal((await admin.doc(`users/${zoe.uid}`).get()).get('open_reports'), 1);
await emma.call('saveEmergencyContact', { name: 'Maman', phone: '+33 6 12 34 56 78' });
assert.equal((await emma.call('alert', { type: 'danger' })).ok, true);
await emma.fails('alert', { type: 'boom' }, 'invalid-argument');

// ── Shape locked for 30 days ──
const r = await emma.call('saveProfile', {
  firstName: 'Emma', birth: '1996-05-04', gender: 'femme', attraction: 'homme', traits: Array(12).fill(0.9), hour: 19, vol: 2, el: 1,
});
assert.equal(r.shapeLocked, true);

// ── Account deletion ──
await max.call('deleteAccount');
assert.equal((await admin.doc(`users/${max.uid}`).get()).exists, false);

for (const c of [anon, emma, leo, zoe, tom, ana, max, ines, hugo]) c.unsub();
console.log('E2E OK');
process.exit(0);
