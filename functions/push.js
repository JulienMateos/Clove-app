// ---------------------------------------------------------------------------
// Clove — notifications push iOS, envoyées directement à Apple (APNs), sans SDK.
// Gratuit : inclus dans le compte Apple Developer. Il faut une clé APNs (.p8) :
//   developer.apple.com → Certificates, IDs & Profiles → Keys → + → « Apple Push Notifications service ».
// Réglages (voir FIREBASE.md) :
//   functions/.env       APNS_KEY_ID=<10 caractères>  APPLE_TEAM_ID=<10 caractères>
//   secret Firebase      firebase functions:secrets:set APNS_KEY --data-file AuthKey_XXXXXXXXXX.p8
// Sans ces réglages, rien n'est envoyé (et rien ne casse).
// ---------------------------------------------------------------------------
import http2 from 'node:http2';
import crypto from 'node:crypto';

const BUNDLE_ID = 'com.clove.mvp';
const HOSTS = { production: 'https://api.push.apple.com', sandbox: 'https://api.sandbox.push.apple.com' };

let jwt = null, jwtAt = 0;
function token(keyPem, keyId, teamId) {
  // Apple accepte un jeton pendant 1 h ; on le renouvelle toutes les 50 min.
  if (jwt && Date.now() - jwtAt < 50 * 60 * 1000) return jwt;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'ES256', kid: keyId }), body = b64({ iss: teamId, iat: Math.floor(Date.now() / 1000) });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: keyPem, dsaEncoding: 'ieee-p1363' });
  jwt = `${head}.${body}.${sig.toString('base64url')}`; jwtAt = Date.now();
  return jwt;
}

// Textes des notifications, dans la langue choisie dans l'app.
const TEXTS = {
  interest: {
    fr: ['Quelqu’un est tout près 👀', 'Ouvre Clove : tu as 2 minutes pour répondre.'],
    es: ['Alguien está muy cerca 👀', 'Abre Clove: tienes 2 minutos para responder.'],
    en: ['Someone is close by 👀', 'Open Clove: you have 2 minutes to answer.'],
  },
  challenge: {
    fr: ['Défi lancé ⏱️', '90 secondes pour ta photo du défi.'],
    es: ['Reto lanzado ⏱️', '90 segundos para tu foto del reto.'],
    en: ['Challenge on ⏱️', '90 seconds for your challenge photo.'],
  },
  herDecision: {
    fr: ['Elle a dit oui ✓', 'Sa photo est révélée. À toi de décider.'],
    es: ['Ha dicho que sí ✓', 'Su foto se ha revelado. Te toca decidir.'],
    en: ['She said yes ✓', 'Her photo is revealed. Your turn to decide.'],
  },
  match: {
    fr: ['C’est un match ! 📍', 'Votre point de rencontre : '],
    es: ['¡Es un match! 📍', 'Vuestro punto de encuentro: '],
    en: ['It’s a match! 📍', 'Your meeting point: '],
  },
};

// Le texte à envoyer pour un événement de l'UI, ou null s'il ne mérite pas de notification.
export function pushText(type, data, lang) {
  const t = TEXTS[type];
  if (!t) return null;
  if (type === 'herDecision' && !data?.accept) return null; // un refus arrive avec l'écran d'échec
  const [title, body] = t[lang] || t.fr;
  return { title, body: type === 'match' ? body + (data?.spot || '') : body };
}

// Envoie une notification. → 'sent' | 'gone' (jeton à oublier) | 'skipped' | 'error'
export function sendPush({ deviceToken, env, title, body, type }, { keyPem, keyId, teamId }) {
  if (!deviceToken || !keyPem || !keyId || !teamId) return Promise.resolve('skipped');
  const host = HOSTS[env] || HOSTS.production;
  return new Promise((resolve) => {
    let client;
    try { client = http2.connect(host); } catch (_) { return resolve('error'); }
    client.on('error', () => resolve('error'));
    const req = client.request({
      ':method': 'POST', ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${token(keyPem, keyId, teamId)}`,
      'apns-topic': BUNDLE_ID, 'apns-push-type': 'alert', 'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 180), // inutile après les délais d'une session
    });
    let status = 0, text = '';
    req.on('response', (h) => { status = h[':status']; });
    req.on('data', (c) => { text += c; });
    req.on('end', () => {
      client.close();
      if (status === 200) return resolve('sent');
      if (status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(text)) return resolve('gone');
      console.warn('[push] APNs', status, text);
      resolve('error');
    });
    req.on('error', () => { client.close(); resolve('error'); });
    req.end(JSON.stringify({ aps: { alert: { title, body }, sound: 'default' }, type }));
  });
}
