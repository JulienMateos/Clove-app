import { h } from './dom.js';

// De Stijl / Mondrian signature bar — an unmistakable, non-generic accent.
export function mondrianBar() {
  return h('div', { class: 'mondrian-bar' },
    h('i', {}), h('i', {}), h('i', {}), h('i', {}), h('i', {}),
  );
}

// ---- Brand mark ----------------------------------------------------------
// A custom Clove mark: a spark / four-petal bloom formed from De Stijl blocks.
// Built as inline SVG so it's crisp at any size and needs no font/emoji.
export function logoMark(size = 40) {
  const el = svg(size, size, '0 0 48 48');
  el.classList.add('logo-mark');
  el.innerHTML = `
    <rect x="2" y="2" width="44" height="44" rx="12" fill="#111114"/>
    <rect x="2" y="2" width="14" height="14" rx="7" fill="#d81e28"/>
    <rect x="32" y="32" width="14" height="14" rx="7" fill="#0b40c4"/>
    <path d="M24 12c2.4 5 5.9 8.6 12 10-6.1 1.4-9.6 5-12 10-2.4-5-5.9-8.6-12-10 6.1-1.4 9.6-5 12-10z" fill="#f6c700"/>
    <circle cx="24" cy="22" r="2.4" fill="#111114"/>`;
  return el;
}

// Full wordmark for hero moments.
export function wordmark() {
  return h('div', { class: 'wordmark' }, logoMark(44), h('span', {}, 'Clove'));
}

// ---- Line icons (SF-Symbols-ish) ----------------------------------------
const ICONS = {
  radar:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  heart:
    '<path d="M12 20s-6.5-4.35-9-8.24C1.2 8.9 2.3 5.5 5.5 5.5c1.9 0 3.1 1.1 3.9 2.2.8-1.1 2-2.2 3.9-2.2 3.2 0 4.3 3.4 2.5 6.26C18.5 15.65 12 20 12 20z"/>',
  person:
    '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/>',
  ghost:
    '<path d="M6 19V10a6 6 0 0 1 12 0v9l-2-1.5L14 19l-2-1.5L10 19l-2-1.5L6 19z"/><circle cx="9.5" cy="10.5" r="0.6" fill="currentColor"/><circle cx="14.5" cy="10.5" r="0.6" fill="currentColor"/>',
  glance:
    '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
  spark:
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>',
  shield:
    '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  flag:
    '<path d="M6 21V4M6 4h11l-2 3 2 3H6"/>',
  ban:
    '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  lock:
    '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  trash:
    '<path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>',
  chevron:
    '<path d="M9 6l6 6-6 6"/>',
  pin:
    '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  check:
    '<path d="M20 6L9 17l-5-5"/>',
  camera:
    '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.4"/>',
  clock:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};

function svg(w, h, viewBox) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('width', w);
  el.setAttribute('height', h);
  return el;
}

export function icon(name, size = 24) {
  const el = svg(size, size, '0 0 24 24');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '1.7');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.innerHTML = ICONS[name] || '';
  return el;
}

// ---- Bottom sheet (iOS-style modal) --------------------------------------
// Renders a dimmed backdrop + a sheet that slides up. `content` is a DOM node.
export function openSheet(titleText, content) {
  const existing = document.querySelector('.sheet-backdrop');
  if (existing) existing.remove();

  const sheet = h('div', { class: 'sheet' },
    h('div', { class: 'sheet-grabber' }),
    titleText ? h('h3', { class: 'sheet-title' }, titleText) : null,
    content,
  );
  const backdrop = h('div', { class: 'sheet-backdrop', onClick: (e) => {
    if (e.target === backdrop) close();
  } }, sheet);

  function close() {
    backdrop.classList.add('closing');
    setTimeout(() => backdrop.remove(), 220);
  }
  backdrop.__close = close;
  document.body.append(backdrop);
  return { close };
}

export function closeSheet() {
  const b = document.querySelector('.sheet-backdrop');
  if (b && b.__close) b.__close();
  else if (b) b.remove();
}

// ---- Match flow progress stepper -----------------------------------------
// Four dots representing: proximity → intérêt → défi → verdict.
const STEP_ORDER = ['PENDING', 'INTEREST_WAIT', 'PHOTO_CHALLENGE', 'PHOTO_REVIEW', 'COMPLETED'];
export function matchStepper(status) {
  // Map INTEREST_WAIT to the same visual step as intérêt.
  const idxByStatus = {
    PENDING: 0,
    INTEREST_WAIT: 1,
    PHOTO_CHALLENGE: 2,
    PHOTO_REVIEW: 3,
    COMPLETED: 4,
  };
  const active = idxByStatus[status] ?? 0;
  const labels = ['Étincelle', 'Intérêt', 'Défi', 'Verdict'];
  return h('div', { class: 'stepper' },
    labels.map((label, i) => h('div', {
      class: 'step' + (i < active ? ' done' : '') + (i === active ? ' active' : ''),
    },
      h('span', { class: 'step-dot' }, i < active ? '✓' : String(i + 1)),
      h('span', { class: 'step-label' }, label),
    ))
  );
}

// ---- Circular countdown ring ---------------------------------------------
// Returns { node, stop }. `seconds` total; calls onExpire() at 0.
export function countdownRing(seconds, onExpire) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrap.setAttribute('viewBox', '0 0 64 64');
  wrap.setAttribute('width', '64');
  wrap.setAttribute('height', '64');
  wrap.classList.add('countdown');
  wrap.innerHTML = `
    <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--separator-strong)" stroke-width="4"/>
    <circle class="cd-arc" cx="32" cy="32" r="${R}" fill="none" stroke="var(--brand)" stroke-width="4"
      stroke-linecap="round" transform="rotate(-90 32 32)"
      stroke-dasharray="${C}" stroke-dashoffset="0"/>
    <text class="cd-text" x="32" y="38" text-anchor="middle" font-size="20" font-weight="700" fill="var(--text)"></text>`;
  const arc = wrap.querySelector('.cd-arc');
  const txt = wrap.querySelector('.cd-text');
  let remaining = seconds;
  let timer = null;

  function tick() {
    txt.textContent = String(remaining);
    const frac = remaining / seconds;
    arc.setAttribute('stroke-dashoffset', String(C * (1 - frac)));
    arc.setAttribute('stroke', remaining <= 10 ? 'var(--danger)' : 'var(--brand)');
    if (remaining <= 0) {
      clearInterval(timer);
      onExpire && onExpire();
      return;
    }
    remaining -= 1;
  }
  tick();
  timer = setInterval(tick, 1000);
  return { node: wrap, stop: () => clearInterval(timer) };
}
