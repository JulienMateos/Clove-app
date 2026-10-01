// End-to-end test of the Clove backend (sequential double consent).
// Starts its own server on a free port with a throwaway data dir:
//   node scripts/e2e.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const PORT = 4100 + Math.floor(Math.random() * 500);
const B = `http://localhost:${PORT}`;
const dataDir = mkdtempSync(join(tmpdir(), 'clove-e2e-'));
const server = spawn('node', ['server/index.js'], {
  env: { ...process.env, PORT: String(PORT), CLOVE_DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((ok) => server.stdout.once('data', ok));

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const traits = Array(12).fill(0.5);

async function api(method, path, token, body) {
  const res = await fetch(B + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.arrayBuffer() };
}

async function user(firstName, gender, attraction, lat, lng) {
  const r = await api('POST', '/api/profile', null, {
    firstName, lastName: 'Test', birth: '1996-05-04', gender, attraction, traits, hour: 19, vol: 2, el: 1, photo: PNG,
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const u = { name: firstName, token: r.body.token, events: [], lat, lng };
  u.ws = new WebSocket(`ws://localhost:${PORT}/live?token=${u.token}`);
  u.ws.onmessage = (e) => u.events.push(JSON.parse(e.data));
  await new Promise((ok) => (u.ws.onopen = ok));
  assert.deepEqual(await nextEvent(u, 'matches'), { list: [] }, 'history pushed on connect');
  return u;
}

async function nextEvent(u, type) {
  for (let i = 0; i < 50; i++) {
    const idx = u.events.findIndex((e) => e.type === type);
    if (idx >= 0) return u.events.splice(idx, 1)[0].data;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`${u.name}: no '${type}' event (got ${u.events.map((e) => e.type)})`);
}
const noEvent = async (u, type) => {
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(!u.events.some((e) => e.type === type), `${u.name} should not get '${type}'`);
};
const go = (u) => api('POST', '/api/availability', u.token, { mode: 'full', radius: 200, lat: u.lat, lng: u.lng });

let ok = false;
try {
  // ── Validation ──
  let r = await api('POST', '/api/profile', null, { firstName: 'Kid', birth: '2015-01-01', gender: 'homme', attraction: 'femme', traits });
  assert.equal(r.status, 400, 'under 17 rejected');
  assert.equal((await api('POST', '/api/decide', 'nope', { accept: true })).status, 401);

  // ── Happy path ──
  const emma = await user('Emma', 'femme', 'homme', 40.4155, -3.7074);
  const leo = await user('Léo', 'homme', 'femme', 40.4157, -3.7075);

  await go(emma);
  await go(leo);
  assert.deepEqual(await nextEvent(emma, 'interest'), { name: 'Léo', age: (await api('GET', '/api/me', leo.token)).body.age });
  const li = await nextEvent(leo, 'interest');
  assert.equal(li.name, 'Emma');
  assert.deepEqual(Object.keys(li).sort(), ['age', 'name'], 'only first name + age leak');

  await api('POST', '/api/interest', emma.token, { accept: true });
  await noEvent(emma, 'challenge');
  await api('POST', '/api/interest', leo.token, { accept: true });
  const ch = await nextEvent(emma, 'challenge');
  assert.ok(ch.defiIndex >= 0 && ch.defiIndex < 7);
  assert.deepEqual(await nextEvent(leo, 'challenge'), ch);

  await api('POST', '/api/challenge-photo', leo.token, { defi: 'TROUVEZ UN OBJET ROUGE', image: PNG });
  r = await api('POST', '/api/decide', leo.token, { accept: true });
  assert.equal(r.status, 409, 'he cannot decide before her');
  await api('POST', '/api/challenge-photo', emma.token, { defi: 'TROUVEZ UN OBJET ROUGE', image: PNG });

  // She decides first; he does not get to REVIEW and cannot see her photo yet.
  assert.deepEqual(await nextEvent(emma, 'herDecision'), { accept: true });
  await noEvent(leo, 'herDecision');
  assert.equal((await api('GET', '/api/session/photo', leo.token)).status, 404, 'his view: her photo hidden');
  assert.equal((await api('GET', '/api/session/photo', emma.token)).status, 200, 'her view: his photo visible');
  assert.equal((await api('POST', '/api/decide', leo.token, { accept: true })).status, 409);

  await api('POST', '/api/decide', emma.token, { accept: true });
  assert.deepEqual(await nextEvent(leo, 'herDecision'), { accept: true });
  assert.equal((await api('GET', '/api/session/photo', leo.token)).status, 200, 'revealed after her yes');

  await api('POST', '/api/decide', leo.token, { accept: true });
  const m1 = await nextEvent(emma, 'match');
  const m2 = await nextEvent(leo, 'match');
  assert.equal(m1.name, 'Léo');
  assert.equal(m2.name, 'Emma');
  assert.equal(m1.spot, 'LE KIOSQUE · PLAZA MAYOR');
  assert.ok(m1.mapsQuery && m1.addr && m1.id === m2.id);
  assert.equal((await nextEvent(leo, 'matches')).list.length, 1);
  assert.equal((await api('GET', '/api/matches', emma.token)).body.list[0].id, m1.id);

  // Same pair is not proposed again.
  await go(emma); await go(leo);
  await noEvent(emma, 'interest');

  // ── She refuses: he never sees her photo ──
  const zoe = await user('Zoé', 'femme', 'homme', 48.8594, 2.3514);
  const tom = await user('Tom', 'homme', 'les_deux', 48.8595, 2.3515);
  await go(zoe); await go(tom);
  await nextEvent(zoe, 'interest'); await nextEvent(tom, 'interest');
  await api('POST', '/api/interest', zoe.token, { accept: true });
  await api('POST', '/api/interest', tom.token, { accept: true });
  await api('POST', '/api/challenge-photo', zoe.token, { image: PNG });
  await api('POST', '/api/challenge-photo', tom.token, { image: PNG });
  await nextEvent(zoe, 'herDecision');
  await api('POST', '/api/decide', zoe.token, { accept: false });
  assert.deepEqual(await nextEvent(tom, 'failed'), { by: 'her' });
  assert.deepEqual(await nextEvent(zoe, 'failed'), { by: 'me' });
  assert.equal((await api('GET', '/api/session/photo', tom.token)).status, 404, 'never sees her photo');

  // ── Incompatible attraction: no session ──
  const ana = await user('Ana', 'femme', 'femme', 48.8722, 2.3655);
  const max = await user('Max', 'homme', 'femme', 48.8722, 2.3656);
  await go(ana); await go(max);
  await noEvent(ana, 'interest');

  // ── Safety ──
  assert.equal((await api('POST', '/api/report', tom.token, { name: 'ZOÉ', reasonIndex: 2 })).status, 200);
  assert.equal((await api('POST', '/api/emergency-contact', emma.token, { name: 'Maman', phone: '+33 6 12 34 56 78' })).status, 200);
  r = await api('POST', '/api/alert', emma.token, { type: 'danger' });
  assert.equal(r.status, 200);
  assert.equal((await api('POST', '/api/alert', emma.token, { type: 'boom' })).status, 400);

  // ── Shape locked for 30 days ──
  r = await api('POST', '/api/profile', emma.token, {
    firstName: 'Emma', birth: '1996-05-04', gender: 'femme', attraction: 'homme', traits: Array(12).fill(0.9), hour: 19, vol: 2, el: 1,
  });
  assert.equal(r.body.shapeLocked, true);

  // ── Static front + bridge served ──
  const html = await fetch(B + '/').then((x) => x.text());
  assert.ok(html.includes('clove-api.js'));
  assert.ok((await fetch(B + '/clove-api.js').then((x) => x.text())).includes('/api/challenge-photo'));

  for (const u of [emma, leo, zoe, tom, ana, max]) u.ws.close();
  ok = true;
  console.log('E2E OK');
} finally {
  const exited = new Promise((r) => server.once('exit', r));
  server.kill();
  await exited;
  rmSync(dataDir, { recursive: true, force: true });
  if (!ok) process.exitCode = 1;
}
