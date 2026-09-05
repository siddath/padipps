/**
 * Browser-local state for the Padipps.  This module deliberately has no DOM
 * or network dependencies so the same rules can be exercised in Node.
 */

export const STORAGE_KEY = 'padipps-study-v1';
export const VERSION = 3;

const BACKUP_KEY = `${STORAGE_KEY}-backup`;
const MAX_SERIALIZED_BYTES = 2 * 1024 * 1024;
const MAX_ATTEMPTS = 1000;
const MAX_NOTES = 1000;
const MAX_NOTE_TITLE = 200;
const MAX_NOTE_REVISIONS = 20;
const MAX_TEXT = 12000;
const MAX_SHORT_TEXT = 1000;
const MAX_ELAPSED_MS = 365 * 24 * 60 * 60 * 1000;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const OUTCOMES = new Set(['missed', 'assisted', 'independent']);
const NOTE_STATUSES = new Set(['open', 'revisit', 'resolved']);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function byteLength(text) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length; // Browser fallback for older WebViews.
}

function stringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function clone(value) {
  const serialized = stringify(value);
  if (serialized === null) throw new Error('State cannot be serialized.');
  return JSON.parse(serialized);
}

function validId(value) {
  return typeof value === 'string' && SAFE_ID.test(value) && !DANGEROUS_KEYS.has(value);
}

function validDate(value) {
  if (typeof value !== 'string' || value.length > 64) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function validText(value, max = MAX_TEXT, required = false) {
  return typeof value === 'string'
    && value.length <= max
    && (!required || value.trim().length > 0);
}

function validNumber(value, min, max, integer = false) {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= min
    && value <= max
    && (!integer || Number.isInteger(value));
}

function safeJson(value, depth = 0) {
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= MAX_TEXT;
  if (typeof value === 'number') return Number.isFinite(value);
  if (depth > 8) return false;
  if (Array.isArray(value)) return value.length <= 1000 && value.every((item) => safeJson(item, depth + 1));
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length <= 1000
    && keys.every((key) => !DANGEROUS_KEYS.has(key) && key.length <= 128 && safeJson(value[key], depth + 1));
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key));
}

function validationError(errors, condition, message) {
  if (!condition) errors.push(message);
}

function validateDraft(draft, label, errors) {
  const fields = new Set([
    'sessionId', 'stage', 'recognitionTries', 'recognitionCorrect', 'traceIndex', 'decisionTries',
    'decisionCorrect', 'explanation', 'selfCheck', 'hints', 'hintShown', 'practiceStarted',
    'elapsedMs', 'timerRunningSince', 'startedAt', 'updatedAt', 'evidence',
  ]);
  validationError(errors, isPlainObject(draft), `${label} must be an object.`);
  if (!isPlainObject(draft)) return;
  validationError(errors, hasOnlyKeys(draft, fields), `${label} has unknown fields.`);
  validationError(errors, validId(draft.sessionId), `${label}.sessionId is invalid.`);
  validationError(errors, validNumber(draft.stage, 0, 4, true), `${label}.stage is invalid.`);
  validationError(errors, validNumber(draft.recognitionTries, 0, 1000, true), `${label}.recognitionTries is invalid.`);
  validationError(errors, typeof draft.recognitionCorrect === 'boolean', `${label}.recognitionCorrect is invalid.`);
  validationError(errors, validNumber(draft.traceIndex, 0, 1000, true), `${label}.traceIndex is invalid.`);
  validationError(errors, validNumber(draft.decisionTries, 0, 1000, true), `${label}.decisionTries is invalid.`);
  validationError(errors, typeof draft.decisionCorrect === 'boolean', `${label}.decisionCorrect is invalid.`);
  validationError(errors, validText(draft.explanation), `${label}.explanation is invalid.`);
  validationError(errors, Array.isArray(draft.selfCheck)
    && draft.selfCheck.length <= 1000
    && draft.selfCheck.every((item) => typeof item === 'boolean' || validText(item, MAX_SHORT_TEXT)), `${label}.selfCheck is invalid.`);
  validationError(errors, validNumber(draft.hints, 0, 1000, true), `${label}.hints is invalid.`);
  validationError(errors, typeof draft.hintShown === 'boolean', `${label}.hintShown is invalid.`);
  validationError(errors, typeof draft.practiceStarted === 'boolean', `${label}.practiceStarted is invalid.`);
  validationError(errors, validNumber(draft.elapsedMs, 0, MAX_ELAPSED_MS, true), `${label}.elapsedMs is invalid.`);
  validationError(errors, draft.timerRunningSince === null || validNumber(draft.timerRunningSince, 0, Number.MAX_SAFE_INTEGER, true), `${label}.timerRunningSince is invalid.`);
  validationError(errors, validDate(draft.startedAt), `${label}.startedAt is invalid.`);
  validationError(errors, validDate(draft.updatedAt), `${label}.updatedAt is invalid.`);
  validationError(errors, isPlainObject(draft.evidence) && safeJson(draft.evidence), `${label}.evidence is invalid.`);
}

function validateReview(review, label, errors) {
  if (review === null) return;
  validationError(errors, isPlainObject(review), `${label} must be null or an object.`);
  if (!isPlainObject(review)) return;
  validationError(errors, hasOnlyKeys(review, new Set(['reviewer', 'notes', 'reviewedAt'])), `${label} has unknown fields.`);
  validationError(errors, validText(review.reviewer, MAX_SHORT_TEXT, true), `${label}.reviewer is invalid.`);
  validationError(errors, validText(review.notes, MAX_TEXT, true), `${label}.notes is invalid.`);
  validationError(errors, validDate(review.reviewedAt), `${label}.reviewedAt is invalid.`);
}

function validateAttempt(attempt, label, errors) {
  const fields = new Set([
    'id', 'sessionId', 'home', 'capability', 'lenses', 'completedAt', 'outcome', 'evidenceKind',
    'hints', 'elapsedMs', 'explanation', 'recognitionTries', 'decisionTries', 'confidence', 'artifact',
    'testEvidence', 'lesson', 'failure', 'nextReviewDays', 'reviewOf', 'nextReviewAt', 'review',
  ]);
  validationError(errors, isPlainObject(attempt), `${label} must be an object.`);
  if (!isPlainObject(attempt)) return;
  validationError(errors, hasOnlyKeys(attempt, fields), `${label} has unknown fields.`);
  validationError(errors, validId(attempt.id), `${label}.id is invalid.`);
  validationError(errors, validId(attempt.sessionId), `${label}.sessionId is invalid.`);
  validationError(errors, validId(attempt.home), `${label}.home is invalid.`);
  validationError(errors, validText(attempt.capability, MAX_SHORT_TEXT, true), `${label}.capability is invalid.`);
  validationError(errors, Array.isArray(attempt.lenses) && attempt.lenses.length <= 20
    && attempt.lenses.every(validId), `${label}.lenses is invalid.`);
  validationError(errors, validDate(attempt.completedAt), `${label}.completedAt is invalid.`);
  validationError(errors, OUTCOMES.has(attempt.outcome), `${label}.outcome is invalid.`);
  validationError(errors, attempt.evidenceKind === 'self-reported', `${label}.evidenceKind is invalid.`);
  validationError(errors, validNumber(attempt.hints, 0, 1000, true), `${label}.hints is invalid.`);
  validationError(errors, validNumber(attempt.elapsedMs, 0, MAX_ELAPSED_MS, true), `${label}.elapsedMs is invalid.`);
  validationError(errors, validText(attempt.explanation, MAX_TEXT, true), `${label}.explanation is invalid.`);
  validationError(errors, validNumber(attempt.recognitionTries, 0, 1000, true), `${label}.recognitionTries is invalid.`);
  validationError(errors, validNumber(attempt.decisionTries, 0, 1000, true), `${label}.decisionTries is invalid.`);
  validationError(errors, validNumber(attempt.confidence, 1, 5, true), `${label}.confidence is invalid.`);
  validationError(errors, validText(attempt.artifact, MAX_TEXT, true), `${label}.artifact is invalid.`);
  validationError(errors, validText(attempt.testEvidence, MAX_TEXT, true), `${label}.testEvidence is invalid.`);
  validationError(errors, validText(attempt.lesson, MAX_TEXT, true), `${label}.lesson is invalid.`);
  validationError(errors, validText(attempt.failure, MAX_TEXT), `${label}.failure is invalid.`);
  validationError(errors, attempt.outcome !== 'missed' || validText(attempt.failure, MAX_TEXT, true), `${label}.failure is required for a missed attempt.`);
  validationError(errors, attempt.outcome !== 'independent' || attempt.hints === 0, `${label}.independent outcome cannot include hints.`);
  validationError(errors, attempt.outcome !== 'independent' || attempt.recognitionTries <= 1, `${label}.independent outcome cannot include recognition corrective feedback.`);
  validationError(errors, attempt.outcome !== 'independent' || attempt.decisionTries <= 1, `${label}.independent outcome cannot include decision corrective feedback.`);
  validationError(errors, validNumber(attempt.nextReviewDays, 0, 365, true), `${label}.nextReviewDays is invalid.`);
  validationError(errors, attempt.reviewOf === undefined || validId(attempt.reviewOf), `${label}.reviewOf is invalid.`);
  validationError(errors, validDate(attempt.nextReviewAt), `${label}.nextReviewAt is invalid.`);
  validateReview(attempt.review, `${label}.review`, errors);
}

function validateNoteSnapshot(snapshot, label, errors) {
  validationError(errors, isPlainObject(snapshot), `${label} must be an object.`);
  if (!isPlainObject(snapshot)) return;
  validationError(errors, hasOnlyKeys(snapshot, new Set(['title', 'body', 'status', 'updatedAt'])), `${label} has unknown fields.`);
  validationError(errors, validText(snapshot.title, MAX_NOTE_TITLE, true) && snapshot.title === snapshot.title.trim(), `${label}.title is invalid.`);
  validationError(errors, validText(snapshot.body, MAX_TEXT, true) && snapshot.body === snapshot.body.trim(), `${label}.body is invalid.`);
  validationError(errors, NOTE_STATUSES.has(snapshot.status), `${label}.status is invalid.`);
  validationError(errors, validDate(snapshot.updatedAt), `${label}.updatedAt is invalid.`);
}

function validateNote(note, label, errors) {
  const fields = new Set(['id', 'sessionId', 'title', 'body', 'status', 'createdAt', 'updatedAt', 'revisions']);
  validationError(errors, isPlainObject(note), `${label} must be an object.`);
  if (!isPlainObject(note)) return;
  validationError(errors, hasOnlyKeys(note, fields), `${label} has unknown fields.`);
  validationError(errors, validId(note.id), `${label}.id is invalid.`);
  validationError(errors, note.sessionId === '' || validId(note.sessionId), `${label}.sessionId is invalid.`);
  validationError(errors, validText(note.title, MAX_NOTE_TITLE, true) && note.title === note.title.trim(), `${label}.title is invalid.`);
  validationError(errors, validText(note.body, MAX_TEXT, true) && note.body === note.body.trim(), `${label}.body is invalid.`);
  validationError(errors, NOTE_STATUSES.has(note.status), `${label}.status is invalid.`);
  validationError(errors, validDate(note.createdAt), `${label}.createdAt is invalid.`);
  validationError(errors, validDate(note.updatedAt), `${label}.updatedAt is invalid.`);
  if (validDate(note.createdAt) && validDate(note.updatedAt)) {
    validationError(errors, Date.parse(note.createdAt) <= Date.parse(note.updatedAt), `${label}.createdAt cannot be after updatedAt.`);
  }
  validationError(errors, Array.isArray(note.revisions) && note.revisions.length <= MAX_NOTE_REVISIONS, `${label}.revisions must be an array of at most 20 items.`);
  if (Array.isArray(note.revisions)) {
    let priorTime = -Infinity;
    note.revisions.forEach((revision, index) => {
      validateNoteSnapshot(revision, `${label}.revisions[${index}]`, errors);
      if (isPlainObject(revision) && validDate(revision.updatedAt)) {
        const revisionTime = Date.parse(revision.updatedAt);
        validationError(errors, revisionTime >= priorTime, `${label}.revisions must be chronological.`);
        if (validDate(note.updatedAt)) validationError(errors, revisionTime <= Date.parse(note.updatedAt), `${label}.revision cannot be newer than the note.`);
        priorTime = revisionTime;
      }
    });
  }
}

function validateNoteDraft(noteDraft, label, errors) {
  if (noteDraft === null) return;
  validationError(errors, isPlainObject(noteDraft), `${label} must be null or an object.`);
  if (!isPlainObject(noteDraft)) return;
  validationError(errors, hasOnlyKeys(noteDraft, new Set(['id', 'sessionId', 'title', 'body', 'status'])), `${label} has unknown fields.`);
  validationError(errors, noteDraft.id === '' || validId(noteDraft.id), `${label}.id is invalid.`);
  validationError(errors, noteDraft.sessionId === '' || validId(noteDraft.sessionId), `${label}.sessionId is invalid.`);
  validationError(errors, validText(noteDraft.title, MAX_NOTE_TITLE), `${label}.title is invalid.`);
  validationError(errors, validText(noteDraft.body, MAX_TEXT), `${label}.body is invalid.`);
  validationError(errors, NOTE_STATUSES.has(noteDraft.status), `${label}.status is invalid.`);
}

function reviewLinkSource(attempts, index, positions) {
  const attempt = attempts[index];
  if (!isPlainObject(attempt) || !attempt.reviewOf) return null;
  const sourceIndex = positions.get(attempt.reviewOf);
  if (sourceIndex === undefined || sourceIndex >= index || sourceIndex === index) return null;
  const source = attempts[sourceIndex];
  if (!isPlainObject(source) || source.id === attempt.id || source.sessionId !== attempt.sessionId
    || !validDate(source.completedAt) || !validDate(attempt.completedAt)
    || Date.parse(source.completedAt) > Date.parse(attempt.completedAt)) return null;
  return source;
}

function mergeMissing(current, incoming) {
  const output = clone(current || {});
  for (const [key, value] of Object.entries(incoming || {})) {
    if (!(key in output)) output[key] = clone(value);
  }
  return output;
}

function normalizedNow(now) {
  if (!validDate(now)) throw new Error('A valid ISO timestamp is required.');
  return now;
}

function withNotes(state) {
  const normalized = clone(state);
  if (normalized.notes === undefined) normalized.notes = [];
  if (normalized.noteDraft === undefined) normalized.noteDraft = null;
  return normalized;
}

function makeId(prefix, state) {
  const existing = new Set(state.attempts.map((attempt) => attempt.id));
  let candidate;
  do {
    const entropy = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replaceAll('-', '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    candidate = `${prefix}_${Date.now().toString(36)}_${entropy.slice(0, 20)}`;
  } while (existing.has(candidate));
  return candidate;
}

function checklistComplete(draft, checklist) {
  if (!Array.isArray(checklist)) return false;
  if (checklist.length === 0) return true;
  const named = new Set(draft.selfCheck.filter((item) => typeof item === 'string'));
  const booleanChecks = draft.selfCheck.slice(0, checklist.length);
  return checklist.every((item, index) => named.has(item) || booleanChecks[index] === true);
}

function requireResultText(result, key, required = true) {
  if (!validText(result[key], MAX_TEXT, required)) throw new Error(`result.${key} is required and must be bounded text.`);
  return result[key].trim();
}

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([`[\]!|])/g, '\\$1')
    .trim();
}

function escapeInlineMarkdown(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/([\\`*_[\]{}()#+.!|>\-])/g, '\\$1');
}

function fencedText(value) {
  const text = String(value ?? '');
  const runs = text.match(/`+/g) || [];
  const longestRun = runs.reduce((longest, run) => Math.max(longest, run.length), 0);
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${text}\n${fence}`;
}

function dateOnly(value) {
  return validDate(value) ? value.slice(0, 10) : '';
}

function reviewFeedback(attempt) {
  if (!attempt.review) return 'No reviewer feedback recorded; self-reported evidence only.';
  return `Review feedback recorded (not independently verified): ${escapeCell(attempt.review.reviewer)} on ${dateOnly(attempt.review.reviewedAt)} — ${escapeCell(attempt.review.notes)}`;
}

export function freshState(now = new Date().toISOString()) {
  normalizedNow(now);
  return {
    version: VERSION,
    updatedAt: now,
    drafts: {},
    attempts: [],
    settings: { reviewDays: [1, 3, 7, 21] },
    legacyNotes: {},
    notes: [],
    noteDraft: null,
  };
}

export function validateState(value) {
  const errors = [];
  const serialized = stringify(value);
  validationError(errors, serialized !== null && byteLength(serialized || '') <= MAX_SERIALIZED_BYTES, 'State exceeds the 2MB limit or cannot be serialized.');
  validationError(errors, isPlainObject(value), 'State must be an object.');
  if (!isPlainObject(value)) return { ok: false, errors };
  validationError(errors, hasOnlyKeys(value, new Set(['version', 'updatedAt', 'drafts', 'attempts', 'settings', 'legacyNotes', 'notes', 'noteDraft'])), 'State has unknown fields.');
  validationError(errors, value.version === VERSION, `Unsupported state version: ${String(value.version)}.`);
  validationError(errors, validDate(value.updatedAt), 'State updatedAt is invalid.');
  validationError(errors, isPlainObject(value.drafts), 'State drafts must be an object.');
  if (isPlainObject(value.drafts)) {
    const draftEntries = Object.entries(value.drafts);
    validationError(errors, draftEntries.length <= 1000, 'Too many drafts.');
    for (const [sessionId, draft] of draftEntries) {
      validationError(errors, validId(sessionId), `Draft key ${sessionId} is invalid.`);
      validateDraft(draft, `Draft ${sessionId}`, errors);
      validationError(errors, !isPlainObject(draft) || draft.sessionId === sessionId, `Draft ${sessionId} does not match its key.`);
    }
  }
  validationError(errors, Array.isArray(value.attempts) && value.attempts.length <= MAX_ATTEMPTS, 'Attempts must be an array of at most 1000 items.');
  if (Array.isArray(value.attempts)) {
    const ids = new Set();
    value.attempts.forEach((attempt, index) => {
      validateAttempt(attempt, `Attempt ${index + 1}`, errors);
      if (isPlainObject(attempt) && validId(attempt.id)) {
        validationError(errors, !ids.has(attempt.id), `Duplicate attempt id ${attempt.id}.`);
        ids.add(attempt.id);
      }
    });
    const positions = new Map();
    value.attempts.forEach((attempt, index) => {
      if (isPlainObject(attempt) && validId(attempt.id) && !positions.has(attempt.id)) positions.set(attempt.id, index);
    });
    value.attempts.forEach((attempt, index) => {
      if (!isPlainObject(attempt) || attempt.reviewOf === undefined) return;
      const source = reviewLinkSource(value.attempts, index, positions);
      validationError(errors, source !== null, `Attempt ${index + 1}.reviewOf must reference an earlier same-session attempt.`);
      if (!source) return;
      const seen = new Set([attempt.id]);
      let cursor = source;
      while (cursor?.reviewOf) {
        if (seen.has(cursor.id)) {
          errors.push(`Attempt ${index + 1}.reviewOf creates a cycle.`);
          break;
        }
        seen.add(cursor.id);
        const cursorIndex = positions.get(cursor.id);
        if (cursorIndex === undefined) break;
        cursor = reviewLinkSource(value.attempts, cursorIndex, positions);
      }
    });
  }
  validationError(errors, isPlainObject(value.settings) && hasOnlyKeys(value.settings, new Set(['reviewDays'])), 'State settings are invalid.');
  if (isPlainObject(value.settings)) {
    validationError(errors, Array.isArray(value.settings.reviewDays)
      && value.settings.reviewDays.length > 0
      && value.settings.reviewDays.length <= 12
      && value.settings.reviewDays.every((day, index, days) => validNumber(day, 1, 365, true) && (index === 0 || days[index - 1] < day)), 'State reviewDays are invalid.');
  }
  validationError(errors, isPlainObject(value.legacyNotes) && safeJson(value.legacyNotes), 'State legacyNotes are invalid.');
  if (value.notes !== undefined) {
    validationError(errors, Array.isArray(value.notes) && value.notes.length <= MAX_NOTES, 'Notes must be an array of at most 1000 items.');
    if (Array.isArray(value.notes)) {
      const ids = new Set();
      value.notes.forEach((note, index) => {
        validateNote(note, `Note ${index + 1}`, errors);
        if (isPlainObject(note) && validId(note.id)) {
          validationError(errors, !ids.has(note.id), `Duplicate note id ${note.id}.`);
          ids.add(note.id);
        }
      });
    }
  }
  if (value.noteDraft !== undefined) validateNoteDraft(value.noteDraft, 'State noteDraft', errors);
  return { ok: errors.length === 0, errors };
}

export function loadState(storage) {
  if (!storage || typeof storage.getItem !== 'function') return {state:freshState(),status:'blocked',message:'Local storage is unavailable.'};
  let raw;
  try { raw=storage.getItem(STORAGE_KEY); } catch { return {state:freshState(),status:'blocked',message:'Local storage is blocked.'}; }
  if(raw===null)return {state:freshState(),status:'empty',message:'No saved state.'};
  if(typeof raw!=='string')return {state:freshState(),status:'corrupt',message:'Saved state is not text.',raw};
  const result=parseImport(raw);
  return result.ok ? {state:result.state,status:'ok',message:'Saved state loaded.'} : {state:freshState(),status:'corrupt',message:result.errors.join(' '),raw};
}

export function saveState(storage, state) {
  const validation = validateState(state);
  if (!validation.ok) return { ok: false, message: validation.errors.join(' ') };
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return { ok: false, message: 'Local storage is unavailable.' };
  }
  const serialized = stringify(state);
  try {
    const prior = storage.getItem(STORAGE_KEY);
    if (prior !== null && typeof prior !== 'string') {
      return { ok: false, message: 'Existing saved state is corrupt and was not replaced.' };
    }
    if (typeof prior === 'string') {
      try {
        const priorState = JSON.parse(prior);
        if (!validateState(priorState).ok) return { ok: false, message: 'Existing saved state is corrupt and was not replaced.' };
        storage.setItem(BACKUP_KEY, prior);
      } catch {
        return { ok: false, message: 'Existing saved state is corrupt and was not replaced.' };
      }
    }
    storage.setItem(STORAGE_KEY, serialized);
    return { ok: true, message: 'Saved locally.' };
  } catch {
    return { ok: false, message: 'Local storage could not save this state.' };
  }
}

export function parseImport(text) {
  if (typeof text !== 'string') return { ok: false, errors: ['Import must be text.'] };
  if (byteLength(text) > MAX_SERIALIZED_BYTES) return { ok: false, errors: ['Import exceeds the 2MB limit.'] };
  try {
    const state = JSON.parse(text);
    const validation = validateState(state);
    return validation.ok ? { ok: true, state: withNotes(state) } : { ok: false, errors: validation.errors };
  } catch {
    return { ok: false, errors: ['Import contains malformed JSON.'] };
  }
}

export function mergeStates(current, incoming) {
  const currentCheck = validateState(current);
  const incomingCheck = validateState(incoming);
  if (!currentCheck.ok) throw new Error(`Current state is invalid: ${currentCheck.errors.join(' ')}`);
  if (!incomingCheck.ok) throw new Error(`Imported state is invalid: ${incomingCheck.errors.join(' ')}`);
  const merged = withNotes(current);
  const currentIds = new Set(merged.attempts.map((attempt) => attempt.id));
  for (const attempt of incoming.attempts) {
    if (!currentIds.has(attempt.id)) {
      merged.attempts.push(clone(attempt));
      currentIds.add(attempt.id);
    }
  }
  for (const [sessionId, draft] of Object.entries(incoming.drafts)) {
    if (!(sessionId in merged.drafts)) merged.drafts[sessionId] = clone(draft);
  }
  merged.legacyNotes = mergeMissing(merged.legacyNotes, incoming.legacyNotes);
  const currentNoteIds = new Set(merged.notes.map((note) => note.id));
  for (const note of incoming.notes || []) {
    if (!currentNoteIds.has(note.id)) {
      merged.notes.push(clone(note));
      currentNoteIds.add(note.id);
    }
  }
  merged.noteDraft = isNoteDraftDirty(current)
    ? clone(current.noteDraft)
    : isNoteDraftDirty(incoming) ? clone(incoming.noteDraft) : null;
  merged.updatedAt = Date.parse(incoming.updatedAt) > Date.parse(current.updatedAt) ? incoming.updatedAt : current.updatedAt;
  const validation = validateState(merged);
  if (!validation.ok) throw new Error(`Merged state is invalid: ${validation.errors.join(' ')}`);
  return merged;
}

export function isNoteDraftDirty(state) {
  const draft = state?.noteDraft;
  if (!isPlainObject(draft)) return false;
  const saved = Array.isArray(state?.notes) ? state.notes.find((note) => note?.id === draft.id) : null;
  if (!saved) return Boolean(
    (typeof draft.title === 'string' && draft.title.trim())
    || (typeof draft.body === 'string' && draft.body.trim()),
  );
  return ['sessionId', 'title', 'body', 'status'].some((key) => draft[key] !== saved[key]);
}

export function saveNotebookNote(state, input, now = new Date().toISOString()) {
  const stateCheck = validateState(state);
  if (!stateCheck.ok) throw new Error(`State is invalid: ${stateCheck.errors.join(' ')}`);
  normalizedNow(now);
  if (!isPlainObject(input) || !hasOnlyKeys(input, new Set(['id', 'sessionId', 'title', 'body', 'status']))) {
    throw new Error('Note input is invalid.');
  }
  const title = typeof input.title === 'string' ? input.title.trim() : input.title;
  const body = typeof input.body === 'string' ? input.body.trim() : input.body;
  if (!validText(title, MAX_NOTE_TITLE, true)) throw new Error('Note title is required and must be at most 200 characters.');
  if (!validText(body, MAX_TEXT, true)) throw new Error('Note body is required and must be at most 12000 characters.');

  const nextState = withNotes(state);
  const existingIndex = input.id === undefined ? -1 : nextState.notes.findIndex((note) => note.id === input.id);
  if (input.id !== undefined && !validId(input.id)) throw new Error('Note id is invalid.');
  if (input.id !== undefined && existingIndex === -1) throw new Error('Note id does not exist.');
  const existing = existingIndex === -1 ? null : nextState.notes[existingIndex];
  const sessionId = input.sessionId === undefined ? (existing?.sessionId || '') : input.sessionId;
  const status = input.status === undefined ? (existing?.status || 'open') : input.status;
  if (!(sessionId === '' || validId(sessionId))) throw new Error('Note sessionId is invalid.');
  if (!NOTE_STATUSES.has(status)) throw new Error('Note status is invalid.');

  if (existing) {
    const changed = existing.sessionId !== sessionId || existing.title !== title || existing.body !== body || existing.status !== status;
    if (!changed) return { state: nextState, note: clone(existing) };
    if (Date.parse(now) < Date.parse(existing.updatedAt)) throw new Error('Note update timestamp cannot move backwards.');
    const revisions = [...existing.revisions, {
      title: existing.title,
      body: existing.body,
      status: existing.status,
      updatedAt: existing.updatedAt,
    }].slice(-MAX_NOTE_REVISIONS);
    const note = { ...existing, sessionId, title, body, status, updatedAt: now, revisions };
    nextState.notes[existingIndex] = note;
    nextState.updatedAt = Date.parse(now) > Date.parse(nextState.updatedAt) ? now : nextState.updatedAt;
    const validation = validateState(nextState);
    if (!validation.ok) throw new Error(validation.errors.join(' '));
    return { state: nextState, note: clone(note) };
  }

  if (nextState.notes.length >= MAX_NOTES) throw new Error('Notes are limited to 1000 items.');
  let id;
  do {
    id = makeId('note', nextState);
  } while (nextState.notes.some((note) => note.id === id));
  const note = { id, sessionId, title, body, status, createdAt: now, updatedAt: now, revisions: [] };
  nextState.notes.push(note);
  nextState.updatedAt = Date.parse(now) > Date.parse(nextState.updatedAt) ? now : nextState.updatedAt;
  const validation = validateState(nextState);
  if (!validation.ok) throw new Error(validation.errors.join(' '));
  return { state: nextState, note: clone(note) };
}

export function makeDraft(sessionId, now = new Date().toISOString()) {
  if (!validId(sessionId)) throw new Error('A safe session id is required.');
  normalizedNow(now);
  return {
    sessionId,
    stage: 0,
    recognitionTries: 0,
    recognitionCorrect: false,
    traceIndex: 0,
    decisionTries: 0,
    decisionCorrect: false,
    explanation: '',
    selfCheck: [],
    hints: 0,
    hintShown: false,
    practiceStarted: false,
    elapsedMs: 0,
    timerRunningSince: null,
    startedAt: now,
    updatedAt: now,
    evidence: {},
  };
}

export function elapsedMs(draft, nowMs = Date.now()) {
  if (!isPlainObject(draft) || !validNumber(draft.elapsedMs, 0, MAX_ELAPSED_MS, true)) return 0;
  if (draft.timerRunningSince === null) return draft.elapsedMs;
  if (!validNumber(draft.timerRunningSince, 0, Number.MAX_SAFE_INTEGER, true) || !validNumber(nowMs, 0, Number.MAX_SAFE_INTEGER)) return draft.elapsedMs;
  return Math.min(MAX_ELAPSED_MS, draft.elapsedMs + Math.max(0, Math.floor(nowMs - draft.timerRunningSince)));
}

export function pauseTimer(draft, nowMs = Date.now()) {
  const errors = [];
  validateDraft(draft, 'Draft', errors);
  if (errors.length) throw new Error(errors.join(' '));
  const paused = clone(draft);
  paused.elapsedMs = elapsedMs(paused, nowMs);
  paused.timerRunningSince = null;
  return paused;
}

export function finishAttempt(state, draft, session, result, now = new Date().toISOString()) {
  const stateCheck = validateState(state);
  if (!stateCheck.ok) throw new Error(stateCheck.errors.join(' '));
  const draftErrors = [];
  validateDraft(draft, 'Draft', draftErrors);
  if (draftErrors.length) throw new Error(draftErrors.join(' '));
  normalizedNow(now);
  if (!isPlainObject(session) || !validId(session.id) || session.id !== draft.sessionId) throw new Error('Draft and session must have the same safe id.');
  if (!validId(session.home) || !validText(session.capability, MAX_SHORT_TEXT, true)
    || !Array.isArray(session.lenses) || !session.lenses.every(validId)
    || !Array.isArray(session.trace) || !Array.isArray(session.checklist)) throw new Error('Session metadata is incomplete.');
  if (!isPlainObject(result) || !OUTCOMES.has(result.outcome)) throw new Error('A valid attempt outcome is required.');
  if (!validNumber(result.confidence, 1, 5, true)) throw new Error('Confidence must be an integer from 1 to 5.');
  if (!validNumber(result.nextReviewDays, 0, 365, true)) throw new Error('nextReviewDays must be an integer from 0 to 365.');
  if (result.outcome !== 'missed') {
    if (draft.stage < 4 || !draft.recognitionCorrect || draft.traceIndex < session.trace.length || !draft.decisionCorrect) {
      throw new Error('Complete the recognition, trace, decision, and practice stages before finishing.');
    }
    if (!draft.practiceStarted) throw new Error('Start the independent practice before finishing.');
    if (!validText(draft.explanation, MAX_TEXT, true)) throw new Error('An explanation is required before finishing.');
    if (!checklistComplete(draft, session.checklist)) throw new Error('Complete every self-check before finishing.');
  }
  if (result.outcome === 'independent' && (draft.hints > 0 || draft.hintShown || draft.recognitionTries > 1 || draft.decisionTries > 1)) {
    throw new Error('An independent self-report requires no hints or corrective feedback.');
  }
  const artifact = requireResultText(result, 'artifact');
  const testEvidence = requireResultText(result, 'testEvidence');
  const lesson = requireResultText(result, 'lesson');
  const failure = typeof result.failure === 'undefined' ? '' : requireResultText(result, 'failure', result.outcome === 'missed');
  if (result.outcome === 'missed' && !failure) throw new Error('A missed attempt requires a failure note.');
  let reviewOf;
  if (result.reviewOf !== undefined && result.reviewOf !== null && result.reviewOf !== '') {
    if (!validId(result.reviewOf)) throw new Error('reviewOf must be a safe attempt id.');
    const source = state.attempts.find((attempt) => attempt.id === result.reviewOf);
    if (!source || source.sessionId !== session.id || Date.parse(source.completedAt) > Date.parse(now)) throw new Error('reviewOf must reference an earlier attempt for this session.');
    reviewOf = result.reviewOf;
  }
  const completedAtMs = Date.parse(now);
  const attempt = {
    id: makeId('attempt', state),
    sessionId: session.id,
    home: session.home,
    capability: session.capability,
    lenses: clone(session.lenses),
    completedAt: now,
    outcome: result.outcome,
    evidenceKind: 'self-reported',
    hints: draft.hints,
    elapsedMs: elapsedMs(draft, completedAtMs),
    explanation: draft.explanation.trim() || 'Not produced; foundation attempt stopped.',
    recognitionTries: draft.recognitionTries,
    decisionTries: draft.decisionTries,
    confidence: result.confidence,
    artifact,
    testEvidence,
    lesson,
    failure,
    nextReviewDays: result.nextReviewDays,
    nextReviewAt: new Date(completedAtMs + result.nextReviewDays * 24 * 60 * 60 * 1000).toISOString(),
    review: null,
  };
  if (reviewOf) attempt.reviewOf = reviewOf;
  const nextState = clone(state);
  nextState.attempts.push(attempt);
  delete nextState.drafts[draft.sessionId];
  nextState.updatedAt = now;
  const validation = validateState(nextState);
  if (!validation.ok) throw new Error(validation.errors.join(' '));
  return { state: nextState, attempt };
}

export function dueReviews(state, now = new Date().toISOString()) {
  if (!validDate(now)) return [];
  if (!state || !Array.isArray(state.attempts)) return [];
  const positions = new Map();
  state.attempts.forEach((attempt, index) => {
    if (isPlainObject(attempt) && validId(attempt.id) && !positions.has(attempt.id)) positions.set(attempt.id, index);
  });
  const closed = new Set();
  state.attempts.forEach((attempt, index) => {
    const source = reviewLinkSource(state.attempts, index, positions);
    if (source) closed.add(source.id);
  });
  const latestBySession = new Map();
  for (const attempt of state.attempts) {
    if (!isPlainObject(attempt) || closed.has(attempt.id) || !validId(attempt.sessionId) || !validDate(attempt.completedAt)) continue;
    const existing = latestBySession.get(attempt.sessionId);
    if (!existing || Date.parse(attempt.completedAt) > Date.parse(existing.completedAt)) latestBySession.set(attempt.sessionId, attempt);
  }
  return [...latestBySession.values()]
    .filter((attempt) => validDate(attempt.nextReviewAt) && Date.parse(attempt.nextReviewAt) <= Date.parse(now))
    .sort((left, right) => Date.parse(left.nextReviewAt) - Date.parse(right.nextReviewAt));
}

export function recommend(state, sessions, now = new Date().toISOString()) {
  const safeSessions = Array.isArray(sessions) ? sessions.filter((session) => isPlainObject(session) && validId(session.id)) : [];
  const drafts = state && isPlainObject(state.drafts) ? Object.values(state.drafts).filter((draft) => isPlainObject(draft) && validId(draft.sessionId) && validDate(draft.updatedAt)) : [];
  if (drafts.length) {
    drafts.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    return { sessionId: drafts[0].sessionId, reason: 'Resume your most recent unfinished practice.', kind: 'draft' };
  }
  const due = dueReviews(state || freshState(), now);
  if (due.length) return { sessionId: due[0].sessionId, reason: 'A logged review is due.', kind: 'review', reviewOf: due[0].id };
  const attempts = state && Array.isArray(state.attempts) ? state.attempts : [];
  if (attempts.length === 0) return { sessionId: safeSessions[0]?.id || '', reason: 'Start with the first session in this pack.', kind: 'foundation' };
  const independent = new Set(attempts.filter((attempt) => attempt && attempt.outcome === 'independent').map((attempt) => attempt.sessionId));
  for (const session of safeSessions) {
    const prerequisites = Array.isArray(session.prerequisites) ? session.prerequisites : [];
    const missing = prerequisites.find((id) => !independent.has(id));
    if (missing) {
      return { sessionId: missing, reason: `Build the prerequisite for ${session.title || session.id}.`, kind: 'foundation' };
    }
  }
  const next = safeSessions.find((session) => !independent.has(session.id));
  return {
    sessionId: (next || safeSessions[0] || { id: '' }).id,
    reason: next ? 'Continue with the next unproven session.' : 'Revisit the current foundation with a fresh rep.',
    kind: next ? 'next' : 'foundation',
  };
}

export function markdownExport(state, sessions) {
  const byId=new Map((sessions || []).map(s=>[s.id,s]));
  const lines=['# Padipps practice record','','Self-reported outcomes and recorded reviewer feedback are separate. Inspect the work before sharing this export.',''];
  for(const a of state.attempts || []){
    lines.push(`## ${escapeInlineMarkdown(byId.get(a.sessionId)?.title || a.sessionId)}`,'',`- Attempt ID: ${a.id}`,`- Completed: ${a.completedAt}`,`- Outcome: ${a.outcome} (self-reported)`,`- Home: ${escapeInlineMarkdown(a.home)}`,`- Capability: ${escapeInlineMarkdown(a.capability)}`,`- Lenses: ${a.lenses.map(escapeInlineMarkdown).join(', ')}`,`- Time: ${a.elapsedMs} ms`,`- Confidence: ${a.confidence}/5 (self-report)`,`- Hints: ${a.hints}; recognition/decision tries: ${a.recognitionTries}/${a.decisionTries}`,`- Next review: ${a.nextReviewAt}`,`- Review of: ${a.reviewOf || 'None'}`,'');
    for(const [title,key] of [['Artifact','artifact'],['Explanation','explanation'],['Tests','testEvidence'],['Failure or limit','failure'],['Lesson','lesson']])lines.push(`### ${title}`,'',fencedText(a[key]),'');
    if(a.review)lines.push('### Recorded reviewer feedback','',`Reviewer: ${escapeInlineMarkdown(a.review.reviewer)}`,`Recorded: ${a.review.reviewedAt}`,'',fencedText(a.review.notes),'');
  }
  if(!(state.attempts || []).length)lines.push('No practice attempts recorded.');
  return lines.join('\n');
}

export function notebookMarkdown(state, sessions) {
  const validation = validateState(state);
  if (!validation.ok) throw new Error(`State is invalid: ${validation.errors.join(' ')}`);
  const notes = state.notes || [];
  const sessionById = new Map((Array.isArray(sessions) ? sessions : []).filter(isPlainObject).map((session) => [session.id, session]));
  const lines = [
    '# Padipps notebook',
    '',
    'Browser-local notes and self-reported attempt history. This export does not create mastery or write to an external log.',
    '',
  ];
  if (isNoteDraftDirty(state)) {
    const draftSession = sessionById.get(state.noteDraft.sessionId);
    const draftSessionLabel = state.noteDraft.sessionId ? (draftSession?.title || state.noteDraft.sessionId) : 'Unassigned';
    lines.push(
      '## Unfiled draft (not saved)',
      '',
      'This compose buffer has not created or revised a notebook note.',
      '',
      `- Target note ID: ${state.noteDraft.id ? `\`${state.noteDraft.id}\`` : 'New note'}`,
      `- Session: ${escapeInlineMarkdown(draftSessionLabel)}`,
      `- Status: ${escapeInlineMarkdown(state.noteDraft.status)}`,
      `- Title: ${escapeInlineMarkdown(state.noteDraft.title || 'Untitled')}`,
      '',
      fencedText(state.noteDraft.body),
      '',
    );
  }
  lines.push('## Notes', '');
  if (!notes.length) lines.push('No notebook notes recorded.', '');
  notes.forEach((note) => {
    const session = sessionById.get(note.sessionId);
    const sessionLabel = note.sessionId ? (session?.title || note.sessionId) : 'Unassigned';
    lines.push(
      `### ${escapeInlineMarkdown(note.title)}`,
      '',
      `- Note ID: \`${note.id}\``,
      `- Session: ${escapeInlineMarkdown(sessionLabel)}`,
      `- Status: ${escapeInlineMarkdown(note.status)}`,
      `- Created: ${note.createdAt}`,
      `- Updated: ${note.updatedAt}`,
      '',
      fencedText(note.body),
      '',
    );
    if (note.revisions.length) {
      lines.push('#### Revision history', '');
      note.revisions.forEach((revision, index) => {
        lines.push(
          `##### Revision ${index + 1}`,
          '',
          `- Title: ${escapeInlineMarkdown(revision.title)}`,
          `- Status: ${escapeInlineMarkdown(revision.status)}`,
          `- Updated: ${revision.updatedAt}`,
          '',
          fencedText(revision.body),
          '',
        );
      });
    }
  });
  const attempts = markdownExport(state, sessions)
    .split('\n')
    .map((line) => line.startsWith('#') ? `##${line}` : line)
    .join('\n');
  lines.push('## Attempts and review history', '', attempts);
  return lines.join('\n');
}
