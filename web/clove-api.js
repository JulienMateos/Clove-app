// clove-api.js — LE SEUL fichier à modifier pour brancher le backend.
// Chargé AVANT l'app. Tant que `live` vaut false, l'app tourne en mode démo (identique au prototype).
//
// SORTANT  : l'UI appelle window.CloveAPI.<méthode>(payload)
// ENTRANT  : le backend (WebSocket, SSE, push…) appelle window.__cloveEvent(type, data)
//
// Branchement : serveur Node de server/ (HTTP JSON + WebSocket /live).
// - `live` passe à true seulement si /api/health répond : sans serveur (ex. `npx serve web`),
//   l'app reste en mode démo.
// - Base de l'API : même origine par défaut. Pour une WebView ou un front servi ailleurs,
//   définir `window.CLOVE_API_BASE = 'https://api.clove.app'` avant ce script, ou `?api=` dans l'URL.
// - Position : navigator.geolocation tant que le radar est en mode « full ».
//   Pour tester sur desktop : `?lat=40.4155&lng=-3.7074` force la position.
// - Mode démo forcé : `?demo=…` (géré par l'app) ou `?offline=1`.

(function () {
  const qs = new URLSearchParams(location.search);
  const BASE = (window.CLOVE_API_BASE || qs.get('api') || '').replace(/\/$/, '');
  const TOKEN_KEY = 'clove_token';
  const FIXED = qs.has('lat') && qs.has('lng') ? { lat: +qs.get('lat'), lng: +qs.get('lng') } : null;
  const HEARTBEAT_MS = 15000;

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} },
  };
  let token = store.get(TOKEN_KEY);

  // ── HTTP ────────────────────────────────────────────────────────────────
  async function req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { token = null; store.set(TOKEN_KEY, null); }
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    return data;
  }
  const post = (path, body) => {
    if (!token) { console.warn('[CloveAPI] pas encore de profil — appel ignoré:', path); return Promise.resolve(null); }
    return req('POST', path, body).catch((e) => { console.warn('[CloveAPI]', path, e.message); return null; });
  };

  // Blob URL (photo du défi) → data URL envoyable au serveur.
  async function toDataURL(url) {
    if (!url || /^data:/.test(url)) return url || null;
    try {
      const blob = await (await fetch(url)).blob();
      return await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
    } catch (_) { return null; }
  }

  // ── Événements entrants ────────────────────────────────────────────────
  // __cloveEvent n'existe qu'une fois l'app montée : on met en file d'attente avant.
  const queue = [];
  function emit(type, data) {
    if (typeof window.__cloveEvent === 'function') {
      while (queue.length) { const [t, d] = queue.shift(); window.__cloveEvent(t, d); }
      window.__cloveEvent(type, data);
    } else {
      queue.push([type, data]);
      if (queue.length === 1) waitForApp();
    }
  }
  function waitForApp() {
    const iv = setInterval(() => {
      if (typeof window.__cloveEvent !== 'function') return;
      clearInterval(iv);
      while (queue.length) { const [t, d] = queue.shift(); window.__cloveEvent(t, d); }
    }, 100);
  }

  let ws = null, retry = 0;
  function connect() {
    if (!token || (ws && ws.readyState <= 1)) return;
    const origin = BASE || location.origin;
    ws = new WebSocket(origin.replace(/^http/, 'ws') + '/live?token=' + encodeURIComponent(token));
    ws.onopen = () => { retry = 0; };
    ws.onmessage = (e) => { try { const m = JSON.parse(e.data); emit(m.type, m.data); } catch (_) {} };
    ws.onclose = () => { ws = null; if (!token) return; retry = Math.min(retry + 1, 6); setTimeout(connect, 500 * retry); };
    ws.onerror = () => { try { ws.close(); } catch (_) {} };
  }

  // ── Position (radar en mode « full ») ──────────────────────────────────
  let geoWatch = null, beat = null, lastPos = FIXED;
  function sendPosition() { if (lastPos) post('/api/availability', lastPos); }
  function startLocating() {
    stopLocating();
    if (!FIXED && navigator.geolocation) {
      geoWatch = navigator.geolocation.watchPosition(
        (p) => { const first = !lastPos; lastPos = { lat: p.coords.latitude, lng: p.coords.longitude }; if (first) sendPosition(); },
        (e) => console.warn('[CloveAPI] géolocalisation:', e.message),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
    beat = setInterval(sendPosition, HEARTBEAT_MS);
  }
  function stopLocating() {
    if (geoWatch != null) navigator.geolocation.clearWatch(geoWatch);
    clearInterval(beat); geoWatch = null; beat = null;
  }

  // ── Sortant ────────────────────────────────────────────────────────────
  window.CloveAPI = {
    live: false, // passe à true dès que le serveur répond (voir plus bas)

    // { firstName, lastName, birth:'YYYY-MM-DD', gender, attraction, traits:number[12] (0..1), hour, vol(0..4), el(0..3), photo:dataURL }
    saveProfile(p) {
      return req('POST', '/api/profile', p).then((r) => {
        token = r.token; store.set(TOKEN_KEY, token); connect(); return r;
      }).catch((e) => console.warn('[CloveAPI] saveProfile', e.message));
    },

    // Tap sur le cœur du radar. { mode:'ghost'|'full', radius:number (m) }
    setAvailability(p) {
      if (p.mode === 'full') startLocating(); else stopLocating();
      return post('/api/availability', { mode: p.mode, radius: p.radius, ...(lastPos || {}) });
    },

    // L'utilisateur accepte la demande reçue (étape PENDING). { accept:true }
    respondInterest(p) { return post('/api/interest', { accept: !!p.accept }); },

    // Envoi de la photo du défi. { defi:string, image:blobURL }
    async sendChallengePhoto(p) {
      return post('/api/challenge-photo', { defi: p.defi, image: await toDataURL(p.image) });
    },

    // Décision à l'étape 2/2, ou abandon à n'importe quelle étape. { accept:boolean, status? }
    // Un abandon pendant PENDING passe par la même route : le serveur clôt la session en cours.
    decide(p) { return post('/api/decide', { accept: !!p.accept }); },

    // Signalement. { name, reasonIndex } — raisons : 0 photo déplacée, 1 faux profil, 2 comportement insistant,
    // 3 propos haineux, 4 semble mineur·e, 5 arnaque/spam, 6 autre
    report(p) { return post('/api/report', { name: p.name, reasonIndex: p.reasonIndex }); },

    // Bouton Sécurité. { type:'text' (c'est gênant) | 'danger' }
    alert(p) { return post('/api/alert', { type: p.type, ...(lastPos || {}) }); },

    // Contact de confiance. { name, phone }
    saveEmergencyContact(p) { return post('/api/emergency-contact', { name: p.name, phone: p.phone }); },
  };

  // Active le mode live si le serveur répond, puis ouvre le WebSocket (profil déjà créé).
  if (!qs.has('demo') && !qs.has('offline')) {
    fetch(BASE + '/api/health').then((r) => r.ok && r.json()).then((d) => {
      if (!d || !d.ok) return;
      window.CloveAPI.live = true;
      connect();
    }).catch(() => console.info('[CloveAPI] serveur injoignable — mode démo'));
  }
})();

// ── Événements entrants (poussés par le serveur via WebSocket /live) ────────
// __cloveEvent('interest',    { name:'Emma', age:29 })                 → écran « demande »
// __cloveEvent('challenge',   { defiIndex:0..6 })                      → écran défi (compte à rebours 90 s)
// __cloveEvent('herDecision', { accept:true|false })                   → étape 2/2 ou échec
// __cloveEvent('match',       { id, name, spot, addr, mapsQuery })     → écran « C'est un match »
// __cloveEvent('failed',      { by:'her'|'me' })                       → session terminée
// __cloveEvent('matches',     { list:[{ id, name, spot, addr, mapsQuery }] }) → historique Matchs
