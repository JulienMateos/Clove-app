// ---------------------------------------------------------------------------
// Clove — persistence layer.
//
// The sandbox registry blocks native modules (better-sqlite3), so we use a
// dependency-free JSON document store that persists to disk. It exposes simple
// collection helpers; store.js builds the domain queries on top of it.
//
// Writes are debounced and flushed atomically (write temp file + rename) so we
// never leave a half-written database on disk.
// ---------------------------------------------------------------------------
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });
const dbFile = join(dataDir, 'clove.json');
const tmpFile = join(dataDir, 'clove.json.tmp');

const EMPTY = {
  users: [],
  presence: [],
  sessions: [],
  matches: [],
  messages: [],
};

function load() {
  if (!existsSync(dbFile)) return structuredClone(EMPTY);
  try {
    const raw = readFileSync(dbFile, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...structuredClone(EMPTY), ...parsed };
  } catch {
    return structuredClone(EMPTY);
  }
}

const data = load();
let dirty = false;
let flushTimer = null;

function scheduleFlush() {
  dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 120);
}

function flush() {
  flushTimer = null;
  if (!dirty) return;
  dirty = false;
  try {
    writeFileSync(tmpFile, JSON.stringify(data));
    renameSync(tmpFile, dbFile);
  } catch (e) {
    console.error('db flush error', e);
  }
}

// Flush on exit so nothing is lost.
process.on('exit', flush);
process.on('SIGINT', () => { flush(); process.exit(0); });
process.on('SIGTERM', () => { flush(); process.exit(0); });

// ---- Public API ----------------------------------------------------------
export const db = {
  // Return the live array for a collection (mutations must call persist()).
  table(name) {
    if (!data[name]) data[name] = [];
    return data[name];
  },
  persist: scheduleFlush,
};

export default db;
