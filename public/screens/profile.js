import { h } from '../dom.js';
import { api, setToken } from '../api.js';
import { state, render, toast } from '../app.js';
import { mondrianBar, logoMark, icon, openSheet, closeSheet } from '../ui.js';
import { avatar } from '../art.js';

export function renderProfile() {
  const u = state.user;
  const d = { username: u.username, bio: u.bio || '', socialStyle: u.socialStyle, attraction: u.attraction };

  async function save() {
    try {
      const { user } = await api.updateMe(d);
      state.user = user;
      toast('Profil mis à jour');
      render();
    } catch (e) { toast(e.message || 'Échec de la mise à jour'); }
  }
  function logout() { setToken(null); location.reload(); }

  const attrChips = h('div', { class: 'chips' },
    [['homme', 'Des hommes'], ['femme', 'Des femmes'], ['les_deux', 'Les deux']].map(([v, l]) =>
      h('button', { class: 'chip' + (d.attraction === v ? ' active' : ''), onClick: (e) => {
        d.attraction = v; markActive(attrChips, e.target); } }, l)));
  const styleChips = h('div', { class: 'chips' },
    h('button', { class: 'chip' + (d.socialStyle === 'extraverti' ? ' active' : ''), onClick: (e) => { d.socialStyle = 'extraverti'; markActive(styleChips, e.target); } }, 'Extraverti·e · défis IRL'),
    h('button', { class: 'chip' + (d.socialStyle === 'introverti' ? ' active' : ''), onClick: (e) => { d.socialStyle = 'introverti'; markActive(styleChips, e.target); } }, 'En douceur'),
  );

  const goLegal = (p) => { state.legalPage = p; render(); };

  return h('div', { class: 'app-shell' },
    h('div', { class: 'brand' }, logoMark(42),
      h('div', {}, h('h1', {}, 'Profil'), h('p', { class: 'tag' }, u.verified ? 'Identité vérifiée' : 'Non vérifié'))),
    mondrianBar(),

    // Identity card
    h('div', { class: 'card' },
      h('div', { class: 'row', style: { marginBottom: '4px' } },
        h('div', { class: 'avatar art big' }, avatar(u.avatar, 64)),
        h('div', {}, h('div', { style: { fontWeight: 800, fontSize: '20px', letterSpacing: '-0.4px' } }, u.username),
          h('div', { class: 'muted', style: { fontSize: '13px' } }, 'Dévoilé progressivement · après la rencontre'))),
      h('label', {}, 'Prénom / pseudo'),
      h('input', { value: d.username, maxlength: 40, onInput: (e) => { d.username = e.target.value; } }),
      h('label', {}, 'Petite phrase (révélée après un match)'),
      h('textarea', { value: d.bio, maxlength: 280, onInput: (e) => { d.bio = e.target.value; } }),
      h('label', {}, 'Je cherche à rencontrer'), attrChips,
      h('label', {}, 'Style de rencontre'), styleChips,
      h('button', { class: 'btn', style: { marginTop: '18px' }, onClick: save }, 'Enregistrer'),
    ),

    // Location consent toggle (Apple 5.1 — user control over data)
    consentCard(u),

    // Legal & safety hub
    h('div', { class: 'list-card' },
      listRow('shield', 'Sécurité & confidentialité', () => goLegal('hub')),
      listRow('lock', 'Politique de confidentialité', () => goLegal('privacy')),
      listRow('flag', 'Conditions d’utilisation', () => goLegal('terms')),
    ),

    // Account
    h('div', { class: 'card' },
      h('h2', {}, 'Compte'),
      h('button', { class: 'btn secondary', onClick: logout }, 'Se déconnecter'),
      h('button', { class: 'btn danger', style: { marginTop: '10px' }, onClick: () => confirmDelete() }, 'Supprimer mon compte'),
      h('p', { class: 'muted', style: { fontSize: '12px', marginTop: '10px', textAlign: 'center' } }, 'La suppression efface définitivement toutes tes données.'),
    ),

    h('p', { class: 'muted center', style: { fontSize: '12px', padding: '4px 0 0' } }, 'Clove · 17+ · © 2026'),
  );
}

function consentCard(u) {
  const toggle = h('button', { class: 'toggle-row' + (u.consentLocation ? ' on' : ''), onClick: async () => {
    const next = !u.consentLocation;
    try {
      const { user } = await api.setConsent({ location: next });
      state.user = user;
      toast(next ? 'Localisation activée' : 'Localisation désactivée — tu passes en Ghost');
      if (!next && state.presence) { try { await api.setMode('ghost'); } catch {} }
      render();
    } catch { toast('Échec'); }
  } }, h('span', {}, 'Autoriser la localisation en temps réel'), h('span', { class: 'switch' }));

  return h('div', { class: 'card' },
    h('h2', {}, 'Données & permissions'),
    h('p', { class: 'sub' }, 'Ta position n’est utilisée que pour détecter une rencontre à proximité, en Glance ou Full.'),
    toggle,
  );
}

function confirmDelete() {
  openSheet('',
    h('div', { class: 'center' },
      h('div', { class: 'sheet-icon danger' }, icon('trash', 30)),
      h('h3', { style: { margin: '10px 0 6px' } }, 'Supprimer ton compte ?'),
      h('p', { class: 'sheet-sub' }, 'Cette action est définitive. Ton profil, tes matchs, tes messages et tes photos seront effacés immédiatement.'),
      h('button', { class: 'btn danger-fill', onClick: async () => {
        try { await api.deleteAccount(); setToken(null); location.reload(); }
        catch { toast('Échec de la suppression.'); }
      } }, 'Supprimer définitivement'),
      h('button', { class: 'btn ghost', onClick: closeSheet }, 'Annuler'),
    )
  );
}

function listRow(iconName, label, onClick) {
  return h('button', { class: 'list-row', onClick },
    h('span', { class: 'list-ico' }, icon(iconName, 20)),
    h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, label)),
    h('span', { class: 'list-chev' }, icon('chevron', 18)),
  );
}

function markActive(container, target) {
  for (const c of container.querySelectorAll('.chip')) c.classList.remove('active');
  target.classList.add('active');
}
