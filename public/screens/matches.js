import { h } from '../dom.js';
import { api } from '../api.js';
import { state, render } from '../app.js';
import { safetyMenu } from '../safety.js';
import { logoMark, icon } from '../ui.js';
import { avatar, line } from '../art.js';

let loaded = false;

async function loadMatches() {
  try { const { matches } = await api.matches(); state.matches = matches; render(); } catch {}
}

async function openChat(m) {
  state.activeMatch = m;
  state.messages = [];
  render();
  try { const { messages } = await api.messages(m.id); state.messages = messages; render(); } catch {}
}

async function send(draftInput) {
  const body = draftInput.value.trim();
  if (!body || !state.activeMatch) return;
  draftInput.value = '';
  try {
    const { message } = await api.sendMessage(state.activeMatch.id, body);
    state.messages.push(message);
    render();
  } catch {}
}

// Avatar tile + name with SVG verified badge (no emoji).
function tile(id, size = 44) { return h('div', { class: 'avatar art' }, avatar(id, size)); }
function nameBadge(name, verified) {
  const el = h('div', { class: 'name' }, name || 'Anonyme');
  if (verified) el.append(h('span', { class: 'verified-badge', title: 'Vérifié' }, line('check', 12)));
  return el;
}

export function renderMatches() {
  if (!loaded) { loaded = true; loadMatches(); }

  // Chat view
  if (state.activeMatch) {
    const m = state.activeMatch;
    const log = h('div', { class: 'chat-log' });
    if (state.messages.length === 0) log.append(h('p', { class: 'muted center', style: { fontSize: '13px' } }, 'Vous vous êtes rencontrés en vrai. À vous de jouer.'));
    for (const msg of state.messages) log.append(h('div', { class: 'bubble ' + (msg.sender_id === state.user.id ? 'me' : 'them') }, msg.body));
    const input = h('input', { placeholder: 'Écris un message…', onKeydown: (e) => { if (e.key === 'Enter') send(input); } });
    return h('div', { class: 'app-shell' },
      h('div', { class: 'brand' }, h('button', { class: 'icon-btn back', onClick: () => { state.activeMatch = null; render(); } }, backArrow())),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, tile(m.other?.avatar, 48),
          h('div', {}, nameBadge(m.other?.username, m.other?.verified),
            h('div', { class: 'spot-inline muted' }, line('pin', 13), h('span', {}, m.meetingSpot?.name || '')) ),
          h('div', { class: 'spacer' }),
          safetyMenu(m.other, { context: 'message', onDone: () => { state.activeMatch = null; loaded = false; render(); } })),
        log,
        h('div', { class: 'chat-input' }, input, h('button', { class: 'btn', onClick: () => send(input) }, 'Envoyer')),
      ),
    );
  }

  // List view
  const shell = h('div', { class: 'app-shell' },
    h('div', { class: 'brand' }, logoMark(42),
      h('div', {}, h('h1', {}, 'Matchs'), h('p', { class: 'tag' }, 'Uniquement des rencontres bien réelles.'))),
  );
  if (state.matches.length === 0) {
    shell.append(h('div', { class: 'card center empty' },
      h('div', { class: 'empty-art' }, line('sparkStroke', 40)),
      h('h2', {}, "Aucun match pour l'instant"),
      h('p', { class: 'sub' }, 'Passe en mode Full et laisse une étincelle arriver. Chaque match ici = une vraie rencontre vécue.'),
    ));
  } else {
    for (const m of state.matches) {
      shell.append(h('div', { class: 'match-item', onClick: () => openChat(m) },
        tile(m.other?.avatar, 44),
        h('div', {}, nameBadge(m.other?.username, m.other?.verified),
          h('div', { class: 'spot-inline spot' }, line('pin', 12), h('span', {}, m.meetingSpot?.name || 'Rencontre'))),
        h('div', { class: 'spacer' }),
        h('div', { class: 'match-chat-ico' }, line('chat', 20)),
      ));
    }
  }
  return shell;
}

function backArrow() {
  const el = line('arrow', 22);
  return el;
}
