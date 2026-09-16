// ---------------------------------------------------------------------------
// Clove — HTTP + WebSocket server. Zero external dependencies (Node built-ins).
// ---------------------------------------------------------------------------
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';

import * as store from './store.js';
import * as hub from './hub.js';
import * as engine from './matchEngine.js';
import { attachWebSocket } from './ws.js';
import { MODE } from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const publicDir = join(__dirname, '..', 'public');

// ---- Tiny router ---------------------------------------------------------
const routes = []; // { method, pattern, handler }
function route(method, path, handler) {
  const keys = [];
  const pattern = new RegExp(
    '^' +
      path.replace(/:[^/]+/g, (m) => {
        keys.push(m.slice(1));
        return '([^/]+)';
      }) +
      '$'
  );
  routes.push({ method, pattern, keys, handler });
}
const get = (p, h) => route('GET', p, h);
const post = (p, h) => route('POST', p, h);
const put = (p, h) => route('PUT', p, h);

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 12 * 1024 * 1024) {
        // 12MB cap (photos are data URLs)
        req.destroy();
        return;
      }
      raw += c;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function authUser(req) {
  const header = req.headers['authorization'] || '';
  const url = new URL(req.url, 'http://localhost');
  const token = header.startsWith('Bearer ') ? header.slice(7) : url.searchParams.get('token');
  return token ? store.getUserByToken(token) : null;
}

// ---- Auth / profile ------------------------------------------------------
post('/api/register', async (req, res, params, body) => {
  const { username, gender, attraction, socialStyle, bio, avatar } = body || {};
  if (!username || !gender || !attraction) {
    return json(res, 400, { error: 'username, gender, attraction requis' });
  }
  const user = store.createUser({
    username: String(username).slice(0, 40),
    gender,
    attraction,
    socialStyle: socialStyle || 'introverti',
    bio: (bio || '').slice(0, 280),
    avatar: avatar || '',
  });
  json(res, 200, { token: user.token, user: safeUser(user), presence: store.getPresence(user.id) });
});

get('/api/me', (req, res) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  json(res, 200, { user: safeUser(u), presence: store.getPresence(u.id) });
});

put('/api/me', (req, res, params, body) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const { username, bio, avatar, socialStyle, attraction } = body || {};
  const updated = store.updateProfile(u.id, { username, bio, avatar, socialStyle, attraction });
  json(res, 200, { user: safeUser(updated) });
});

// ---- Availability & presence ---------------------------------------------
post('/api/mode', (req, res, params, body) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const { mode } = body || {};
  if (![MODE.GHOST, MODE.GLANCE, MODE.FULL].includes(mode)) {
    return json(res, 400, { error: 'mode invalide' });
  }
  const presence = store.setMode(u.id, mode);
  if (mode === MODE.GHOST) store.setLock(u.id, false);
  json(res, 200, { presence });
});

post('/api/heartbeat', (req, res, params, body) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const { lat, lng, radius, mode } = body || {};
  const presence = store.heartbeat(u.id, { lat, lng, radius, mode });

  let session = store.findLiveSessionForUser(u.id);
  if (!session && presence.mode === MODE.FULL && !presence.in_match) {
    session = engine.scanForMatch(u.id);
  }
  const nearby = countNearby(presence);
  json(res, 200, {
    presence,
    nearby,
    session: session ? engine.sessionView(session, u.id) : null,
  });
});

// ---- Match session actions -----------------------------------------------
get('/api/session', (req, res) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const session = store.findLiveSessionForUser(u.id);
  json(res, 200, { session: session ? engine.sessionView(session, u.id) : null });
});

post('/api/session/:id/interest', (req, res, params, body) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const session = engine.respondInterest(params.id, u.id, !!body?.interested);
  json(res, 200, { session: session ? engine.sessionView(session, u.id) : null });
});

post('/api/session/:id/photo', (req, res, params, body) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  if (!body?.photoUrl) return json(res, 400, { error: 'photoUrl requis' });
  const session = engine.submitPhoto(params.id, u.id, body.photoUrl);
  json(res, 200, { session: session ? engine.sessionView(session, u.id) : null });
});

post('/api/session/:id/review', (req, res, params, body) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const session = engine.reviewDecision(params.id, u.id, !!body?.accept);
  json(res, 200, { session: session ? engine.sessionView(session, u.id) : null });
});

post('/api/session/:id/cancel', (req, res, params) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const session = engine.cancelSession(params.id, 'user-cancel');
  json(res, 200, { session: session ? engine.sessionView(session, u.id) : null });
});

// ---- Matches & messaging -------------------------------------------------
get('/api/matches', (req, res) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const rows = store.matchesForUser(u.id);
  const matches = rows.map((m) => {
    const otherId = m.user_a === u.id ? m.user_b : m.user_a;
    const other = store.getUserById(otherId);
    return {
      id: m.id,
      other: store.publicProfile(other, 'full'),
      meetingSpot: m.meeting_spot ? JSON.parse(m.meeting_spot) : null,
      matchedAt: m.matched_at,
    };
  });
  json(res, 200, { matches });
});

get('/api/matches/:id/messages', (req, res, params) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const match = store.getMatch(params.id);
  if (!match || (match.user_a !== u.id && match.user_b !== u.id)) {
    return json(res, 404, { error: 'not found' });
  }
  json(res, 200, { messages: store.messagesForMatch(match.id) });
});

post('/api/matches/:id/messages', (req, res, params, body) => {
  const u = authUser(req);
  if (!u) return json(res, 401, { error: 'unauthorized' });
  const match = store.getMatch(params.id);
  if (!match || (match.user_a !== u.id && match.user_b !== u.id)) {
    return json(res, 404, { error: 'not found' });
  }
  const text = (body?.body || '').toString().slice(0, 1000);
  if (!text.trim()) return json(res, 400, { error: 'message vide' });
  const msg = store.addMessage(match.id, u.id, text);
  const otherId = match.user_a === u.id ? match.user_b : match.user_a;
  hub.sendTo(otherId, 'message', { matchId: match.id, message: msg });
  json(res, 200, { message: msg });
});

// ---- Helpers -------------------------------------------------------------
function safeUser(u) {
  return {
    id: u.id,
    username: u.username,
    gender: u.gender,
    attraction: u.attraction,
    socialStyle: u.social_style,
    bio: u.bio,
    avatar: u.avatar,
    verified: !!u.verified,
  };
}

function countNearby(presence) {
  if (!presence || presence.lat == null || presence.mode === MODE.GHOST) return 0;
  const all = store.activePresences();
  let n = 0;
  for (const p of all) {
    if (p.user_id === presence.user_id) continue;
    const d = quickDist(presence, p);
    if (d <= (presence.radius || 120) * 5) n++;
  }
  return n;
}
function quickDist(a, b) {
  if (a.lat == null || b.lat == null) return Infinity;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ---- Static file serving -------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const filePath = normalize(join(publicDir, rel));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const type = MIME[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    return res.end(readFileSync(filePath));
  }
  // SPA fallback
  const indexPath = join(publicDir, 'index.html');
  if (existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(readFileSync(indexPath));
  }
  res.writeHead(404);
  res.end('not found');
}

// ---- Request dispatch ----------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    const match = routes.find(
      (r) => r.method === req.method && r.pattern.test(pathname)
    );
    if (!match) return json(res, 404, { error: 'not found' });
    const m = pathname.match(match.pattern);
    const params = {};
    match.keys.forEach((k, i) => (params[k] = m[i + 1]));
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
    try {
      await match.handler(req, res, params, body);
    } catch (e) {
      console.error('handler error', e);
      if (!res.headersSent) json(res, 500, { error: 'server error' });
    }
    return;
  }

  serveStatic(req, res, pathname);
});

// ---- WebSocket -----------------------------------------------------------
attachWebSocket(server, '/ws', (ws, req) => {
  const user = authUser(req);
  if (!user) {
    ws.close();
    return;
  }
  hub.register(user.id, ws);
  ws.send(JSON.stringify({ type: 'hello', payload: { userId: user.id } }));
  const live = store.findLiveSessionForUser(user.id);
  if (live) ws.send(JSON.stringify({ type: 'session', payload: engine.sessionView(live, user.id) }));
  ws.on('close', () => hub.unregister(user.id, ws));
  ws.on('error', () => hub.unregister(user.id, ws));
});

// ---- Background sweep: release stale locks -------------------------------
setInterval(() => {
  try {
    engine.releaseStaleLocks();
  } catch (e) {
    console.error('sweep error', e);
  }
}, 15000);

server.listen(PORT, () => {
  console.log(`Clove server listening on http://localhost:${PORT}`);
});
