import { h } from '../dom.js';
import { state, render } from '../app.js';
import { mondrianBar, icon } from '../ui.js';

// Legal / safety hub — surfaces everything Apple review looks for:
// privacy policy, safety guidelines, age rating, and a contact method.
export function renderLegal() {
  const back = h('button', { class: 'icon-btn back', onClick: () => { state.legalPage = null; render(); } },
    icon('chevron', 22));
  // rotate the chevron to point left
  back.querySelector('svg').style.transform = 'scaleX(-1)';

  const page = state.legalPage;
  const shell = h('div', { class: 'app-shell' },
    h('div', { class: 'brand', style: { gap: '10px' } }, back,
      h('div', {}, h('h1', { style: { fontSize: '22px' } }, titleFor(page)))),
    mondrianBar(),
  );

  if (page === 'privacy') shell.append(privacy());
  else if (page === 'safety') shell.append(safety());
  else if (page === 'terms') shell.append(terms());
  else shell.append(hub());

  return shell;
}

function titleFor(p) {
  return p === 'privacy' ? 'Confidentialité'
    : p === 'safety' ? 'Sécurité'
    : p === 'terms' ? 'Conditions'
    : 'À propos & légal';
}

function linkRow(iconName, label, sub, onClick) {
  return h('button', { class: 'list-row', onClick },
    h('span', { class: 'list-ico' }, icon(iconName, 20)),
    h('span', { class: 'list-main' }, h('span', { class: 'list-title' }, label), sub ? h('span', { class: 'list-sub' }, sub) : null),
    h('span', { class: 'list-chev' }, icon('chevron', 18)),
  );
}

function hub() {
  const goto = (p) => { state.legalPage = p; render(); };
  return h('div', {},
    h('div', { class: 'list-card' },
      linkRow('lock', 'Politique de confidentialité', 'Ce qu’on collecte et pourquoi', () => goto('privacy')),
      linkRow('shield', 'Consignes de sécurité', 'Se rencontrer en toute sérénité', () => goto('safety')),
      linkRow('flag', 'Conditions d’utilisation', 'Règles de la communauté', () => goto('terms')),
    ),
    h('div', { class: 'card' },
      h('h2', {}, 'Classification'),
      h('p', { class: 'sub' }, 'Clove est réservé aux 17 ans et plus (rencontres, contenu généré par les utilisateurs).'),
      h('div', { class: 'age-badge' }, '17+'),
    ),
    h('div', { class: 'card' },
      h('h2', {}, 'Nous contacter'),
      h('p', { class: 'sub' }, 'Une question, un problème de sécurité, une demande RGPD ?'),
      h('a', { class: 'btn secondary', href: 'mailto:support@clove.app', style: { textDecoration: 'none', display: 'block', textAlign: 'center' } }, 'support@clove.app'),
      h('p', { class: 'muted', style: { fontSize: '12px', marginTop: '10px' } }, 'Signalements traités sous 24 h. Contenu grave retiré immédiatement.'),
    ),
    h('p', { class: 'muted center', style: { fontSize: '12px', padding: '8px 0 0' } }, '© 2026 Clove · Fait avec soin'),
  );
}

function P(t) { return h('p', { class: 'legal-p' }, t); }
function Hh(t) { return h('h3', { class: 'legal-h' }, t); }

function privacy() {
  return h('div', { class: 'card legal' },
    P('Clove est conçu autour d’un principe : le minimum de données, le maximum de vraies rencontres.'),
    Hh('Localisation'),
    P('Ta position sert uniquement à détecter une personne compatible à proximité, en temps réel, quand tu es en mode Glance ou Full. En mode Ghost, aucune position n’est utilisée. Tu peux retirer ce consentement à tout moment depuis ton profil.'),
    Hh('Photos de défi'),
    P('Les photos prises pendant un défi ne sont visibles que par la personne rencontrée, uniquement au moment de la révélation. Elles ne sont jamais publiées ni revendues.'),
    Hh('Ce qu’on ne fait pas'),
    P('Pas de feed public, pas de revente de données à des tiers, pas de partage avec des IA sans ton accord explicite. Pas de pistage publicitaire.'),
    Hh('Tes droits'),
    P('Tu peux consulter, exporter ou supprimer l’intégralité de tes données depuis l’app (Profil → Supprimer mon compte), ou en écrivant à support@clove.app.'),
  );
}

function safety() {
  return h('div', { class: 'card legal' },
    Hh('Avant la rencontre'),
    P('Les défis ont lieu dans des lieux publics et fréquentés. Préviens un·e proche de l’endroit où tu vas.'),
    Hh('Pendant'),
    P('Fais confiance à ton instinct. Tu peux quitter à tout moment — aucune obligation d’aller au bout d’un défi.'),
    Hh('Bloquer & signaler'),
    P('Chaque profil rencontré peut être bloqué ou signalé en un geste (menu ⋯). Un blocage est immédiat et définitif : vous ne serez plus jamais proposés l’un à l’autre.'),
    Hh('Vérification'),
    P('Les identités sont vérifiées à l’inscription pour limiter les faux profils. Signale tout comportement suspect : notre équipe agit sous 24 h.'),
    Hh('Urgence'),
    P('En cas de danger immédiat, contacte les secours (112 en Europe, 911 aux États-Unis).'),
  );
}

function terms() {
  return h('div', { class: 'card legal' },
    P('En utilisant Clove, tu acceptes de respecter les autres et nos règles de communauté.'),
    Hh('Interdit'),
    P('Harcèlement, haine, nudité non sollicitée, faux profils, mineurs, spam, arnaques. Toute infraction entraîne un bannissement.'),
    Hh('Ton contenu'),
    P('Tu restes propriétaire de tes photos et messages. Tu nous accordes seulement le droit de les afficher à la personne concernée dans le cadre du service.'),
    Hh('Âge'),
    P('Clove est réservé aux personnes de 17 ans et plus.'),
    Hh('Modération'),
    P('Nous filtrons le contenu et pouvons suspendre tout compte signalé à plusieurs reprises, le temps de l’examen.'),
  );
}
