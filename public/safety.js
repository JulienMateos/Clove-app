import { h } from './dom.js';
import { api } from './api.js';
import { toast } from './app.js';
import { openSheet, closeSheet, icon } from './ui.js';

const REPORT_REASONS = [
  ['inappropriate_photos', 'Photos inappropriées'],
  ['harassment', 'Harcèlement ou menaces'],
  ['fake_profile', 'Faux profil / usurpation'],
  ['underage', 'Utilisateur·rice mineur·e'],
  ['spam', 'Spam ou arnaque'],
  ['other', 'Autre'],
];

// Report sheet — Apple 1.2: mechanism to report objectionable content/users.
export function openReportSheet(user, { context = 'profile', onDone } = {}) {
  let reason = null;
  let note = '';
  let alsoBlock = true;

  const reasonList = h('div', { class: 'sheet-list' },
    REPORT_REASONS.map(([v, label]) => {
      const row = h('button', { class: 'sheet-row', onClick: () => {
        reason = v;
        [...reasonList.querySelectorAll('.sheet-row')].forEach((r) => r.classList.remove('sel'));
        row.classList.add('sel');
        submit.disabled = false;
      } }, h('span', {}, label), h('span', { class: 'radio' }));
      return row;
    })
  );

  const noteInput = h('textarea', { placeholder: 'Détails (optionnel)…', maxlength: 500,
    onInput: (e) => { note = e.target.value; } });

  const blockToggle = h('button', { class: 'toggle-row on', onClick: () => {
    alsoBlock = !alsoBlock;
    blockToggle.classList.toggle('on', alsoBlock);
  } }, h('span', {}, 'Bloquer aussi cette personne'), h('span', { class: 'switch' }));

  const submit = h('button', { class: 'btn danger-fill', disabled: true, onClick: async () => {
    try {
      await api.report({ userId: user.id, context, reason, note, alsoBlock });
      closeSheet();
      toast('Signalement envoyé. Merci — notre équipe examine sous 24 h.');
      onDone && onDone({ blocked: alsoBlock });
    } catch (e) { toast('Échec du signalement.'); }
  } }, 'Envoyer le signalement');

  openSheet(`Signaler ${user?.username || 'ce profil'}`,
    h('div', {},
      h('p', { class: 'sheet-sub' }, 'Aide-nous à garder Clove sûr. Les signalements sont confidentiels.'),
      reasonList,
      noteInput,
      blockToggle,
      submit,
      h('button', { class: 'btn ghost', onClick: closeSheet }, 'Annuler'),
    )
  );
}

// Block sheet — quick confirm.
export function openBlockSheet(user, { onDone } = {}) {
  openSheet('',
    h('div', { class: 'center' },
      h('div', { class: 'sheet-icon danger' }, icon('ban', 30)),
      h('h3', { style: { margin: '10px 0 6px' } }, `Bloquer ${user?.username || ''} ?`),
      h('p', { class: 'sheet-sub' }, 'Vous ne serez plus jamais proposés l’un à l’autre, et toute conversation en cours sera fermée.'),
      h('button', { class: 'btn danger-fill', onClick: async () => {
        try { await api.block(user.id); closeSheet(); toast('Personne bloquée.'); onDone && onDone(); }
        catch { toast('Échec du blocage.'); }
      } }, 'Bloquer'),
      h('button', { class: 'btn ghost', onClick: closeSheet }, 'Annuler'),
    )
  );
}

// A compact "safety" action button (⋯) that opens block/report options.
export function safetyMenu(user, opts = {}) {
  return h('button', { class: 'icon-btn', title: 'Sécurité', onClick: () => {
    openSheet('',
      h('div', {},
        h('button', { class: 'sheet-row', onClick: () => { closeSheet(); setTimeout(() => openReportSheet(user, opts), 240); } },
          h('span', { class: 'row', style: { gap: '10px' } }, icon('flag', 20), 'Signaler'), h('span', {})),
        h('button', { class: 'sheet-row danger-text', onClick: () => { closeSheet(); setTimeout(() => openBlockSheet(user, opts), 240); } },
          h('span', { class: 'row', style: { gap: '10px' } }, icon('ban', 20), 'Bloquer'), h('span', {})),
        h('button', { class: 'btn ghost', onClick: closeSheet }, 'Fermer'),
      )
    );
  } }, dots());
}

function dots() {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24'); el.setAttribute('width', '22'); el.setAttribute('height', '22');
  el.setAttribute('fill', 'currentColor');
  el.innerHTML = '<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>';
  return el;
}
