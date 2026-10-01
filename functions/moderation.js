// ---------------------------------------------------------------------------
// Clove — lightweight content moderation (Apple 1.2: content filter).
//
// A production app would call a real image/text classifier. Here we do
// deterministic, dependency-free validation + a profanity/PII heuristic that
// is enough to reject the most obvious objectionable text and malformed media.
// ---------------------------------------------------------------------------

// Very small illustrative blocklist (extend / swap for a real service).
const BANNED = [
  'connard', 'salope', 'pute', 'enculé', 'nique', 'fdp',
  'bitch', 'whore', 'faggot', 'nigger', 'rape', 'kill yourself', 'kys',
];

const CONTACT_LEAK =
  /(\b\d[\d .-]{7,}\d\b)|(\b[\w.+-]+@[\w-]+\.[\w.-]+\b)|(@[\w.]{3,})/i; // phones, emails, handles

export function moderateText(raw) {
  const text = (raw || '').toString();
  if (!text.trim()) return { ok: false, reason: 'Message vide.' };
  if (text.length > 1000) return { ok: false, reason: 'Message trop long.' };
  const lower = text.toLowerCase();
  if (BANNED.some((w) => lower.includes(w))) {
    return { ok: false, reason: 'Ce message enfreint nos règles de communauté.' };
  }
  // Encourage keeping first exchanges on-platform (soft check, not blocking).
  const contactLeak = CONTACT_LEAK.test(text);
  return { ok: true, text: text.slice(0, 1000), contactLeak };
}

// Validate an uploaded photo data URL: correct type, plausible size.
export function moderatePhoto(dataUrl) {
  const s = (dataUrl || '').toString();
  const m = /^data:image\/(png|jpe?g|webp|heic|heif);base64,([A-Za-z0-9+/=]+)$/.exec(s);
  if (!m) return { ok: false, reason: 'Format d’image non supporté.' };
  const bytes = Math.floor((m[2].length * 3) / 4);
  if (bytes < 40) return { ok: false, reason: 'Image invalide.' };
  if (bytes > 8 * 1024 * 1024) return { ok: false, reason: 'Image trop lourde (max 8 Mo).' };
  return { ok: true };
}
