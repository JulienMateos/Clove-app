// ---------------------------------------------------------------------------
// Clove — hand-made SVG artwork (De Stijl / Mondrian direction).
// Zero dependencies. Everything is inline SVG so it's crisp at any size,
// themeable via currentColor, and needs no emoji font.
//
// Palette (kept in sync with styles.css):
//   red #d81e28 · blue #0b40c4 · yellow #f6c700 · black #111114 · white #fff
// ---------------------------------------------------------------------------

const RED = '#d81e28';
const BLUE = '#0b40c4';
const YEL = '#f6c700';
const BLK = '#111114';
const WHT = '#ffffff';

function svg(inner, { size = 48, viewBox = '0 0 48 48', cls = '' } = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  if (cls) el.setAttribute('class', cls);
  el.innerHTML = inner;
  return el;
}

// ---------------------------------------------------------------------------
// AVATARS — 10 abstract De Stijl compositions inside a rounded tile.
// Each is a unique arrangement of primary blocks + black rules. No faces,
// no clichés — pure Mondrian-style identity marks.
// ---------------------------------------------------------------------------
const AVATAR_IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'];

const AVATAR_ART = {
  a1: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <rect x="0" y="0" width="28" height="28" fill="${RED}"/>
       <rect x="28" y="28" width="20" height="20" fill="${BLUE}"/>
       <rect x="0" y="30" width="16" height="18" fill="${YEL}"/>
       <path d="M28 0v48M0 28h48" stroke="${BLK}" stroke-width="3"/>`,
  a2: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <rect x="0" y="0" width="48" height="18" fill="${BLUE}"/>
       <rect x="30" y="18" width="18" height="30" fill="${YEL}"/>
       <path d="M0 18h48M30 18v30" stroke="${BLK}" stroke-width="3"/>`,
  a3: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <rect x="0" y="0" width="20" height="48" fill="${YEL}"/>
       <rect x="20" y="0" width="28" height="22" fill="${RED}"/>
       <path d="M20 0v48M20 22h28" stroke="${BLK}" stroke-width="3"/>`,
  a4: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <circle cx="24" cy="24" r="13" fill="${RED}"/>
       <rect x="0" y="0" width="48" height="10" fill="${BLK}"/>
       <rect x="0" y="38" width="48" height="10" fill="${BLUE}"/>`,
  a5: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <rect x="0" y="0" width="24" height="24" fill="${BLUE}"/>
       <rect x="24" y="24" width="24" height="24" fill="${YEL}"/>
       <path d="M24 0v48M0 24h48" stroke="${BLK}" stroke-width="3"/>`,
  a6: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <rect x="0" y="28" width="48" height="20" fill="${RED}"/>
       <circle cx="14" cy="14" r="9" fill="${YEL}"/>
       <path d="M0 28h48" stroke="${BLK}" stroke-width="3"/>`,
  a7: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <rect x="0" y="0" width="30" height="30" fill="${YEL}"/>
       <rect x="30" y="0" width="18" height="48" fill="${BLUE}"/>
       <rect x="0" y="30" width="30" height="18" fill="${RED}"/>
       <path d="M30 0v48M0 30h30" stroke="${BLK}" stroke-width="3"/>`,
  a8: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <path d="M0 0h48v48z" fill="${BLUE}"/>
       <circle cx="16" cy="16" r="8" fill="${RED}"/>
       <path d="M48 0L0 48" stroke="${BLK}" stroke-width="3"/>`,
  a9: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <rect x="0" y="0" width="48" height="24" fill="${RED}"/>
       <rect x="0" y="24" width="24" height="24" fill="${BLUE}"/>
       <rect x="24" y="24" width="24" height="24" fill="${YEL}"/>
       <path d="M0 24h48M24 24v24" stroke="${BLK}" stroke-width="3"/>`,
  a10: `<rect width="48" height="48" rx="12" fill="${WHT}"/>
       <circle cx="24" cy="24" r="22" fill="none"/>
       <rect x="8" y="8" width="16" height="16" fill="${YEL}"/>
       <rect x="24" y="24" width="16" height="16" fill="${RED}"/>
       <rect x="24" y="8" width="16" height="16" fill="${BLUE}"/>
       <path d="M24 8v32M8 24h32" stroke="${BLK}" stroke-width="3"/>`,
};

export function avatarIds() {
  return AVATAR_IDS.slice();
}

export function isAvatarId(v) {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(AVATAR_ART, v);
}

// Render an avatar. Accepts an id ('a1'..'a10'); falls back to a neutral mark.
export function avatar(id, size = 48) {
  const art = AVATAR_ART[id] || NEUTRAL_AVATAR;
  return svg(art, { size, cls: 'art-avatar' });
}

const NEUTRAL_AVATAR = `<rect width="48" height="48" rx="12" fill="${WHT}"/>
  <rect x="0" y="0" width="48" height="16" fill="${BLK}"/>
  <circle cx="24" cy="30" r="9" fill="${RED}"/>`;

// ---------------------------------------------------------------------------
// CHALLENGE PICTOGRAMS — flat De Stijl scenes, one per challenge keyword.
// Rendered larger (hero) in the challenge card.
// ---------------------------------------------------------------------------
const CHALLENGE_ART = {
  shoe: `<rect x="6" y="26" width="30" height="12" rx="3" fill="${RED}"/><path d="M6 32h30" stroke="${BLK}" stroke-width="2"/><rect x="30" y="14" width="12" height="24" rx="3" fill="${YEL}"/><path d="M30 26l12-6" stroke="${BLK}" stroke-width="2"/>`,
  red: `<circle cx="24" cy="24" r="16" fill="${RED}"/><circle cx="24" cy="24" r="16" fill="none" stroke="${BLK}" stroke-width="2"/>`,
  paw: `<circle cx="24" cy="30" r="9" fill="${BLK}"/><circle cx="14" cy="20" r="4.5" fill="${RED}"/><circle cx="24" cy="15" r="4.5" fill="${BLUE}"/><circle cx="34" cy="20" r="4.5" fill="${YEL}"/>`,
  ghost: `<path d="M12 40V22a12 12 0 0 1 24 0v18l-4-3-4 3-4-3-4 3-4-3z" fill="${WHT}" stroke="${BLK}" stroke-width="2.5"/><circle cx="19" cy="22" r="2.4" fill="${BLK}"/><circle cx="29" cy="22" r="2.4" fill="${BLK}"/>`,
  box: `<rect x="10" y="18" width="16" height="16" rx="4" fill="${RED}"/><rect x="26" y="14" width="12" height="10" rx="3" fill="${BLUE}"/><path d="M26 20h-4" stroke="${BLK}" stroke-width="3"/>`,
  bag: `<path d="M14 18h20l2 22H12z" fill="${YEL}" stroke="${BLK}" stroke-width="2.5"/><path d="M18 18a6 6 0 0 1 12 0" fill="none" stroke="${BLK}" stroke-width="2.5"/>`,
  run: `<circle cx="30" cy="12" r="4" fill="${BLK}"/><path d="M28 18l-8 4 4 6-6 8" stroke="${RED}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M24 22l8 2 2 8" stroke="${BLUE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  dance: `<circle cx="22" cy="12" r="4" fill="${BLK}"/><path d="M22 16l-2 12 6 10" stroke="${RED}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M20 20l-8-2M20 22l12 4" stroke="${BLUE}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  broccoli: `<circle cx="18" cy="16" r="7" fill="${BLUE}"/><circle cx="30" cy="16" r="7" fill="${BLUE}"/><circle cx="24" cy="12" r="7" fill="${BLUE}"/><rect x="20" y="20" width="8" height="18" rx="3" fill="${YEL}"/>`,
  scream: `<circle cx="24" cy="24" r="16" fill="${YEL}" stroke="${BLK}" stroke-width="2.5"/><circle cx="18" cy="20" r="2.6" fill="${BLK}"/><circle cx="30" cy="20" r="2.6" fill="${BLK}"/><ellipse cx="24" cy="32" rx="5" ry="6" fill="${BLK}"/>`,
  beach: `<rect x="6" y="30" width="36" height="12" fill="${BLUE}"/><circle cx="34" cy="16" r="7" fill="${YEL}"/><path d="M6 32q9-5 18 0t18 0" stroke="${WHT}" stroke-width="2" fill="none"/>`,
  lion: `<circle cx="24" cy="24" r="15" fill="${YEL}"/><circle cx="24" cy="24" r="15" fill="none" stroke="${RED}" stroke-width="4" stroke-dasharray="4 5"/><circle cx="19" cy="22" r="2.4" fill="${BLK}"/><circle cx="29" cy="22" r="2.4" fill="${BLK}"/><path d="M20 30h8" stroke="${BLK}" stroke-width="2.5"/>`,
  eat: `<circle cx="26" cy="24" r="12" fill="${RED}"/><path d="M10 12v16M10 12a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0" stroke="${BLK}" stroke-width="2.5" fill="none"/>`,
  nature: `<path d="M24 10c6 6 6 12 0 18-6-6-6-12 0-18z" fill="${BLUE}"/><path d="M24 20c5 3 5 9 0 14-5-5-5-11 0-14z" fill="${YEL}"/><path d="M24 28v12" stroke="${BLK}" stroke-width="2.5"/>`,
  camera: `<rect x="8" y="16" width="32" height="22" rx="4" fill="${BLK}"/><rect x="18" y="12" width="12" height="6" rx="2" fill="${BLK}"/><circle cx="24" cy="27" r="8" fill="${YEL}"/><circle cx="24" cy="27" r="4" fill="${RED}"/>`,
};

// Map a French challenge string to a pictogram key.
export function challengeArt(txt = '', size = 56) {
  const t = txt.toLowerCase();
  let key = 'camera';
  if (t.includes('chaussure')) key = 'shoe';
  else if (t.includes('rouge')) key = 'red';
  else if (t.includes('animal')) key = 'paw';
  else if (t.includes('horreur')) key = 'ghost';
  else if (t.includes('boxe')) key = 'box';
  else if (t.includes('commerç')) key = 'bag';
  else if (t.includes('cour')) key = 'run';
  else if (t.includes('danse')) key = 'dance';
  else if (t.includes('brocoli')) key = 'broccoli';
  else if (t.includes('cri')) key = 'scream';
  else if (t.includes('plage')) key = 'beach';
  else if (t.includes('lion')) key = 'lion';
  else if (t.includes('mange')) key = 'eat';
  else if (t.includes('nature')) key = 'nature';
  return svg(CHALLENGE_ART[key], { size, cls: 'art-challenge' });
}

// ---------------------------------------------------------------------------
// INLINE ICONS — line style, use currentColor (for text, chips, toasts...).
// ---------------------------------------------------------------------------
const LINE = {
  hand: '<path d="M8 12v-1a2 2 0 0 1 4 0M12 11V9a2 2 0 0 1 4 0v2M16 11a2 2 0 0 1 4 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-4.2-1.8L5 18.5a2 2 0 0 1 3-2.6l1 1V8a2 2 0 0 1 4 0"/>',
  flame: '<path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 1.5 2S12 8 12 3z"/>',
  moon: '<path d="M20 14a8 8 0 1 1-10-10 6.5 6.5 0 0 0 10 10z"/>',
  pin: '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  doc: '<path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>',
  warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  chat: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/>',
  arrow: '<path d="M15 6l-6 6 6 6"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  sparkStroke: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>',
};

export function line(name, size = 20) {
  const el = svg(LINE[name] || '', { size, viewBox: '0 0 24 24' });
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '1.7');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  return el;
}
