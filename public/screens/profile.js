import { h } from '../dom.js';
import { api, setToken } from '../api.js';
import { state, render, toast } from '../app.js';

export function renderProfile() {
  const u = state.user;
  const d = { username: u.username, bio: u.bio || '', socialStyle: u.socialStyle, attraction: u.attraction };

  async function save() {
    try {
      const { user } = await api.updateMe(d);
      state.user = user;
      toast('Profil mis à jour ✅');
      render();
    } catch {}
  }
  function logout() { setToken(null); location.reload(); }

  const attrChips = h('div', { class: 'chips' },
    [['homme', 'Des hommes'], ['femme', 'Des femmes'], ['les_deux', 'Les deux']].map(([v, l]) =>
      h('button', { class: 'chip' + (d.attraction === v ? ' active' : ''), onClick: (e) => {
        d.attraction = v; markActive(attrChips, e.target); } }, l)));
  const styleChips = h('div', { class: 'chips' },
    h('button', { class: 'chip' + (d.socialStyle === 'extraverti' ? ' active' : ''), onClick: (e) => { d.socialStyle = 'extraverti'; markActive(styleChips, e.target); } }, '🔥 Extraverti·e (défis IRL)'),
    h('button', { class: 'chip' + (d.socialStyle === 'introverti' ? ' active' : ''), onClick: (e) => { d.socialStyle = 'introverti'; markActive(styleChips, e.target); } }, '🌙 Doucement'),
  );

  return h('div', { class: 'app-shell' },
    h('div', { class: 'brand' }, h('div', { class: 'logo' }, 'C'),
      h('div', {}, h('h1', {}, 'Ton profil'), h('p', { class: 'tag' }, `Identité vérifiée ${u.verified ? '✅' : ''}`))),

    h('div', { class: 'card' },
      h('div', { class: 'row', style: { marginBottom: '12px' } },
        h('div', { class: 'avatar' }, u.avatar || '👤'),
        h('div', {}, h('div', { style: { fontWeight: 800, fontSize: '18px' } }, u.username),
          h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Profil dévoilé progressivement'))),
      h('label', {}, 'Prénom / pseudo'),
      h('input', { value: d.username, maxlength: 40, onInput: (e) => { d.username = e.target.value; } }),
      h('label', {}, 'Petite phrase (révélée après un match)'),
      h('textarea', { value: d.bio, maxlength: 280, onInput: (e) => { d.bio = e.target.value; } }),
      h('label', {}, 'Je cherche à rencontrer'), attrChips,
      h('label', {}, 'Style de rencontre'), styleChips,
      h('button', { class: 'btn', style: { marginTop: '16px' }, onClick: save }, 'Enregistrer'),
    ),

    h('div', { class: 'card' },
      h('h2', {}, 'Sécurité & confiance'),
      h('p', { class: 'sub' }, "Clove protège l'expérience : identités vérifiées, rencontres en lieux publics, aucun chat avant de s'être vus en vrai, et révélation progressive du profil."),
      h('button', { class: 'btn danger', onClick: logout }, 'Se déconnecter'),
    ),
  );
}

function markActive(container, target) {
  for (const c of container.querySelectorAll('.chip')) c.classList.remove('active');
  target.classList.add('active');
}
