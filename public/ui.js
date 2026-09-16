import { h } from './dom.js';

// De Stijl / Mondrian signature bar — an unmistakable, non-generic accent.
export function mondrianBar() {
  return h('div', { class: 'mondrian-bar' },
    h('i', {}), h('i', {}), h('i', {}), h('i', {}), h('i', {}),
  );
}

// Minimal line icons (SF-Symbols-ish) as inline SVG, so the tab bar and
// headers don't rely on cartoonish emoji.
const ICONS = {
  radar:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  heart:
    '<path d="M12 20s-6.5-4.35-9-8.24C1.2 8.9 2.3 5.5 5.5 5.5c1.9 0 3.1 1.1 3.9 2.2.8-1.1 2-2.2 3.9-2.2 3.2 0 4.3 3.4 2.5 6.26C18.5 15.65 12 20 12 20z"/>',
  person:
    '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/>',
  // Availability modes
  ghost:
    '<path d="M6 19V10a6 6 0 0 1 12 0v9l-2-1.5L14 19l-2-1.5L10 19l-2-1.5L6 19z"/><circle cx="9.5" cy="10.5" r="0.6" fill="currentColor"/><circle cx="14.5" cy="10.5" r="0.6" fill="currentColor"/>',
  glance:
    '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
  spark:
    '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>',
};

export function icon(name, size = 24) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '1.7');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.innerHTML = ICONS[name] || '';
  return el;
}
