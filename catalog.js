import { sessionsForTrack } from './pack-engine.js';

export function catalogForPack(pack) {
  const all = { id: 'all', title: 'All lessons', description: 'Every lesson in this pack.', sessionIds: (pack?.sessions || []).map((session) => session.id), sessions: pack?.sessions || [] };
  return [all, ...(pack?.tracks || []).map((track) => ({ ...track, sessions: sessionsForTrack(pack, track.id) }))];
}

export function firstTrack(pack) {
  return pack?.tracks?.[0] || null;
}

function safeTrack(value) { return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value) ? value : 'all'; }
export function practiceSessions(sessions, trackId = 'all', query = '') {
  const selected = safeTrack(trackId); const needle = typeof query === 'string' ? query.trim().toLocaleLowerCase() : '';
  return (Array.isArray(sessions) ? sessions : []).filter((session) => {
    if (!session || typeof session !== 'object') return false;
    if (selected !== 'all' && !(Array.isArray(session.trackIds) && session.trackIds.includes(selected))) return false;
    if (!needle) return true;
    return [session.title, session.category, session.capability, session.home, ...(session.lenses || [])]
      .some((value) => String(value || '').toLocaleLowerCase().includes(needle));
  });
}
export function readPracticeRoute(hash = '') {
  const raw = String(hash || '').replace(/^#/, '');
  const [path = '', search = ''] = raw.split('?', 2); const bits = path.split('/').filter(Boolean);
  if (bits[0] !== 'practice') return { route: bits[0] || 'today', track: 'all', query: '' };
  const params = new URLSearchParams(search); const requested = bits[1] || params.get('track') || 'all';
  return { route: 'practice', track: safeTrack(requested), query: (params.get('q') || params.get('query') || '').slice(0, 200) };
}
export function practiceHash(track = 'all', query = '') {
  const safe = safeTrack(track); const params = new URLSearchParams();
  if (typeof query === 'string' && query.trim()) params.set('q', query.trim().slice(0, 200));
  return `#practice/${encodeURIComponent(safe)}${params.size ? `?${params}` : ''}`;
}
