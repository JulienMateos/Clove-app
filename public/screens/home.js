import { h } from '../dom.js';
import { api } from '../api.js';
import { state, render, toast } from '../app.js';
import { mondrianBar, icon, logoMark } from '../ui.js';
import { line } from '../art.js';

const DEFAULT = { lat: 40.9481, lng: -4.1184 };
const MODES = [
  { id: 'ghost', ic: 'ghost', name: 'Ghost', desc: 'Invisible. Personne ne te sollicite.' },
  { id: 'glance', ic: 'glance', name: 'Glance', desc: 'Tu jettes un œil, sans être embarqué·e.' },
  { id: 'full', ic: 'spark', name: 'Full', desc: 'Dispo maintenant pour un défi IRL.' },
];

// ---- Heartbeat loop (runs independently of render) -----------------------
async function beat() {
  const mode = state.presence?.mode || 'ghost';
  if (mode === 'ghost') return;
  try {
    const { presence, nearby, session } = await api.heartbeat({
      lat: state.coords.lat, lng: state.coords.lng, radius: state.radius, mode,
    });
    state.presence = presence;
    state.nearby = nearby;
    if (session && !state.session) {
      state.session = session; // fallback if WS missed it
    }
    if (state.tab === 'home' && !state.session) render();
  } catch {}
}

export function ensureHeartbeat() {
  if (state.beatTimer) return;
  state.beatTimer = setInterval(beat, 4000);
  beat();
}

async function changeMode(m) {
  try {
    const { presence } = await api.setMode(m);
    state.presence = presence;
    if (m === 'full') { toast('Mode Full activé — à l’écoute des rencontres tout près'); beat(); }
    if (m === 'ghost') toast('Mode Ghost — tu es invisible');
    if (m === 'glance') beat();
    render();
  } catch {}
}

function setCoords(lat, lng) {
  state.coords = { lat, lng };
  state.locSource = 'sim';
  localStorage.setItem('clove_sim_coords', JSON.stringify(state.coords));
  render();
  beat();
}

function useRealGPS() {
  if (!('geolocation' in navigator)) { toast('GPS indisponible'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => { state.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; state.locSource = 'gps'; render(); beat(); },
    () => toast('Autorisation GPS refusée — position simulée'),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

export function renderHome() {
  ensureHeartbeat();
  const u = state.user;
  const mode = state.presence?.mode || 'ghost';
  const nearby = state.nearby;
  const extravert = u.socialStyle === 'extraverti';

  const shell = h('div', { class: 'app-shell' },
    h('div', { class: 'brand' },
      logoMark(42),
      h('div', {}, h('h1', {}, 'Clove'), h('p', { class: 'tag' }, `Bonjour ${u.username}${u.verified ? ' · vérifié' : ''}`)),
    ),
    mondrianBar(),
  );

  // Modes card
  const modesCard = h('div', { class: 'card' },
    h('h2', {}, 'Ta disponibilité'),
    h('p', { class: 'sub' }, 'Tu contrôles ta visibilité en temps réel.'),
    h('div', { class: 'modes' },
      MODES.map((m) => h('button', { class: `mode-card ${m.id}` + (mode === m.id ? ' active' : ''), onClick: () => changeMode(m.id) },
        h('div', { class: 'emoji' }, icon(m.ic, 26)),
        h('div', { class: 'name' }, m.name),
        h('div', { class: 'desc' }, m.desc),
      )),
    ),
  );
  if (!extravert && mode === 'full') {
    modesCard.append(h('p', { class: 'sub warn-note', style: { marginTop: '12px', color: 'var(--warn)' } },
      line('warning', 15), h('span', {}, 'Ton profil est réglé sur « doucement ». Les défis IRL ne te seront proposés que si tu passes en extraverti dans ton profil.')));
  }
  shell.append(modesCard);

  // Radar card
  const radar = h('div', { class: 'radar' }, h('div', { class: 'center-dot' }));
  if (mode !== 'ghost') {
    radar.prepend(h('div', { class: 'sweep' }));
    const count = Math.min(nearby, 5);
    for (let i = 0; i < count; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const r = 55 + (i % 3) * 22;
      radar.append(h('div', { class: 'blip', style: {
        left: `calc(50% + ${Math.cos(angle) * r}px)`, top: `calc(50% + ${Math.sin(angle) * r}px)`, animationDelay: `${i * 0.2}s`,
      } }));
    }
  }
  let statusEl;
  if (mode === 'ghost') statusEl = h('div', { class: 'radar-status' }, h('div', { class: 'big' }, 'Tu es en pause'), h('div', { class: 'small' }, 'Passe en Glance ou Full pour être détectable.'));
  else if (mode === 'glance') statusEl = h('div', { class: 'radar-status' }, h('div', { class: 'big' }, `${nearby} personne${nearby !== 1 ? 's' : ''} dans les parages`), h('div', { class: 'small' }, 'Mode exploration — aucun défi ne se lancera.'));
  else statusEl = h('div', { class: 'radar-status' }, h('div', { class: 'big' }, "À l'écoute d'une étincelle…"),
      h('div', { class: 'small' }, nearby > 0 ? `${nearby} profil${nearby > 1 ? 's' : ''} actif${nearby > 1 ? 's' : ''} autour de toi` : 'Personne tout près pour l’instant. Reste dispo.'));
  shell.append(h('div', { class: 'card' }, h('div', { class: 'radar-wrap' }, radar), statusEl));

  // Radius + location simulator
  const radiusCard = h('div', { class: 'card' },
    h('h2', {}, 'Rayon de rencontre'),
    h('p', { class: 'sub' }, ['Distance max pour déclencher une rencontre : ', h('b', {}, `${state.radius} m`)]),
    h('input', { type: 'range', min: 30, max: 120, step: 10, value: state.radius,
      onInput: (e) => { state.radius = Number(e.target.value); render(); } }),
    h('div', { class: 'sim-panel' },
      h('div', { class: 'lbl' }, `Position (${state.locSource === 'gps' ? 'GPS réel' : 'simulée'})`),
      h('p', { class: 'sub', style: { margin: '6px 0' } }, `${state.coords.lat.toFixed(5)}, ${state.coords.lng.toFixed(5)}`),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn ghost', onClick: useRealGPS }, 'Utiliser mon GPS'),
        h('button', { class: 'btn ghost', onClick: () => setCoords(DEFAULT.lat, DEFAULT.lng) }, 'Segovia'),
      ),
      h('p', { class: 'sub', style: { marginTop: '10px', fontSize: '11px' } },
        ['Astuce — pour tester une rencontre : ouvre un 2ᵉ onglet, crée un profil compatible, mets les deux en ', h('b', {}, 'Full'), ' à la même position (bouton « Segovia »).']),
    ),
  );
  shell.append(radiusCard);

  return shell;
}
