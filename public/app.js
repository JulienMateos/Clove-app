import { api, getToken, setToken, connectWS } from './api.js';
import { h, mount } from './dom.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderHome } from './screens/home.js';
import { renderMatches } from './screens/matches.js';
import { renderProfile } from './screens/profile.js';
import { renderMatchModal } from './screens/matchModal.js';
import { renderLegal } from './screens/legal.js';
import { icon, logoMark } from './ui.js';

const TERMINAL = ['COMPLETED', 'FAILED', 'CANCELLED'];
const root = document.getElementById('app');

// ---- Global app state ----------------------------------------------------
export const state = {
  user: null,
  presence: null,
  tab: 'home',
  session: null, // live match session view
  wsClose: null,
  onboardingStep: 0,
  onboardingDraft: { username: '', gender: '', attraction: '', socialStyle: '', avatar: 'a1', bio: '', consent: { terms: false, location: false } },
  // legal / safety sub-page (null = none)
  legalPage: null,
  // home local state
  radius: 120,
  nearby: 0,
  coords: loadCoords(),
  locSource: 'sim',
  beatTimer: null,
  // matches/chat
  activeMatch: null,
  messages: [],
  matches: [],
  // match modal local
  photoPreview: null,
};

function loadCoords() {
  const saved = localStorage.getItem('clove_sim_coords');
  return saved ? JSON.parse(saved) : { lat: 40.9481, lng: -4.1184 };
}

// ---- Toast ---------------------------------------------------------------
let toastTimer = null;
export function toast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = h('div', { class: 'toast fade-in' }, msg);
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3200);
}

// ---- Render dispatch -----------------------------------------------------
export function render() {
  if (!state.booted) {
    mount(root, h('div', { class: 'boot' }, logoMark(64)));
    return;
  }
  if (!state.user) {
    mount(root, renderOnboarding());
    return;
  }

  const frag = document.createDocumentFragment();

  // Live match takes over the whole screen.
  if (state.session) {
    frag.append(renderMatchModal(state.session));
  }

  // Legal / safety sub-pages open on top of the Profile tab (with a back arrow).
  if (state.legalPage !== null && state.legalPage !== undefined) {
    frag.append(renderLegal());
    frag.append(renderNav());
    mount(root, frag);
    return;
  }

  let screen;
  if (state.tab === 'home') screen = renderHome();
  else if (state.tab === 'matches') screen = renderMatches();
  else screen = renderProfile();
  frag.append(screen);
  frag.append(renderNav());

  mount(root, frag);
}

function renderNav() {
  const tabBtn = (id, iconName, label) =>
    h('button', { class: state.tab === id ? 'active' : '', onClick: () => setTab(id) },
      h('span', { class: 'ico' }, icon(iconName, 24)), label);
  return h('nav', { class: 'nav' },
    tabBtn('home', 'radar', 'Radar'),
    tabBtn('matches', 'heart', 'Matchs'),
    tabBtn('profile', 'person', 'Profil'),
  );
}

// ---- Actions -------------------------------------------------------------
export function setTab(tab) {
  state.tab = tab;
  state.activeMatch = null;
  render();
}

export function setSession(session) {
  state.session = session && !TERMINAL.includes(session.status) ? session : session; // keep terminal too (modal shows result)
  render();
}

export function closeSession() {
  state.session = null;
  state.photoPreview = null;
  render();
}

export async function onLoggedIn(user, presence) {
  state.user = user;
  if (presence) state.presence = presence;
  if (presence?.radius) state.radius = presence.radius;
  startWS();
  startSessionPoller();
  render();
}

// Apply an incoming session update. Only re-renders when something actually
// changed (status, or a field the UI depends on) to avoid clobbering the
// screen — e.g. wiping a photo the user is composing — on every poll tick.
function applySessionUpdate(payload, { fromWs = false } = {}) {
  if (!payload) return;
  const prev = state.session;
  const wasNew = (!prev || TERMINAL.includes(prev.status)) && payload.status === 'PENDING';
  const changed =
    !prev ||
    prev.sessionId !== payload.sessionId ||
    prev.status !== payload.status ||
    prev.otherPhoto !== payload.otherPhoto ||
    prev.myPhoto !== payload.myPhoto ||
    prev.myInterest !== payload.myInterest ||
    prev.myAccept !== payload.myAccept ||
    JSON.stringify(prev.meetingSpot) !== JSON.stringify(payload.meetingSpot);

  state.session = payload;
  if (wasNew) toast('Quelqu’un de compatible est tout près !');
  if (changed) render();
}

function startWS() {
  if (state.wsClose) state.wsClose();
  state.wsClose = connectWS((type, payload) => {
    if (type === 'session') {
      applySessionUpdate(payload, { fromWs: true });
    } else if (type === 'message') {
      if (state.activeMatch && payload.matchId === state.activeMatch.id) {
        state.messages.push(payload.message);
        render();
      } else {
        toast('Nouveau message');
      }
    }
  });
}

// ---- Session poller ------------------------------------------------------
// Belt-and-suspenders: even if the WebSocket push is delayed or dropped by a
// proxy, this keeps the live match screen advancing (PENDING -> CHALLENGE ->
// REVIEW -> COMPLETED). Polls only while a non-terminal session is active.
function startSessionPoller() {
  if (state.pollTimer) return;
  state.pollTimer = setInterval(async () => {
    const s = state.session;
    if (!s || TERMINAL.includes(s.status)) return; // nothing live to sync
    try {
      const { session } = await api.session();
      if (session) applySessionUpdate(session);
    } catch {}
  }, 1500);
}

// ---- Boot ----------------------------------------------------------------
(async function boot() {
  if (getToken()) {
    try {
      const { user, presence } = await api.me();
      state.user = user;
      state.presence = presence;
      if (presence?.radius) state.radius = presence.radius;
      const { session } = await api.session();
      if (session && !TERMINAL.includes(session.status)) state.session = session;
      startWS();
      startSessionPoller();
    } catch {}
  }
  state.booted = true;
  render();
})();
