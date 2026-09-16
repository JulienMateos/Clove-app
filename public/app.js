import { api, getToken, setToken, connectWS } from './api.js';
import { h, mount } from './dom.js';
import { renderOnboarding } from './screens/onboarding.js';
import { renderHome } from './screens/home.js';
import { renderMatches } from './screens/matches.js';
import { renderProfile } from './screens/profile.js';
import { renderMatchModal } from './screens/matchModal.js';

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
  onboardingDraft: { username: '', gender: '', attraction: '', socialStyle: '', avatar: '🦊', bio: '' },
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
    mount(root, h('div', { class: 'boot' }, h('div', { class: 'logo', style: { width: '60px', height: '60px', fontSize: '30px' } }, 'C')));
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

  let screen;
  if (state.tab === 'home') screen = renderHome();
  else if (state.tab === 'matches') screen = renderMatches();
  else screen = renderProfile();
  frag.append(screen);
  frag.append(renderNav());

  mount(root, frag);
}

function renderNav() {
  const tabBtn = (id, ico, label) =>
    h('button', { class: state.tab === id ? 'active' : '', onClick: () => setTab(id) },
      h('span', { class: 'ico' }, ico), label);
  return h('nav', { class: 'nav' },
    tabBtn('home', '📡', 'Radar'),
    tabBtn('matches', '💚', 'Matchs'),
    tabBtn('profile', '👤', 'Profil'),
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
  render();
}

function startWS() {
  if (state.wsClose) state.wsClose();
  state.wsClose = connectWS((type, payload) => {
    if (type === 'session') {
      const wasNew = !state.session && payload.status === 'PENDING';
      state.session = payload;
      if (wasNew) toast('✨ Quelqu’un de compatible est tout près !');
      render();
    } else if (type === 'message') {
      if (state.activeMatch && payload.matchId === state.activeMatch.id) {
        state.messages.push(payload.message);
        render();
      } else {
        toast('💬 Nouveau message');
      }
    }
  });
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
    } catch {}
  }
  state.booted = true;
  render();
})();
