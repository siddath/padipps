import { fingerprintPack } from './backup-engine.js';
import { parsePack } from './pack-engine.js';

export const ACTIVE_PACK_KEY = 'padipps-active-pack-v1';
export const STARTER_PACK_URL = new URL('./packs/starter.json', import.meta.url).toString();

export function qaPrefix(search) {
  const params = new URLSearchParams(search || '');
  const fault = params.get('fault');
  return params.has('qa') ? `padipps-qa:${fault && /^[A-Za-z0-9._-]{1,64}$/.test(fault) ? fault + ':' : ''}` : '';
}

export const PACK_STORAGE_PREFIX = qaPrefix(typeof location === 'undefined' ? '' : location.search);
export function activePackStorageKey() { return `${PACK_STORAGE_PREFIX}${ACTIVE_PACK_KEY}`; }

function browserStorage() {
  try { return typeof window === 'undefined' || typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

export function readActivePack(storage = browserStorage(), key = activePackStorageKey()) {
  if (!storage || typeof storage.getItem !== 'function') return { pack: null, status: 'blocked', error: 'Imported pack storage is unavailable.' };
  let raw;
  try { raw = storage.getItem(key); } catch { return { pack: null, status: 'blocked', error: 'Imported pack storage is blocked.' }; }
  if (raw === null) return { pack: null, status: 'empty', error: null };
  if (typeof raw !== 'string') return { pack: null, status: 'corrupt', error: 'The imported pack is not text.', raw };
  const parsed = parsePack(raw);
  return parsed.ok ? { pack: parsed.pack, status: 'ok', error: null, raw } : { pack: null, status: 'corrupt', error: parsed.errors.join(' '), raw };
}

export function saveActivePack(storage, text, { overwrite = false, key = activePackStorageKey() } = {}) {
  const parsed = parsePack(text);
  if (!parsed.ok) return { ok: false, message: parsed.errors.join(' '), errors: parsed.errors };
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return { ok: false, message: 'Imported pack storage is unavailable.' };
  const normalized = JSON.stringify(parsed.value);
  try {
    const existing = storage.getItem(key);
    if (existing !== null && existing !== normalized && !overwrite) {
      return { ok: false, requiresOverwrite: true, message: 'A different imported pack revision is already active. Confirm overwrite before replacing it.' };
    }
    storage.setItem(key, normalized);
    return { ok: true, pack: parsed.pack, message: existing === normalized ? 'This pack revision is already active.' : 'Imported pack saved locally.' };
  } catch {
    return { ok: false, message: 'Imported pack storage could not save this pack.' };
  }
}

export function clearActivePack(storage, { key = activePackStorageKey() } = {}) {
  if (!storage || typeof storage.removeItem !== 'function') return { ok: false, message: 'Imported pack storage is unavailable.' };
  try { storage.removeItem(key); return { ok: true, message: 'Imported pack cleared.' }; } catch { return { ok: false, message: 'Imported pack storage could not clear this pack.' }; }
}

async function loadStarterPack() {
  if (typeof fetch !== 'function') return { pack: null, error: 'Starter pack could not be loaded here. Serve this folder locally and retry.' };
  try {
    const response = await fetch(STARTER_PACK_URL, { credentials: 'same-origin' });
    if (!response.ok) return { pack: null, error: `Starter pack could not be loaded (${response.status}). Serve this folder locally and retry.` };
    const parsed = parsePack(await response.text());
    return parsed.ok ? { pack: parsed.pack, error: null } : { pack: null, error: `Starter pack is invalid: ${parsed.errors.join(' ')}` };
  } catch {
    return { pack: null, error: 'Starter pack could not be loaded. Serve this folder locally and retry.' };
  }
}

const active = readActivePack();
const starter = active.pack ? { pack: null, error: null } : await loadStarterPack();
export const PACK = active.pack || starter.pack;
export const SESSIONS = (PACK?.sessions || []).map((session) => ({
  ...session,
  trackIds: (PACK?.tracks || []).filter((track) => track.sessionIds.includes(session.id)).map((track) => track.id),
}));
export const FIRST_SESSION = PACK?.firstSession || '';
export const PACK_ERROR = [starter.error, active.error].filter(Boolean).join(' ') || null;
export const ACTIVE_PACK_RAW = active.raw ?? null;

export const PACK_FINGERPRINT = PACK ? await fingerprintPack(PACK) : 'unavailable';
