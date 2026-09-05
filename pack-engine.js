// Offline pack validation. Packs are data only: no scripts, evaluation, or fetching.
export const PACK_VERSION = 1;
export const MAX_PACK_BYTES = 2 * 1024 * 1024;

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_TEXT = 12000;

function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) return false; const prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null; }
function bytes(value) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(value).length : unescape(encodeURIComponent(value)).length; }
function id(value) { return typeof value === 'string' && SAFE_ID.test(value) && !DANGEROUS_KEYS.has(value); }
function text(value, max = MAX_TEXT, required = false) { return typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0); }
function integer(value, min, max) { return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max; }
function only(value, keys) { return Object.keys(value).every((key) => keys.has(key)); }
function issue(errors, condition, message) { if (!condition) errors.push(message); }
function sourceUrl(value) { try { const url = new URL(value); return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password; } catch { return false; } }
function lessonIds(values, max = 20) { return Array.isArray(values) && values.length <= max && values.every(id); }

function validateDecision(value, label, errors) {
  issue(errors, object(value), `${label} must be an object.`); if (!object(value)) return;
  issue(errors, only(value, new Set(['prompt', 'options', 'answer', 'feedback'])), `${label} has unknown fields.`);
  issue(errors, text(value.prompt, 4000, true) && Array.isArray(value.options) && value.options.length >= 2 && value.options.length <= 8 && value.options.every((option) => text(option, 1000, true)) && integer(value.answer, 0, value.options?.length - 1) && text(value.feedback, 4000, true), `${label} is invalid.`);
}
function validateLesson(value, index, errors) {
  const label = `Session ${index + 1}`;
  const fields = new Set(['id', 'title', 'category', 'lenses', 'home', 'capability', 'estimatedMinutes', 'prompt', 'options', 'answer', 'feedback', 'model', 'example', 'trigger', 'nonTrigger', 'invariant', 'trace', 'decision', 'explainPrompt', 'checklist', 'rubric', 'sources', 'reviewPrompt', 'prerequisites', 'task']);
  issue(errors, object(value), `${label} must be an object.`); if (!object(value)) return;
  issue(errors, only(value, fields), `${label} has unknown fields.`);
  issue(errors, id(value.id) && text(value.title, 200, true) && text(value.category, 100, true) && lessonIds(value.lenses) && value.lenses.length > 0 && id(value.home) && text(value.capability, 500, true) && integer(value.estimatedMinutes, 1, 240), `${label} identity fields are invalid.`);
  issue(errors, text(value.prompt, 4000, true) && Array.isArray(value.options) && value.options.length >= 2 && value.options.length <= 8 && value.options.every((option) => text(option, 1000, true)) && integer(value.answer, 0, value.options?.length - 1) && text(value.feedback, 4000, true), `${label} recognition gate is invalid.`);
  issue(errors, text(value.model, MAX_TEXT, true) && text(value.example, 4000, true) && text(value.trigger, 2000, true) && text(value.nonTrigger, 2000, true) && text(value.invariant, 4000, true) && text(value.explainPrompt, 4000, true) && text(value.reviewPrompt, 4000, true) && text(value.task, 4000, true), `${label} explanation/task fields are invalid.`);
  issue(errors, Array.isArray(value.trace) && value.trace.length >= 1 && value.trace.length <= 10 && value.trace.every((step) => object(step) && only(step, new Set(['code', 'note'])) && text(step.code, 4000, true) && text(step.note, 4000, true)), `${label}.trace is invalid.`);
  validateDecision(value.decision, `${label}.decision`, errors);
  issue(errors, Array.isArray(value.checklist) && value.checklist.length >= 1 && value.checklist.length <= 12 && value.checklist.every((entry) => text(entry, 1000, true)), `${label}.checklist is invalid.`);
  issue(errors, Array.isArray(value.rubric) && value.rubric.length >= 1 && value.rubric.length <= 12 && value.rubric.every((entry) => text(entry, 1000, true)), `${label}.rubric is invalid.`);
  issue(errors, Array.isArray(value.sources) && value.sources.length >= 1 && value.sources.length <= 12 && value.sources.every((source) => object(source) && only(source, new Set(['label', 'url'])) && text(source.label, 300, true) && text(source.url, 2000, true) && sourceUrl(source.url)), `${label}.sources are invalid.`);
  issue(errors, lessonIds(value.prerequisites), `${label}.prerequisites are invalid.`);
}

export function validatePack(value) {
  const errors = [];
  issue(errors, object(value), 'Pack document must be a plain object.'); if (!object(value)) return { ok: false, errors };
  issue(errors, only(value, new Set(['version', 'pack'])), 'Pack document has unknown fields.');
  issue(errors, value.version === PACK_VERSION, `Unsupported pack version: ${String(value.version)}.`);
  const pack = value.pack;
  issue(errors, object(pack), 'pack must be an object.'); if (!object(pack)) return { ok: false, errors };
  issue(errors, only(pack, new Set(['id', 'title', 'description', 'firstSession', 'tracks', 'sessions'])), 'pack has unknown fields.');
  issue(errors, id(pack.id) && text(pack.title, 200, true) && text(pack.description, 2000, true) && id(pack.firstSession), 'pack identity fields are invalid.');
  issue(errors, Array.isArray(pack.sessions) && pack.sessions.length >= 1 && pack.sessions.length <= 100, 'pack.sessions must contain 1–100 lessons.');
  if (Array.isArray(pack.sessions)) pack.sessions.forEach((session, index) => validateLesson(session, index, errors));
  const sessionIds = new Set();
  if (Array.isArray(pack.sessions)) pack.sessions.forEach((session) => { if (object(session) && id(session.id)) { issue(errors, !sessionIds.has(session.id), `Duplicate session id ${session.id}.`); sessionIds.add(session.id); } });
  issue(errors, sessionIds.has(pack.firstSession), 'pack.firstSession must name an included lesson.');
  if (Array.isArray(pack.sessions)) pack.sessions.forEach((session, index) => { if (object(session) && Array.isArray(session.prerequisites)) session.prerequisites.forEach((prerequisite) => issue(errors, sessionIds.has(prerequisite) && prerequisite !== session.id, `Session ${index + 1} has an unknown or self prerequisite.`)); });
  const sessionById = new Map((Array.isArray(pack.sessions) ? pack.sessions : []).filter(object).map((session) => [session.id, session]));
  const visiting = new Set(); const visited = new Set();
  function visit(sessionId) {
    if (visited.has(sessionId)) return false;
    if (visiting.has(sessionId)) return true;
    visiting.add(sessionId);
    const cycle = (sessionById.get(sessionId)?.prerequisites || []).some(visit);
    visiting.delete(sessionId); visited.add(sessionId); return cycle;
  }
  sessionIds.forEach((sessionId) => issue(errors, !visit(sessionId), `Session prerequisites contain a cycle involving ${sessionId}.`));
  issue(errors, Array.isArray(pack.tracks) && pack.tracks.length >= 1 && pack.tracks.length <= 20, 'pack.tracks must contain 1–20 tracks.');
  const trackIds = new Set(); const trackedSessions = new Set();
  if (Array.isArray(pack.tracks)) pack.tracks.forEach((track, index) => {
    const label = `Track ${index + 1}`; issue(errors, object(track), `${label} must be an object.`); if (!object(track)) return;
    issue(errors, only(track, new Set(['id', 'title', 'description', 'sessionIds'])), `${label} has unknown fields.`);
    issue(errors, id(track.id) && track.id !== 'all' && !trackIds.has(track.id) && text(track.title, 200, true) && text(track.description, 2000, true) && Array.isArray(track.sessionIds) && track.sessionIds.length >= 1 && track.sessionIds.length <= 100 && track.sessionIds.every((sessionId) => sessionIds.has(sessionId)) && new Set(track.sessionIds).size === track.sessionIds.length, `${label} is invalid.`);
    if (id(track.id)) trackIds.add(track.id); if (Array.isArray(track.sessionIds)) track.sessionIds.forEach((sessionId) => trackedSessions.add(sessionId));
  });
  sessionIds.forEach((sessionId) => issue(errors, trackedSessions.has(sessionId), `Session ${sessionId} is not assigned to a track.`));
  const serialized = JSON.stringify(value); issue(errors, bytes(serialized) <= MAX_PACK_BYTES, 'Pack exceeds the 2MB limit.');
  return { ok: errors.length === 0, errors };
}

export function parsePack(textValue) {
  if (typeof textValue !== 'string') return { ok: false, errors: ['Pack import must be text.'] };
  if (bytes(textValue) > MAX_PACK_BYTES) return { ok: false, errors: ['Pack import exceeds the 2MB limit.'] };
  try { const value = JSON.parse(textValue); const validation = validatePack(value); return validation.ok ? { ok: true, pack: value.pack, value } : { ok: false, errors: validation.errors }; } catch { return { ok: false, errors: ['Pack import contains malformed JSON.'] }; }
}

export function sessionsForTrack(pack, trackId) {
  if (!pack || !id(trackId)) return []; const track = pack.tracks?.find((candidate) => candidate.id === trackId); if (!track) return []; const byId = new Map((pack.sessions || []).map((session) => [session.id, session])); return track.sessionIds.map((sessionId) => byId.get(sessionId)).filter(Boolean);
}
export function findTrack(pack, trackId) { return pack?.tracks?.find((track) => track.id === trackId) || null; }
