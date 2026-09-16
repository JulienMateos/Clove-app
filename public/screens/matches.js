import { h } from '../dom.js';
import { api } from '../api.js';
import { state, render } from '../app.js';

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

export function renderMatches() {
  if (!loaded) { loaded = true; loadMatches(); }

  // Chat view
  if (state.activeMatch) {
    const m = state.activeMatch;
    const log = h('div', { class: 'chat-log' });
    if (state.messages.length === 0) log.append(h('p', { class: 'muted center', style: { fontSize: '13px' } }, 'Vous vous êtes rencontrés en vrai. À vous de jouer 💬'));
    for (const msg of state.messages) log.append(h('div', { class: 'bubble ' + (msg.sender_id === state.user.id ? 'me' : 'them') }, msg.body));
    const input = h('input', { placeholder: 'Écris un message…', onKeydown: (e) => { if (e.key === 'Enter') send(input); } });
    return h('div', { class: 'app-shell' },
      h('div', { class: 'brand' }, h('button', { class: 'btn ghost', style: { width: 'auto', padding: '8px 12px' }, onClick: () => { state.activeMatch = null; render(); } }, '← Retour')),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('div', { class: 'avatar' }, m.other?.avatar || '👤'),
          h('div', {}, h('div', { style: { fontWeight: 700 } }, `${m.other?.username} ${m.other?.verified ? '✅' : ''}`),
            h('div', { class: 'muted', style: { fontSize: '12px' } }, `📍 ${m.meetingSpot?.name || ''}`))),
        log,
        h('div', { class: 'chat-input' }, input, h('button', { class: 'btn', onClick: () => send(input) }, 'Envoyer')),
      ),
    );
  }

  // List view
  const shell = h('div', { class: 'app-shell' },
    h('div', { class: 'brand' }, h('div', { class: 'logo' }, 'C'),
      h('div', {}, h('h1', {}, 'Tes matchs'), h('p', { class: 'tag' }, 'Uniquement des rencontres bien réelles.'))),
  );
  if (state.matches.length === 0) {
    shell.append(h('div', { class: 'card center' },
      h('div', { style: { fontSize: '42px' } }, '🌱'),
      h('h2', {}, "Aucun match pour l'instant"),
      h('p', { class: 'sub' }, 'Passe en mode Full et laisse une étincelle arriver. Chaque match ici = une vraie rencontre vécue.'),
    ));
  } else {
    for (const m of state.matches) {
      shell.append(h('div', { class: 'match-item', onClick: () => openChat(m) },
        h('div', { class: 'avatar' }, m.other?.avatar || '👤'),
        h('div', {}, h('div', { class: 'name' }, `${m.other?.username} ${m.other?.verified ? '✅' : ''}`),
          h('div', { class: 'spot' }, `📍 ${m.meetingSpot?.name || 'Rencontre'}`)),
        h('div', { class: 'spacer' }),
        h('div', { class: 'muted', style: { fontSize: '20px' } }, '💬'),
      ));
    }
  }
  return shell;
}
