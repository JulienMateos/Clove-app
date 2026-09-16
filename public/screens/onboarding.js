import { h } from '../dom.js';
import { api, setToken } from '../api.js';
import { state, render, onLoggedIn } from '../app.js';
import { mondrianBar } from '../ui.js';

const AVATARS = ['🦊', '🐼', '🦁', '🐙', '🦄', '🐝', '🦋', '🐸', '🦉', '🐳'];

function brand() {
  return h('div', { class: 'brand' },
    h('div', { class: 'logo' }, 'C'),
    h('div', {},
      h('h1', {}, 'Clove'),
      h('p', { class: 'tag' }, "On se voit d'abord. On discute ensuite."),
    ),
  );
}

function go(step) { state.onboardingStep = step; render(); }
function draft() { return state.onboardingDraft; }

async function finish() {
  const d = draft();
  try {
    const { token, user, presence } = await api.register(d);
    setToken(token);
    state.onboardingStep = 0;
    onLoggedIn(user, presence);
  } catch (e) {
    alert('Erreur : ' + e.message);
  }
}

export function renderOnboarding() {
  const d = draft();
  const step = state.onboardingStep;
  const shell = h('div', { class: 'app-shell' }, brand(), mondrianBar());

  if (step === 0) {
    shell.append(h('div', { class: 'card fade-in' },
      h('h2', {}, 'Bienvenue 👋'),
      h('p', { class: 'sub' }, "Pas de swipe. Pas de chat sans fin. Clove te fait rencontrer quelqu'un de compatible en vrai, tout près de toi — via un petit défi."),
      h('ul', { class: 'feat' },
        h('li', {}, 'Zéro défilement de profils'),
        h('li', {}, 'Une vraie rencontre, pas un match fantôme'),
        h('li', {}, 'Tu contrôles ta visibilité : Ghost · Glance · Full'),
      ),
      h('button', { class: 'btn', onClick: () => go(1) }, 'Commencer'),
    ));
  }

  if (step === 1) {
    const card = h('div', { class: 'card fade-in' },
      h('h2', {}, 'Ton profil, version allégée'),
      h('p', { class: 'sub' }, 'Le reste se dévoile progressivement, à mesure que ça avance.'),
      h('label', {}, 'Prénom / pseudo'),
      h('input', { value: d.username, maxlength: 40, placeholder: 'Alex',
        onInput: (e) => { d.username = e.target.value; nextBtn.disabled = !d.username.trim(); } }),
      h('label', {}, 'Avatar'),
    );
    const chips = h('div', { class: 'chips' },
      AVATARS.map((a) => h('button', {
        class: 'chip' + (d.avatar === a ? ' active' : ''), style: { fontSize: '18px' },
        onClick: () => { d.avatar = a; render(); },
      }, a)),
    );
    card.append(chips);
    card.append(h('label', {}, 'Petite phrase (optionnel, révélée après le match)'));
    card.append(h('textarea', { value: d.bio, maxlength: 280, placeholder: "J'adore les rencontres improbables…",
      onInput: (e) => { d.bio = e.target.value; } }));
    const nextBtn = h('button', { class: 'btn', disabled: !d.username.trim(), onClick: () => go(2) }, 'Suivant');
    card.append(nextBtn);
    shell.append(card);
  }

  if (step === 2) {
    const genderChips = () => h('div', { class: 'chips' },
      [['homme', 'Homme'], ['femme', 'Femme'], ['autre', 'Autre']].map(([v, l]) =>
        h('button', { class: 'chip' + (d.gender === v ? ' active' : ''), onClick: () => { d.gender = v; render(); } }, l)));
    const attrChips = () => h('div', { class: 'chips' },
      [['homme', 'Des hommes'], ['femme', 'Des femmes'], ['les_deux', 'Les deux']].map(([v, l]) =>
        h('button', { class: 'chip' + (d.attraction === v ? ' active' : ''), onClick: () => { d.attraction = v; render(); } }, l)));
    shell.append(h('div', { class: 'card fade-in' },
      h('h2', {}, 'Compatibilité'),
      h('p', { class: 'sub' }, 'Sert uniquement à te proposer les bonnes personnes. Jamais affiché tel quel.'),
      h('label', {}, 'Je suis'), genderChips(),
      h('label', {}, 'Je cherche à rencontrer'), attrChips(),
      h('button', { class: 'btn', disabled: !d.gender || !d.attraction, onClick: () => go(3) }, 'Suivant'),
    ));
  }

  if (step === 3) {
    const card = h('div', { class: 'card fade-in' },
      h('h2', {}, 'Comment tu te vois ?'),
      h('p', { class: 'sub' }, "Le défi IRL — se rencontrer via une mission fun — c'est intense. Il n'est proposé qu'aux profils qui aiment ça. Tu peux changer d'avis plus tard."),
      h('div', { class: 'chips col' },
        h('button', { class: 'chip wide' + (d.socialStyle === 'extraverti' ? ' active' : ''), onClick: () => { d.socialStyle = 'extraverti'; render(); } },
          '🔥 Plutôt extraverti·e — partant·e pour un défi IRL spontané'),
        h('button', { class: 'chip wide' + (d.socialStyle === 'introverti' ? ' active' : ''), onClick: () => { d.socialStyle = 'introverti'; render(); } },
          '🌙 Plutôt introverti·e — je préfère y aller doucement'),
      ),
    );
    if (d.socialStyle === 'introverti') {
      card.append(h('p', { class: 'sub', style: { marginTop: '12px' } }, 'Parfait. Tu pourras explorer en mode Glance sans être embarqué·e dans un défi.'));
    }
    card.append(h('button', { class: 'btn', disabled: !d.socialStyle, onClick: finish }, 'Entrer dans Clove'));
    shell.append(card);
  }

  return shell;
}
