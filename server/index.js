// ---------------------------------------------------------------------------
// Clove — HTTP + WebSocket server. Zero external dependencies (Node built-ins).
// Serves the compiled front (web/) and the API used by web/clove-api.js.
// ---------------------------------------------------------------------------
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname, sep } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';

import * as store from './store.js';
import * as hub from './hub.js';
import * as engine from './matchEngine.js';
import { attachWebSocket } from './ws.js';
import {
  MODE, GENDER, ATTRACTION, MIN_AGE, MAX_RADIUS_M, SHAPE_COOLDOWN_MS, REPORT_REASONS,
} from './constants.js';
import { moderateText, moderatePhoto } from './moderation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const webDir = join(__dirname, '..', 'web');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';

// ---- Tiny router ---------------------------------------------------------
const routes = [];
function route(method, path, handler, { auth = true } = {}) {
  routes.push({ method, path, handler, auth });
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => { throw new HttpError(400, msg); };

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 12 * 1024 * 1024) { req.destroy(); return; } // photos are data URLs
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function tokenOf(req) {
  const header = req.headers['authorization'] || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return new URL(req.url, 'http://localhost').searchParams.get('token');
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function validCoords(body) {
  const lat = num(body.lat), lng = num(body.lng);
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// ---- Profile -------------------------------------------------------------
// saveProfile — creates the account on first call, updates it afterwards.
route('POST', '/api/profile', async (req, res, body) => {
  const existing = store.getUserByToken(tokenOf(req) || '');
  const firstName = String(body.firstName || '').trim().slice(0, 40);
  const lastName = String(body.lastName || '').trim().slice(0, 60);
  if (!firstName || !moderateText(firstName).ok) bad('Prénom invalide.');
  if (lastName && !moderateText(lastName).ok) bad('Nom invalide.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.birth || '')) bad('Date de naissance invalide.');
  const age = store.ageOf({ birth: body.birth });
  if (age == null || age > 120) bad('Date de naissance invalide.');
  if (age < MIN_AGE) bad(`Réservé aux ${MIN_AGE} ans et plus.`);
  if (!Object.values(GENDER).includes(body.gender)) bad('Genre invalide.');
  if (!Object.values(ATTRACTION).includes(body.attraction)) bad('Attirance invalide.');
  const traits = body.traits;
  if (!Array.isArray(traits) || traits.length !== 12 || !traits.every((t) => num(t) != null && t >= 0 && t <= 1)) {
    bad('Empreinte invalide.');
  }
  let photoId = existing?.photo_id || null;
  if (body.photo) {
    const check = moderatePhoto(body.photo);
    if (!check.ok) bad(check.reason);
    photoId = store.savePhoto(body.photo);
  }

  const fields = {
    first_name: firstName, last_name: lastName, birth: body.birth,
    gender: body.gender, attraction: body.attraction, photo_id: photoId,
    hour: num(body.hour), vol: num(body.vol), el: num(body.el),
  };

  // The shape ("empreinte") can only change once every 30 days.
  const shape = { traits, hour: fields.hour, vol: fields.vol, el: fields.el };
  let shapeLocked = false;
  if (existing) {
    const prev = JSON.stringify({ traits: existing.traits, hour: existing.hour, vol: existing.vol, el: existing.el });
    const changed = prev !== JSON.stringify(shape);
    if (changed && Date.now() - (existing.shape_edited_at || 0) < SHAPE_COOLDOWN_MS) {
      shapeLocked = true;
      Object.assign(fields, { hour: existing.hour, vol: existing.vol, el: existing.el });
    } else if (changed) {
      Object.assign(fields, { traits, shape_edited_at: Date.now() });
    }
    const u = store.updateUser(existing.id, fields);
    return json(res, 200, { token: u.token, shapeLocked, shapeEditableAt: (u.shape_edited_at || 0) + SHAPE_COOLDOWN_MS });
  }
  const u = store.createUser({ ...fields, traits, shape_edited_at: Date.now() });
  json(res, 200, { token: u.token, shapeLocked: false, shapeEditableAt: u.shape_edited_at + SHAPE_COOLDOWN_MS });
}, { auth: false });

route('GET', '/api/me', (req, res, body, u) => {
  json(res, 200, { ...store.publicProfile(u), emergency: u.emergency, shapeEditableAt: (u.shape_edited_at || 0) + SHAPE_COOLDOWN_MS });
});

route('DELETE', '/api/me', (req, res, body, u) => {
  const live = store.liveSessionFor(u.id);
  if (live) engine.fail(live, u.id, 'account-deleted');
  store.deleteAccount(u.id);
  json(res, 200, { deleted: true });
});

// ---- Radar ---------------------------------------------------------------
// setAvailability {mode, radius} and periodic position updates {lat, lng}.
route('POST', '/api/availability', (req, res, body, u) => {
  const patch = {};
  if (body.mode != null) {
    if (![MODE.GHOST, MODE.FULL].includes(body.mode)) bad('mode invalide');
    patch.mode = body.mode;
  }
  if (body.radius != null) {
    const r = num(body.radius);
    if (r == null || r <= 0) bad('radius invalide');
    patch.radius = Math.min(r, MAX_RADIUS_M);
  }
  const coords = validCoords(body);
  if (coords) Object.assign(patch, coords);
  const p = store.updatePresence(u.id, patch);
  if (p.mode === MODE.FULL) engine.scanForMatch(u.id);
  json(res, 200, { mode: p.mode, radius: p.radius, located: p.lat != null });
});

// ---- Session -------------------------------------------------------------
route('POST', '/api/interest', (req, res, body, u) => {
  engine.respondInterest(u.id, body.accept === true);
  json(res, 200, { ok: true });
});

route('POST', '/api/challenge-photo', (req, res, body, u) => {
  let photoId = null;
  if (body.image) {
    const check = moderatePhoto(body.image);
    if (!check.ok) bad(check.reason);
    photoId = store.savePhoto(body.image);
  }
  engine.submitPhoto(u.id, photoId, String(body.defi || '').slice(0, 120));
  json(res, 200, { ok: true });
});

route('POST', '/api/decide', (req, res, body, u) => {
  engine.decide(u.id, body.accept === true);
  json(res, 200, { ok: true });
});

// The other person's challenge photo, only once the sequential rule allows it.
route('GET', '/api/session/photo', (req, res, body, u) => {
  const photo = store.readPhoto(engine.visibleOtherPhoto(u.id));
  if (!photo) return json(res, 404, { error: 'photo non disponible' });
  res.writeHead(200, { 'Content-Type': photo.type, 'Cache-Control': 'private, no-store' });
  res.end(photo.data);
});

route('GET', '/api/matches', (req, res, body, u) => {
  json(res, 200, { list: engine.matchesFor(u.id) });
});

// ---- Safety --------------------------------------------------------------
// The UI only knows the other person's first name: the report targets the
// other participant of the user's current (or most recent) session.
route('POST', '/api/report', (req, res, body, u) => {
  const idx = num(body.reasonIndex);
  if (idx == null || !REPORT_REASONS[idx]) bad('raison invalide');
  const s = store.lastSessionFor(u.id);
  if (!s) bad('personne à signaler introuvable');
  const reportedId = s.user_a === u.id ? s.user_b : s.user_a;
  const r = store.createReport({
    reporter_id: u.id, reported_id: reportedId, session_id: s.id,
    reason: REPORT_REASONS[idx], name: String(body.name || '').slice(0, 40),
  });
  // Reporting also blocks: they will never be proposed to each other again.
  store.blockUser(u.id, reportedId);
  if (store.liveSessionFor(u.id)?.id === s.id) engine.fail(s, u.id, 'reported');
  json(res, 200, { reported: true, id: r.id });
});

route('POST', '/api/alert', async (req, res, body, u) => {
  if (!['text', 'danger'].includes(body.type)) bad('type invalide');
  const p = store.getPresence(u.id);
  const coords = validCoords(body) || (p?.lat != null ? { lat: p.lat, lng: p.lng } : null);
  const s = store.lastSessionFor(u.id);
  const a = store.createAlert({
    user_id: u.id, type: body.type, ...coords, session_id: s?.id || null, emergency: u.emergency,
  });
  console.warn(`[ALERT] ${body.type} user=${u.id} contact=${u.emergency?.phone || '—'} pos=${coords ? coords.lat + ',' + coords.lng : '—'}`);
  if (ALERT_WEBHOOK_URL) {
    const payload = {
      id: a.id, type: a.type, at: new Date(a.created_at).toISOString(),
      user: store.publicProfile(u), emergency: u.emergency,
      position: coords, mapsUrl: coords ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}` : null,
    };
    fetch(ALERT_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .catch((e) => console.error('alert webhook error', e.message));
  }
  json(res, 200, { ok: true, id: a.id, forwarded: !!ALERT_WEBHOOK_URL });
});

route('POST', '/api/emergency-contact', (req, res, body, u) => {
  const name = String(body.name || '').trim().slice(0, 60);
  const phone = String(body.phone || '').trim();
  if (!name) bad('nom requis');
  if (!/^\+?[\d\s.()-]{6,20}$/.test(phone)) bad('téléphone invalide');
  store.updateUser(u.id, { emergency: { name, phone } });
  json(res, 200, { ok: true });
});

route('GET', '/api/health', (req, res) => json(res, 200, { ok: true }), { auth: false });

// ---- Static (web/) -------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const filePath = normalize(join(webDir, rel));
  if (!filePath.startsWith(webDir + sep)) { res.writeHead(403); return res.end('forbidden'); }
  const target = existsSync(filePath) && statSync(filePath).isFile() ? filePath : join(webDir, 'index.html');
  res.writeHead(200, {
    'Content-Type': MIME[extname(target)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  res.end(readFileSync(target));
}

// ---- Dispatch ------------------------------------------------------------
const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    const r = routes.find((x) => x.method === req.method && x.path === pathname);
    if (!r) return json(res, 404, { error: 'not found' });
    try {
      let user = null;
      if (r.auth) {
        user = store.getUserByToken(tokenOf(req) || '');
        if (!user) return json(res, 401, { error: 'unauthorized' });
      }
      const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
      await r.handler(req, res, body, user);
    } catch (e) {
      if (e instanceof HttpError || e instanceof engine.FlowError) return json(res, e.status, { error: e.message });
      console.error('handler error', e);
      if (!res.headersSent) json(res, 500, { error: 'server error' });
    }
    return;
  }
  serveStatic(req, res, pathname);
});

// ---- WebSocket: server → UI events (forwarded to window.__cloveEvent) -----
attachWebSocket(server, '/live', (ws, req) => {
  const user = store.getUserByToken(tokenOf(req) || '');
  if (!user) return ws.close();
  hub.register(user.id, ws);
  ws.send(JSON.stringify({ type: 'matches', data: { list: engine.matchesFor(user.id) } }));
  ws.on('close', () => hub.unregister(user.id, ws));
  ws.on('error', () => hub.unregister(user.id, ws));
});

setInterval(() => {
  try { engine.sweepTimeouts(); } catch (e) { console.error('sweep error', e); }
}, 5000);

server.listen(PORT, () => {
  console.log(`Clove server listening on http://localhost:${PORT}`);
});
