import { h } from '../dom.js';
import { api } from '../api.js';
import { state, render, closeSession } from '../app.js';
import { safetyMenu } from '../safety.js';

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

export function renderMatchModal(s) {
  const inner = h('div', { class: 'inner fade-in' });
  // Derive the screen from MY perspective. The session status is shared, but
  // if I haven't answered the interest step yet I should still see the prompt,
  // even if the other person already said yes (status = INTEREST_WAIT).
  let status = s.status;
  if ((status === 'PENDING' || status === 'INTEREST_WAIT') && !s.myInterest) {
    status = 'PENDING';
  }

  if (status === 'PENDING') {
    inner.append(
      h('span', { class: 'pill' }, `Quelqu'un à ${s.distance} m`),
      h('div', { class: 'headline' }, 'Une étincelle à deux pas ✨'),
      h('p', { class: 'muted' }, 'Une personne compatible est juste à côté. Prêt·e à tenter un défi pour la rencontrer, là, maintenant ?'),
      h('div', { class: 'row', style: { margin: '18px 0' } },
        h('div', { class: 'avatar' }, s.other?.avatar || '👤'),
        h('div', {}, h('div', { style: { fontWeight: 700 } }, `${s.other?.username || 'Anonyme'} ${s.other?.verified ? '✅' : ''}`),
          h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Profil dévoilé après votre rencontre')),
        h('div', { class: 'spacer' }),
        safetyMenu(s.other, { context: 'profile', onDone: () => { closeSession(); } }),
      ),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn secondary', onClick: () => act(() => api.interest(s.sessionId, false)) }, 'Pas maintenant'),
        h('button', { class: 'btn', onClick: () => act(() => api.interest(s.sessionId, true)) }, 'Intéressé·e 🔥'),
      ),
    );
  }

  else if (status === 'INTEREST_WAIT') {
    inner.append(h('div', { class: 'center' },
      h('div', { class: 'challenge-box' }, h('div', { class: 'emoji' }, '⏳'), h('div', { class: 'txt' }, "En attente de l'autre…")),
      h('p', { class: 'muted' }, `Tu as dit oui. On attend que ${s.other?.username || 'la personne'} accepte aussi.`),
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
    if (state.photoPreview || s.myPhoto) frame.append(h('img', { src: state.photoPreview || s.myPhoto, alt: 'photo' }));
    else frame.append(h('span', {}, '📷 Touche pour prendre / choisir une photo'));
    frame.append(fileInput);

    inner.append(
      h('span', { class: 'pill' }, 'Défi IRL'),
      h('div', { class: 'headline' }, 'Vous avez matché le moment !'),
      h('div', { class: 'challenge-box' }, h('div', { class: 'emoji' }, challengeEmoji(s.challenge)), h('div', { class: 'txt' }, s.challenge)),
      frame,
    );
    if (s.myPhoto) {
      inner.append(h('p', { class: 'center muted', style: { marginTop: '14px' } }, 'Photo envoyée ✅ — on attend l’autre…'));
    } else {
      inner.append(h('div', { class: 'btn-row', style: { marginTop: '14px' } },
        h('button', { class: 'btn secondary', onClick: () => fileInput.click() }, state.photoPreview ? 'Reprendre' : 'Choisir'),
        h('button', { class: 'btn', disabled: !state.photoPreview, onClick: () => act(async () => {
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
        safetyMenu(s.other, { context: 'photo', onDone: () => { closeSession(); } }),
      ),
      h('div', { class: 'headline' }, 'Le courant est passé ?'),
      h('p', { class: 'muted' }, 'Voici vos deux défis. Envie de continuer avec cette personne ?'),
      h('div', { class: 'review-grid', style: { margin: '16px 0' } },
        h('div', {}, frameImg(s.otherPhoto), h('div', { class: 'cap' }, s.other?.username || 'Anonyme')),
        h('div', {}, frameImg(s.myPhoto), h('div', { class: 'cap' }, 'Toi')),
      ),
    );
    if (s.myAccept) inner.append(h('p', { class: 'center muted' }, 'Tu as dit oui — on attend la réponse de l’autre…'));
    else inner.append(h('div', { class: 'btn-row' },
      h('button', { class: 'btn secondary', onClick: () => act(() => api.review(s.sessionId, false)) }, 'On en reste là'),
      h('button', { class: 'btn accent', onClick: () => act(() => api.review(s.sessionId, true)) }, 'Oui, on continue 💚'),
    ));
  }

  else if (status === 'COMPLETED') {
    const wrap = h('div', { class: 'center' },
      h('div', { class: 'headline' }, "C'est un Match ! 🎉"),
      h('div', { class: 'row', style: { justifyContent: 'center', margin: '10px 0 4px' } },
        h('div', { class: 'avatar' }, s.other?.avatar || '👤'),
        h('div', { style: { textAlign: 'left' } },
          h('div', { style: { fontWeight: 800, fontSize: '18px' } }, `${s.other?.username} ${s.other?.verified ? '✅' : ''}`),
          s.other?.bio ? h('div', { class: 'muted', style: { fontSize: '13px' } }, s.other.bio) : null,
        ),
      ),
    );
    if (s.meetingSpot) {
      wrap.append(h('div', { class: 'spot-card', style: { textAlign: 'left' } },
        h('div', { class: 'muted', style: { fontSize: '12px' } }, '📍 Votre point de rencontre'),
        h('div', { class: 'name' }, s.meetingSpot.name),
        h('div', { class: 'hint' }, s.meetingSpot.hint),
        h('a', { class: 'btn accent', style: { marginTop: '12px', display: 'block', textDecoration: 'none' },
          href: `https://www.google.com/maps/search/?api=1&query=${s.meetingSpot.lat},${s.meetingSpot.lng}`, target: '_blank', rel: 'noreferrer' }, 'Ouvrir dans Maps'),
      ));
    }
    wrap.append(h('p', { class: 'muted', style: { fontSize: '13px' } }, 'Le chat est maintenant débloqué dans l’onglet Matchs.'));
    wrap.append(h('button', { class: 'btn', onClick: closeSession }, 'Génial, continuer'));
    inner.append(wrap);
  }

  else { // FAILED / CANCELLED
    inner.append(h('div', { class: 'center' },
      h('div', { class: 'challenge-box' }, h('div', { class: 'emoji' }, '🍃'), h('div', { class: 'txt' }, 'Ce sera pour une prochaine fois')),
      h('p', { class: 'muted' }, status === 'FAILED'
        ? "Pas d'étincelle cette fois — et c'est très bien. Aucun historique, on repart à neuf."
        : 'La rencontre a été annulée.'),
      h('button', { class: 'btn', onClick: closeSession }, "Revenir à l'écoute"),
    ));
  }

  return h('div', { class: 'modal' }, inner);
}

function frameImg(src) {
  const f = h('div', { class: 'photo-frame' });
  if (src) f.append(h('img', { src, alt: 'photo' }));
  else f.append(h('span', {}, '—'));
  return f;
}
