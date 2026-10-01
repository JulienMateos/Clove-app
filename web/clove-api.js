// clove-api.js — LE SEUL fichier à modifier pour brancher le backend.
// Chargé AVANT l'app. Tant que `live` vaut false, l'app tourne en mode démo (identique au prototype).
//
// SORTANT  : l'UI appelle window.CloveAPI.<méthode>(payload)
// ENTRANT  : le backend (WebSocket, SSE, push…) appelle window.__cloveEvent(type, data)
//
// Branchement : Firebase (voir FIREBASE.md).
// - Chaque méthode appelle une Cloud Function (functions/index.js), qui applique les règles métier.
// - Les événements entrants arrivent dans la boîte users/{uid}/events (Firestore, temps réel) :
//   chaque événement est transmis à window.__cloveEvent puis effacé.
// - Identité : connexion anonyme Firebase Auth, gardée par le navigateur / la WebView.
// - `live` passe à true une fois connecté. Sans config Firebase (FIREBASE_CONFIG = null), l'app reste en démo.
// - Position : navigator.geolocation tant que le radar est en mode « full ».
//   Pour tester sur desktop : `?lat=40.4155&lng=-3.7074` force la position.
// - `?emulator=1` : utilise les émulateurs locaux (`npm run emulators`). `?offline=1` : mode démo forcé.

// ↓↓↓ Colle ici la config web de ton projet (console Firebase → Paramètres du projet → Tes applications).
// Ces valeurs ne sont pas secrètes : la sécurité vient des règles et des Cloud Functions.
const FIREBASE_CONFIG = null;
// const FIREBASE_CONFIG = {
//   apiKey: '…', authDomain: '….firebaseapp.com', projectId: '…',
//   storageBucket: '….firebasestorage.app', messagingSenderId: '…', appId: '…',
// };

(function () {
  const REGION = 'europe-west1';
  const SDK = ['app', 'auth', 'firestore', 'functions'].map((m) => `vendor/firebase/firebase-${m}-compat.js`);
  const HEARTBEAT_MS = 15000;
  const STALE_EVENT_MS = 3 * 60 * 1000; // événements reçus app fermée : on ignore les vieux

  const qs = new URLSearchParams(location.search);
  const EMULATOR = qs.has('emulator');
  const FIXED = qs.has('lat') && qs.has('lng') ? { lat: +qs.get('lat'), lng: +qs.get('lng') } : null;
  const config = EMULATOR ? { apiKey: 'demo-key', projectId: 'demo-clove', appId: 'demo-app', storageBucket: 'demo-clove.appspot.com' } : FIREBASE_CONFIG;

  let fns = null; // firebase.functions() une fois prêt
  let uid = null;

  // ── Appels sortants ────────────────────────────────────────────────────
  function invoke(name, data) {
    if (!fns) { console.warn('[CloveAPI] backend pas prêt — appel ignoré:', name); return Promise.resolve(null); }
    return fns.httpsCallable(name)(data).then((r) => r.data)
      .catch((e) => { console.warn('[CloveAPI]', name, e.code || '', e.message); return null; });
  }

  // Photo du défi (blob URL) ou profil (data URL) → JPEG ≤ 1400 px, sous la limite des Cloud Functions.
  async function toJpegDataURL(url) {
    if (!url) return null;
    try {
      const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.85);
    } catch (_) { return /^data:/.test(url) ? url : null; }
  }

  // ── Événements entrants ────────────────────────────────────────────────
  // __cloveEvent n'existe qu'une fois l'app montée : on met en file d'attente avant.
  const queue = [];
  let waiting = null;
  function flush() {
    if (typeof window.__cloveEvent !== 'function') return false;
    while (queue.length) { const [t, d] = queue.shift(); try { window.__cloveEvent(t, d); } catch (e) { console.warn(e); } }
    return true;
  }
  function emit(type, data) {
    queue.push([type, data]);
    if (flush() || waiting) return;
    waiting = setInterval(() => { if (flush()) { clearInterval(waiting); waiting = null; } }, 100);
  }

  function listen(db) {
    db.collection('users').doc(uid).collection('events').onSnapshot((snap) => {
      const added = snap.docChanges().filter((c) => c.type === 'added').map((c) => c.doc)
        .sort((a, b) => (a.get('at') - b.get('at')) || (a.get('n') - b.get('n')));
      for (const doc of added) {
        const e = doc.data();
        if (Date.now() - e.at < STALE_EVENT_MS || e.type === 'matches') emit(e.type, e.data || {});
        doc.ref.delete().catch(() => {});
      }
    }, (e) => console.warn('[CloveAPI] événements:', e.message));
  }

  // ── Position (radar en mode « full ») ──────────────────────────────────
  let geoWatch = null, beat = null, lastPos = FIXED;
  const sendPosition = () => { if (lastPos) invoke('setAvailability', lastPos); };
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
    live: false, // passe à true dès que la connexion Firebase est prête (voir plus bas)

    // { firstName, lastName, birth:'YYYY-MM-DD', gender, attraction, traits:number[12] (0..1), hour, vol(0..4), el(0..3), photo:dataURL }
    async saveProfile(p) {
      const r = await invoke('saveProfile', { ...p, photo: await toJpegDataURL(p.photo) });
      if (r) invoke('listMatches', {}).then((m) => m && emit('matches', m));
      return r;
    },

    // Tap sur le cœur du radar. { mode:'ghost'|'full', radius:number (m) }
    setAvailability(p) {
      if (p.mode === 'full') startLocating(); else stopLocating();
      return invoke('setAvailability', { mode: p.mode, radius: p.radius, ...(lastPos || {}) });
    },

    // L'utilisateur accepte la demande reçue (étape PENDING). { accept:true }
    respondInterest(p) { return invoke('respondInterest', { accept: !!p.accept }); },

    // Envoi de la photo du défi. { defi:string, image:blobURL }
    async sendChallengePhoto(p) {
      return invoke('sendChallengePhoto', { defi: p.defi, image: await toJpegDataURL(p.image) });
    },

    // Décision à l'étape 2/2, ou abandon à n'importe quelle étape. { accept:boolean, status? }
    decide(p) { return invoke('decide', { accept: !!p.accept }); },

    // Signalement. { name, reasonIndex } — raisons : 0 photo déplacée, 1 faux profil, 2 comportement insistant,
    // 3 propos haineux, 4 semble mineur·e, 5 arnaque/spam, 6 autre
    report(p) { return invoke('report', { name: p.name, reasonIndex: p.reasonIndex }); },

    // Bouton Sécurité. { type:'text' (c'est gênant) | 'danger' }
    alert(p) { return invoke('alert', { type: p.type, ...(lastPos || {}) }); },

    // Contact de confiance. { name, phone }
    saveEmergencyContact(p) { return invoke('saveEmergencyContact', { name: p.name, phone: p.phone }); },

    // Pas encore appelé par l'UI (bouton « Supprimer mon compte » sans action) — prêt côté backend.
    deleteAccount() { return invoke('deleteAccount', {}); },

    // Photo du défi de l'autre, quand la règle séquentielle l'autorise. → data URL ou null
    getOtherPhoto() { return invoke('getOtherPhoto', {}).then((r) => (r ? r.image : null)); },
  };

  // ── Démarrage ──────────────────────────────────────────────────────────
  if (!config || qs.has('demo') || qs.has('offline')) return; // mode démo

  const base = (document.currentScript && document.currentScript.src) || location.href;
  const load = (src) => new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = new URL(src, base).href; s.onload = ok; s.onerror = ko;
    document.head.appendChild(s);
  });

  SDK.reduce((p, src) => p.then(() => load(src)), Promise.resolve()).then(() => {
    const fb = window.firebase;
    const app = fb.initializeApp(config);
    const auth = app.auth(), db = app.firestore(), functions = app.functions(REGION);
    if (EMULATOR) {
      const host = location.hostname || '127.0.0.1';
      auth.useEmulator(`http://${host}:9099`, { disableWarnings: true });
      db.useEmulator(host, 8080);
      functions.useEmulator(host, 5001);
    }
    auth.onAuthStateChanged((user) => {
      if (!user) { auth.signInAnonymously().catch((e) => console.warn('[CloveAPI] connexion:', e.message)); return; }
      if (uid === user.uid) return;
      uid = user.uid;
      fns = functions;
      window.CloveAPI.live = true;
      listen(db);
      invoke('listMatches', {}).then((m) => m && emit('matches', m)); // échoue sans profil : normal
    });
  }).catch(() => console.info('[CloveAPI] SDK Firebase introuvable — mode démo'));
})();

// ── Événements entrants (écrits par les Cloud Functions dans users/{uid}/events) ──
// __cloveEvent('interest',    { name:'Emma', age:29 })                 → écran « demande »
// __cloveEvent('challenge',   { defiIndex:0..6 })                      → écran défi (compte à rebours 90 s)
// __cloveEvent('herDecision', { accept:true|false })                   → étape 2/2 ou échec
// __cloveEvent('match',       { id, name, spot, addr, mapsQuery })     → écran « C'est un match »
// __cloveEvent('failed',      { by:'her'|'me' })                       → session terminée
// __cloveEvent('matches',     { list:[{ id, name, spot, addr, mapsQuery }] }) → historique Matchs
