// ---------------------------------------------------------------------------
// Clove — realtime hub. Maps userId -> set of live WebSocket connections.
// ---------------------------------------------------------------------------
const connections = new Map(); // userId -> Set<ws>

export function register(userId, ws) {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId).add(ws);
}

export function unregister(userId, ws) {
  const set = connections.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) connections.delete(userId);
}

export function sendTo(userId, type, payload) {
  const set = connections.get(userId);
  if (!set) return;
  const msg = JSON.stringify({ type, payload });
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

export function isOnline(userId) {
  return connections.has(userId);
}
