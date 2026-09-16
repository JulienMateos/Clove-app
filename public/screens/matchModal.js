import { h } from '../dom.js';
import { api } from '../api.js';
import { state, render, closeSession } from '../app.js';
import { safetyMenu } from '../safety.js';
import { matchStepper, countdownRing, icon } from '../ui.js';

// A little flavour glyph for each challenge (emoji renders on device; falls
// back gracefully). The camera icon in the frame is always a crisp SVG.
function challengeEmoji(txt = '') {
  const t = txt.toLowerCase();
  if (t.includes('chaussure')) return '👟';
  if (t.includes('rouge')) return '🔴';
  if (t.includes('animal')) return '🐾';
  if (t.includes('horreur')) return '🎃';
  if (t.includes('boxe')) return '🥊';
  if (t.includes('commerç')) return '🛍️';
  if (t.includes('cour')) return '🏃';
  if (t.includes('danse')) return '💃';
  if (t.includes('brocoli')) return '🥦';
  if (t.includes('cri')) return '😱';
  if (t.includes('plage')) return '🏖️';
  if (t.includes('lion')) return '🦁';
  if (t.includes('mange')) return '🍽️';
  if (t.includes('nature')) return '🌿';
  return '📸';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function act(fn) {
  try { const { session } = await fn(); if (session) { state.session = session; render(); } }
  catch {}
}

// Keep a single live countdown across re-renders for the photo challenge.
function stopCountdown() {
  if (state._cd) { state._cd.stop(); state._cd = null; }
}

export function renderMatchModal(s) {
  const inner = h('div', { class: 'inner fade-in' });

  // Derive the screen from MY perspective (see interest-step comment).
  let status = s.status;
  if ((status === 'PENDING' || status === 'INTEREST_WAIT') && !s.myInterest) {
    status = 'PENDING';
  }

  // Progress stepper on every live step (not on terminal result screens).
  const showStepper = ['PENDING', 'INTEREST_WAIT', 'PHOTO_CHALLENGE', 'PHOTO_REVIEW'].includes(status);
  if (showStepper) inner.append(matchStepper(status));

  if (status !== 'PHOTO_CHALLENGE') stopCountdown();

  if (status === 'PENDING') {
    inner.append(
      h('span', { class: 'pill' }, `À ${s.distance} m de toi`),
      h('div', { class: 'headline' }, 'Une étincelle à deux pas.'),
      h('p', { class: 'lead' }, 'Une personne compatible est juste à côté. Prêt·e à tenter un défi pour la rencontrer, là, maintenant ?'),
      h('div', { class: 'person-card' },
        h('div', { class: 'avatar' }, s.other?.avatar || '👤'),
        h('div', { class: 'person-meta' },
          h('div', { class: 'person-name' }, `${s.other?.username || 'Anonyme'}${s.other?.verified ? ' ✓' : ''}`),
          h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Profil dévoilé après votre rencontre')),
        h('div', { class: 'spacer' }),
        safetyMenu(s.other, { context: 'profile', onDone: () => closeSession() }),
      ),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn secondary', onClick: () => act(() => api.interest(s.sessionId, false)) }, 'Pas maintenant'),
        h('button', { class: 'btn', onClick: () => act(() => api.interest(s.sessionId, true)) }, 'Intéressé·e'),
      ),
    );
  }

  else if (status === 'INTEREST_WAIT') {
    inner.append(h('div', { class: 'center' },
      h('div', { class: 'pulse-orb' }, h('div', { class: 'avatar big' }, s.other?.avatar || '👤')),
      h('div', { class: 'headline', style: { fontSize: '22px' } }, "En attente de l'autre…"),
      h('p', { class: 'lead' }, `Tu as dit oui. On attend que ${s.other?.username || 'la personne'} accepte aussi.`),
      h('button', { class: 'btn ghost', onClick: () => act(() => api.cancelSession(s.sessionId)) }, 'Annuler'),
    ));
  }

  else if (status === 'PHOTO_CHALLENGE') {
    const fileInput = h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' },
      onChange: async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        state.photoPreview = await readFileAsDataUrl(file); render();
      } });
    const frame = h('div', { class: 'photo-frame', onClick: () => { if (!s.myPhoto) fileInput.click(); } });
    if (state.photoPreview || s.myPhoto) {
      frame.append(h('img', { src: state.photoPreview || s.myPhoto, alt: 'photo' }));
    } else {
      frame.append(h('div', { class: 'photo-hint' }, icon('camera', 34), h('span', {}, 'Touche pour prendre ta photo')));
    }
    frame.append(fileInput);

    // Challenge header with a live countdown ring.
    const header = h('div', { class: 'challenge-head' },
      h('div', {},
        h('span', { class: 'pill' }, 'Défi IRL'),
        h('div', { class: 'challenge-title' }, s.challenge),
      ),
    );
    if (!s.myPhoto) {
      // Start (or keep) a 90s countdown; auto-cancel the session on timeout.
      if (!state._cd) {
        state._cd = countdownRing(90, () => { stopCountdown(); act(() => api.cancelSession(s.sessionId)); });
      }
      header.append(h('div', { class: 'challenge-timer' }, state._cd.node));
    }

    inner.append(
      h('div', { class: 'challenge-emoji' }, challengeEmoji(s.challenge)),
      header,
      frame,
    );
    if (s.myPhoto) {
      stopCountdown();
      inner.append(h('div', { class: 'waiting-note' }, icon('check', 18), 'Photo envoyée — on attend l’autre…'));
    } else {
      inner.append(h('div', { class: 'btn-row', style: { marginTop: '16px' } },
        h('button', { class: 'btn secondary', onClick: () => fileInput.click() }, state.photoPreview ? 'Reprendre' : 'Choisir'),
        h('button', { class: 'btn', disabled: !state.photoPreview, onClick: () => act(async () => {
          stopCountdown();
          const r = await api.photo(s.sessionId, state.photoPreview); state.photoPreview = null; return r;
        }) }, 'Envoyer'),
      ));
    }
  }

  else if (status === 'PHOTO_REVIEW') {
    inner.append(
      h('div', { class: 'row' },
        h('span', { class: 'pill' }, 'Le verdict'),
        h('div', { class: 'spacer' }),
        safetyMenu(s.other, { context: 'photo', onDone: () => closeSession() }),
      ),
      h('div', { class: 'headline' }, 'Le courant est passé ?'),
      h('p', { class: 'lead' }, 'Voici vos deux défis. Envie de continuer avec cette personne ?'),
      h('div', { class: 'review-grid', style: { margin: '18px 0' } },
        h('div', {}, frameImg(s.otherPhoto), h('div', { class: 'cap' }, s.other?.username || 'Anonyme')),
        h('div', {}, frameImg(s.myPhoto), h('div', { class: 'cap' }, 'Toi')),
      ),
    );
    if (s.myAccept) inner.append(h('div', { class: 'waiting-note' }, icon('check', 18), 'Tu as dit oui — on attend la réponse de l’autre…'));
    else inner.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn secondary', onClick: () => act(() => api.review(s.sessionId, false)) }, 'On en reste là'),
      h('button', { class: 'btn accent', onClick: () => act(() => api.review(s.sessionId, true)) }, 'Oui, on continue'),
    ));
  }

  else if (status === 'COMPLETED') {
    const wrap = h('div', { class: 'center match-celebrate' },
      h('div', { class: 'confetti-bar' }, h('i', {}), h('i', {}), h('i', {}), h('i', {}), h('i', {})),
      h('div', { class: 'headline', style: { fontSize: '32px' } }, "C'est un Match !"),
      h('div', { class: 'person-card center-card' },
        h('div', { class: 'avatar big' }, s.other?.avatar || '👤'),
        h('div', { class: 'person-meta', style: { textAlign: 'left' } },
          h('div', { class: 'person-name', style: { fontSize: '18px' } }, `${s.other?.username}${s.other?.verified ? ' ✓' : ''}`),
          s.other?.bio ? h('div', { class: 'muted', style: { fontSize: '13px' } }, s.other.bio) : null,
        ),
      ),
    );
    if (s.meetingSpot) {
      wrap.append(h('div', { class: 'spot-card', style: { textAlign: 'left' } },
        h('div', { class: 'spot-label' }, icon('pin', 15), 'Votre point de rencontre'),
        h('div', { class: 'name' }, s.meetingSpot.name),
        h('div', { class: 'hint' }, s.meetingSpot.hint),
        h('a', { class: 'btn accent', style: { marginTop: '14px', display: 'block', textDecoration: 'none' },
          href: `https://www.google.com/maps/search/?api=1&query=${s.meetingSpot.lat},${s.meetingSpot.lng}`, target: '_blank', rel: 'noreferrer' }, 'Ouvrir dans Maps'),
      ));
    }
    wrap.append(h('p', { class: 'muted', style: { fontSize: '13px' } }, 'Le chat est maintenant débloqué dans l’onglet Matchs.'));
    wrap.append(h('button', { class: 'btn', onClick: closeSession }, 'Génial, continuer'));
    inner.append(wrap);
  }

  else { // FAILED / CANCELLED
    inner.append(h('div', { class: 'center' },
      h('div', { class: 'leaf' }, '🍃'),
      h('div', { class: 'headline', style: { fontSize: '24px' } }, 'Ce sera pour une prochaine fois'),
      h('p', { class: 'lead' }, status === 'FAILED'
        ? "Pas d'étincelle cette fois — et c'est très bien. Aucun historique, on repart à neuf."
        : 'La rencontre a été annulée.'),
      h('button', { class: 'btn', onClick: closeSession }, "Revenir à l'écoute"),
    ));
  }

  return h('div', { class: 'modal' }, inner);
}

function frameImg(src) {
  const f = h('div', { class: 'photo-frame small' });
  if (src) f.append(h('img', { src, alt: 'photo' }));
  else f.append(h('span', {}, '—'));
  return f;
}
