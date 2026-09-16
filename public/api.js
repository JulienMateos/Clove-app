// Clove API client (vanilla). Token stored in localStorage.
const TOKEN_KEY = 'clove_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) { setToken(null); throw new Error('unauthorized'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  register: (p) => req('POST', '/api/register', p),
  me: () => req('GET', '/api/me'),
  updateMe: (p) => req('PUT', '/api/me', p),
  setMode: (mode) => req('POST', '/api/mode', { mode }),
  heartbeat: (p) => req('POST', '/api/heartbeat', p),
  session: () => req('GET', '/api/session'),
  interest: (id, interested) => req('POST', `/api/session/${id}/interest`, { interested }),
  photo: (id, photoUrl) => req('POST', `/api/session/${id}/photo`, { photoUrl }),
  review: (id, accept) => req('POST', `/api/session/${id}/review`, { accept }),
  cancelSession: (id) => req('POST', `/api/session/${id}/cancel`, {}),
  matches: () => req('GET', '/api/matches'),
  messages: (id) => req('GET', `/api/matches/${id}/messages`),
  sendMessage: (id, body) => req('POST', `/api/matches/${id}/messages`, { body }),
  // Safety & compliance
  block: (userId) => req('POST', '/api/block', { userId }),
  unblock: (userId) => req('POST', '/api/unblock', { userId }),
  report: (payload) => req('POST', '/api/report', payload),
  deleteAccount: () => req('DELETE', '/api/me'),
  setConsent: (payload) => req('POST', '/api/consent', payload),
};

export function connectWS(onMessage) {
  let ws, closed = false, retry = 0;
  function open() {
    const token = getToken();
    if (!token) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws?token=${token}`);
    ws.onmessage = (ev) => {
      try { const { type, payload } = JSON.parse(ev.data); onMessage(type, payload); } catch {}
    };
    ws.onopen = () => { retry = 0; };
    ws.onclose = () => { if (closed) return; retry = Math.min(retry + 1, 6); setTimeout(open, 500 * retry); };
    ws.onerror = () => { try { ws.close(); } catch {} };
  }
  open();
  return () => { closed = true; if (ws) ws.close(); };
}
