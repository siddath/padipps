/** Pure, browser-local focus timer state. No DOM, storage, or practice-log writes. */

export const FOCUS_STORAGE_KEY = 'padipps-focus-v1';
export const FOCUS_VERSION = 1;

const MAX_SERIALIZED_BYTES = 2 * 1024 * 1024;
const MAX_RECEIPTS = 1000;
const MAX_INTENTION_CODE_POINTS = 200;
const QA_DURATION_MS = 5000;
const MINUTE_MS = 60 * 1000;
const MAX_TIMESTAMP_MS = 8_640_000_000_000_000;
const KINDS = new Set(['focus', 'short', 'long']);
const STATUSES = new Set(['idle', 'running', 'paused', 'completed']);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key) && !DANGEROUS_KEYS.has(key));
}

function serialize(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function clone(value) {
  const text = serialize(value);
  if (text === null) throw new Error('Focus state cannot be serialized.');
  return JSON.parse(text);
}

function byteLength(text) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

function validInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function validTimestamp(value) {
  return validInteger(value, 0, MAX_TIMESTAMP_MS);
}

function validId(value) {
  return typeof value === 'string' && SAFE_ID.test(value) && !DANGEROUS_KEYS.has(value);
}

function validSessionId(value) {
  return value === '' || validId(value);
}

function validIntention(value) {
  return typeof value === 'string'
    && value === value.trim()
    && value.length > 0
    && Array.from(value).length <= MAX_INTENTION_CODE_POINTS;
}

function validDuration(kind, durationMs, qa) {
  if (!KINDS.has(kind) || !validInteger(durationMs, 1)) return false;
  if (qa) return durationMs === QA_DURATION_MS;
  const maxMinutes = kind === 'focus' ? 120 : 60;
  return durationMs % MINUTE_MS === 0
    && durationMs >= MINUTE_MS
    && durationMs <= maxMinutes * MINUTE_MS;
}

function validateSettings(settings, errors, label = 'settings') {
  const fields = new Set(['focusMinutes', 'shortMinutes', 'longMinutes', 'longEvery']);
  if (!isPlainObject(settings)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (!hasOnlyKeys(settings, fields)) errors.push(`${label} has unknown fields.`);
  if (!validInteger(settings.focusMinutes, 1, 120)) errors.push(`${label}.focusMinutes must be an integer from 1 to 120.`);
  if (!validInteger(settings.shortMinutes, 1, 60)) errors.push(`${label}.shortMinutes must be an integer from 1 to 60.`);
  if (!validInteger(settings.longMinutes, 1, 60)) errors.push(`${label}.longMinutes must be an integer from 1 to 60.`);
  if (!validInteger(settings.longEvery, 2, 8)) errors.push(`${label}.longEvery must be an integer from 2 to 8.`);
}

function validatePeriod(period, status, errors) {
  const fields = new Set([
    'id', 'kind', 'intention', 'sessionId', 'durationMs', 'startedAtMs',
    'deadlineMs', 'remainingMs', 'qa', 'reflectionId',
  ]);
  if (!isPlainObject(period)) {
    errors.push('active must be an object while the timer is running or paused.');
    return;
  }
  if (!hasOnlyKeys(period, fields)) errors.push('active has unknown fields.');
  if (!validId(period.id)) errors.push('active.id is invalid.');
  if (!KINDS.has(period.kind)) errors.push('active.kind is invalid.');
  if (!validIntention(period.intention)) errors.push('active.intention is invalid.');
  if (!validSessionId(period.sessionId)) errors.push('active.sessionId is invalid.');
  if (period.reflectionId !== undefined && !validSessionId(period.reflectionId)) errors.push('active.reflectionId is invalid.');
  if (typeof period.qa !== 'boolean' || !validDuration(period.kind, period.durationMs, period.qa)) errors.push('active.durationMs or qa marker is invalid.');
  if (!validTimestamp(period.startedAtMs)) errors.push('active.startedAtMs is invalid.');
  if (status === 'running') {
    if (!validTimestamp(period.deadlineMs)
      || !validTimestamp(period.startedAtMs)
      || !validInteger(period.durationMs, 1)
      || period.deadlineMs - period.startedAtMs < period.durationMs) {
      errors.push('active.deadlineMs is earlier than the timer duration or outside the supported Date range.');
    }
    if (period.remainingMs !== null) errors.push('A running timer must have null remainingMs.');
  } else {
    if (period.deadlineMs !== null) errors.push('A paused timer must have null deadlineMs.');
    if (!validInteger(period.remainingMs, 1) || period.remainingMs > period.durationMs) errors.push('active.remainingMs is invalid.');
  }
}

function validateReceipt(receipt, index, errors) {
  const label = `receipts[${index}]`;
  const fields = new Set([
    'id', 'kind', 'intention', 'sessionId', 'durationMs', 'startedAtMs',
    'completedAtMs', 'evidenceKind', 'qa', 'reflectionId',
  ]);
  if (!isPlainObject(receipt)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (!hasOnlyKeys(receipt, fields)) errors.push(`${label} has unknown fields.`);
  if (!validId(receipt.id)) errors.push(`${label}.id is invalid.`);
  if (!KINDS.has(receipt.kind)) errors.push(`${label}.kind is invalid.`);
  if (!validIntention(receipt.intention)) errors.push(`${label}.intention is invalid.`);
  if (!validSessionId(receipt.sessionId)) errors.push(`${label}.sessionId is invalid.`);
  if (receipt.reflectionId !== undefined && !validSessionId(receipt.reflectionId)) errors.push(`${label}.reflectionId is invalid.`);
  if (typeof receipt.qa !== 'boolean' || !validDuration(receipt.kind, receipt.durationMs, receipt.qa)) errors.push(`${label}.durationMs or qa marker is invalid.`);
  if (!validTimestamp(receipt.startedAtMs)) errors.push(`${label}.startedAtMs is invalid.`);
  if (!validTimestamp(receipt.completedAtMs)) errors.push(`${label}.completedAtMs is invalid.`);
  if (validTimestamp(receipt.startedAtMs) && validTimestamp(receipt.completedAtMs)
    && validInteger(receipt.durationMs, 1)
    && receipt.completedAtMs - receipt.startedAtMs < receipt.durationMs) {
    errors.push(`${label} completed before its timer elapsed.`);
  }
  if (receipt.evidenceKind !== 'elapsed-timer') errors.push(`${label}.evidenceKind is invalid.`);
}

function retainedCadence(receipts) {
  let latestLongIndex = -1;
  for (let index = 0; index < receipts.length; index += 1) {
    if (isPlainObject(receipts[index]) && receipts[index].kind === 'long') latestLongIndex = index;
  }
  let focusCount = 0;
  for (let index = latestLongIndex + 1; index < receipts.length; index += 1) {
    if (isPlainObject(receipts[index]) && receipts[index].kind === 'focus') focusCount += 1;
  }
  return { focusCount, hasRetainedLong: latestLongIndex >= 0 };
}

export function freshFocus(nowMs = Date.now()) {
  if (!validTimestamp(nowMs)) throw new Error('nowMs must be an integer within the supported JavaScript Date range.');
  return {
    version: FOCUS_VERSION,
    status: 'idle',
    updatedAtMs: nowMs,
    active: null,
    settings: { focusMinutes: 25, shortMinutes: 5, longMinutes: 15, longEvery: 4 },
    receipts: [],
    discardedReceipts: 0,
    focusBlocksSinceLong: 0,
    nextSequence: 1,
  };
}

export function validateFocus(value) {
  const errors = [];
  const serialized = serialize(value);
  if (serialized === null || byteLength(serialized || '') > MAX_SERIALIZED_BYTES) {
    errors.push('Focus state exceeds the 2MB limit or cannot be serialized.');
  }
  if (!isPlainObject(value)) return { ok: false, errors: [...errors, 'Focus state must be an object.'] };
  const fields = new Set([
    'version', 'status', 'updatedAtMs', 'active', 'settings', 'receipts',
    'discardedReceipts', 'focusBlocksSinceLong', 'nextSequence',
  ]);
  if (!hasOnlyKeys(value, fields)) errors.push('Focus state has unknown fields.');
  if (value.version !== FOCUS_VERSION) errors.push(`Unsupported focus state version: ${String(value.version)}.`);
  if (!STATUSES.has(value.status)) errors.push('Focus state status is invalid.');
  if (!validTimestamp(value.updatedAtMs)) errors.push('Focus state updatedAtMs is invalid.');
  validateSettings(value.settings, errors);
  if (!Array.isArray(value.receipts) || value.receipts.length > MAX_RECEIPTS) {
    errors.push('receipts must be an array of at most 1000 items.');
  }
  const ids = new Set();
  let priorCompletedAt = -1;
  if (Array.isArray(value.receipts)) {
    value.receipts.forEach((receipt, index) => {
      validateReceipt(receipt, index, errors);
      if (isPlainObject(receipt) && validId(receipt.id)) {
        if (ids.has(receipt.id)) errors.push(`Duplicate receipt id ${receipt.id}.`);
        ids.add(receipt.id);
      }
      if (isPlainObject(receipt) && validTimestamp(receipt.completedAtMs)) {
        if (receipt.completedAtMs < priorCompletedAt) errors.push('receipts must be chronological.');
        if (validTimestamp(value.updatedAtMs) && receipt.completedAtMs > value.updatedAtMs) errors.push(`receipts[${index}] is newer than the state.`);
        priorCompletedAt = receipt.completedAtMs;
      }
    });
  }
  if (!validInteger(value.discardedReceipts)) errors.push('discardedReceipts is invalid.');
  if (!validInteger(value.focusBlocksSinceLong)) errors.push('focusBlocksSinceLong is invalid.');
  if (validInteger(value.focusBlocksSinceLong) && validInteger(value.discardedReceipts) && Array.isArray(value.receipts)) {
    const cadence = retainedCadence(value.receipts);
    if (value.discardedReceipts === 0 || cadence.hasRetainedLong) {
      if (value.focusBlocksSinceLong !== cadence.focusCount) {
        errors.push('focusBlocksSinceLong does not match completed focus periods since the latest long break.');
      }
    } else if (value.focusBlocksSinceLong < cadence.focusCount
      || value.focusBlocksSinceLong > cadence.focusCount + value.discardedReceipts) {
      errors.push('focusBlocksSinceLong is inconsistent with the retained and discarded timer history.');
    }
  }
  if (!validInteger(value.nextSequence, 1)) errors.push('nextSequence is invalid.');
  if (value.status === 'running' || value.status === 'paused') {
    validatePeriod(value.active, value.status, errors);
    if (isPlainObject(value.active) && validId(value.active.id) && ids.has(value.active.id)) errors.push('active.id duplicates a completed receipt.');
    if (isPlainObject(value.active) && validTimestamp(value.active.startedAtMs) && validTimestamp(value.updatedAtMs)
      && value.active.startedAtMs > value.updatedAtMs) errors.push('active.startedAtMs is newer than the state.');
  } else if (value.active !== null) {
    errors.push('active must be null while the timer is idle or completed.');
  }
  if (value.status === 'completed' && (!Array.isArray(value.receipts) || value.receipts.length === 0)) {
    errors.push('A completed state requires a receipt.');
  }
  return { ok: errors.length === 0, errors };
}

export function parseFocus(text) {
  if (typeof text !== 'string') throw new Error('Focus import must be text.');
  if (byteLength(text) > MAX_SERIALIZED_BYTES) throw new Error('Focus import exceeds the 2MB limit.');
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Focus import contains malformed JSON.');
  }
  const validation = validateFocus(value);
  if (!validation.ok) throw new Error(`Invalid focus import: ${validation.errors.join(' ')}`);
  return clone(value);
}

function checkedState(state) {
  const validation = validateFocus(state);
  if (!validation.ok) throw new Error(`Invalid focus state: ${validation.errors.join(' ')}`);
  return clone(state);
}

function checkedNow(state, nowMs) {
  if (!validTimestamp(nowMs)) throw new Error('nowMs must be an integer within the supported JavaScript Date range.');
  if (nowMs < state.updatedAtMs) {
    throw new Error('nowMs is older than the saved focus state. Check the device clock or import a corrected focus backup.');
  }
  return nowMs;
}

function defaultDuration(settings, kind) {
  const minutes = kind === 'focus'
    ? settings.focusMinutes
    : kind === 'short' ? settings.shortMinutes : settings.longMinutes;
  return minutes * MINUTE_MS;
}

function nextPeriodId(state, nowMs) {
  const used = new Set(state.receipts.map((receipt) => receipt.id));
  if (state.active) used.add(state.active.id);
  let sequence = state.nextSequence;
  let id;
  do {
    if (!validInteger(sequence, 1)) throw new Error('Focus sequence is exhausted.');
    id = `period_${nowMs.toString(36)}_${sequence.toString(36)}`;
    sequence += 1;
  } while (used.has(id));
  return { id, nextSequence: sequence };
}

export function startFocus(state, input, nowMs = Date.now()) {
  const next = checkedState(state);
  checkedNow(next, nowMs);
  if (next.status === 'running' || next.status === 'paused') throw new Error('Reset or complete the active period before starting another.');
  const fields = new Set(['kind', 'intention', 'sessionId', 'durationMs', 'qa', 'reflectionId']);
  if (!isPlainObject(input) || !hasOnlyKeys(input, fields) || !KINDS.has(input.kind)) throw new Error('A valid focus period kind is required.');
  const rawIntention = input.intention === undefined && input.kind !== 'focus' ? 'Take a break' : input.intention;
  const intention = typeof rawIntention === 'string' ? rawIntention.trim() : rawIntention;
  if (!validIntention(intention)) throw new Error('Intention is required and must be at most 200 Unicode characters.');
  const sessionId = input.sessionId === undefined ? '' : input.sessionId;
  if (!validSessionId(sessionId)) throw new Error('sessionId must be empty or a safe id.');
  const reflectionId = input.reflectionId ?? '';
  if (!validSessionId(reflectionId)) throw new Error('reflectionId must be empty or a safe id.');
  const hasOverride = input.durationMs !== undefined;
  const qa = input.qa === true;
  if (input.qa !== undefined && typeof input.qa !== 'boolean') throw new Error('qa must be a boolean.');
  if (qa !== hasOverride || (hasOverride && input.durationMs !== QA_DURATION_MS)) {
    throw new Error('Only an explicit qa period may override durationMs to 5000.');
  }
  const durationMs = hasOverride ? input.durationMs : defaultDuration(next.settings, input.kind);
  if (!validDuration(input.kind, durationMs, qa)) throw new Error('Focus duration is invalid.');
  if (nowMs > MAX_TIMESTAMP_MS - durationMs) throw new Error('Focus deadline exceeds the supported JavaScript Date range.');
  const identity = nextPeriodId(next, nowMs);
  next.status = 'running';
  next.updatedAtMs = nowMs;
  next.nextSequence = identity.nextSequence;
  next.active = {
    id: identity.id,
    kind: input.kind,
    intention,
    sessionId,
    reflectionId: input.kind === 'focus' ? reflectionId : '',
    durationMs,
    startedAtMs: nowMs,
    deadlineMs: nowMs + durationMs,
    remainingMs: null,
    qa,
  };
  return next;
}

export function settleFocus(state, nowMs = Date.now()) {
  const next = checkedState(state);
  checkedNow(next, nowMs);
  if (next.status !== 'running' || nowMs < next.active.deadlineMs) return next;
  const active = next.active;
  const receipt = {
    id: active.id,
    kind: active.kind,
    intention: active.intention,
    sessionId: active.sessionId,
    ...(active.reflectionId !== undefined ? { reflectionId: active.reflectionId } : {}),
    durationMs: active.durationMs,
    startedAtMs: active.startedAtMs,
    completedAtMs: active.deadlineMs,
    evidenceKind: 'elapsed-timer',
    qa: active.qa,
  };
  next.receipts.push(receipt);
  if (next.receipts.length > MAX_RECEIPTS) {
    const excess = next.receipts.length - MAX_RECEIPTS;
    next.receipts.splice(0, excess);
    next.discardedReceipts += excess;
  }
  if (active.kind === 'focus') next.focusBlocksSinceLong += 1;
  if (active.kind === 'long') next.focusBlocksSinceLong = 0;
  next.status = 'completed';
  next.active = null;
  next.updatedAtMs = nowMs;
  return next;
}

export function pauseFocus(state, nowMs = Date.now()) {
  const next = checkedState(state);
  checkedNow(next, nowMs);
  if (next.status !== 'running') throw new Error('Only a running focus period can be paused.');
  if (nowMs >= next.active.deadlineMs) return settleFocus(next, nowMs);
  next.active.remainingMs = next.active.deadlineMs - nowMs;
  next.active.deadlineMs = null;
  next.status = 'paused';
  next.updatedAtMs = nowMs;
  return next;
}

export function resumeFocus(state, nowMs = Date.now()) {
  const next = checkedState(state);
  checkedNow(next, nowMs);
  if (next.status !== 'paused') throw new Error('Only a paused focus period can be resumed.');
  if (nowMs > MAX_TIMESTAMP_MS - next.active.remainingMs) throw new Error('Focus deadline exceeds the supported JavaScript Date range.');
  next.active.deadlineMs = nowMs + next.active.remainingMs;
  next.active.remainingMs = null;
  next.status = 'running';
  next.updatedAtMs = nowMs;
  return next;
}

export function resetFocus(state, nowMs = Date.now()) {
  const next = checkedState(state);
  checkedNow(next, nowMs);
  if (next.status === 'running' && nowMs >= next.active.deadlineMs) return settleFocus(next, nowMs);
  next.status = 'idle';
  next.active = null;
  next.updatedAtMs = nowMs;
  return next;
}

export function configureFocus(state, settings, nowMs = Date.now()) {
  const next = checkedState(state);
  checkedNow(next, nowMs);
  const errors = [];
  validateSettings(settings, errors, 'Focus settings');
  if (errors.length) throw new Error(errors.join(' '));
  next.settings = clone(settings);
  next.updatedAtMs = nowMs;
  return next;
}

function nextKind(state) {
  if (state.active) {
    if (state.active.kind !== 'focus') return 'focus';
    return state.focusBlocksSinceLong + 1 >= state.settings.longEvery ? 'long' : 'short';
  }
  const latest = state.receipts.at(-1);
  if (!latest || latest.kind !== 'focus') return 'focus';
  return state.focusBlocksSinceLong >= state.settings.longEvery ? 'long' : 'short';
}

export function focusView(state, nowMs = Date.now()) {
  const current = checkedState(state);
  if (!validTimestamp(nowMs)) throw new Error('nowMs must be an integer within the supported JavaScript Date range.');
  const clockSkew = nowMs < current.updatedAtMs;
  const viewNowMs = Math.max(nowMs, current.updatedAtMs);
  const active = current.active;
  const latestReceipt = current.receipts.at(-1) || null;
  const displayedPeriod = active || (current.status === 'completed' ? latestReceipt : null);
  let remainingMs = 0;
  if (current.status === 'running') {
    remainingMs = Math.min(active.durationMs, Math.max(0, active.deadlineMs - viewNowMs));
  }
  if (current.status === 'paused') remainingMs = active.remainingMs;
  const durationMs = displayedPeriod?.durationMs ?? null;
  const elapsedMs = durationMs === null ? 0 : durationMs - remainingMs;
  const totals = current.receipts.reduce((result, receipt) => {
    result.periods += 1;
    result.elapsedTimerMs += receipt.durationMs;
    if (receipt.kind === 'focus') result.focusBlocks += 1;
    if (receipt.kind === 'short') result.shortBreaks += 1;
    if (receipt.kind === 'long') result.longBreaks += 1;
    return result;
  }, { periods: 0, focusBlocks: 0, shortBreaks: 0, longBreaks: 0, elapsedTimerMs: 0 });
  return {
    status: current.status,
    clockSkew,
    kind: displayedPeriod?.kind ?? null,
    intention: displayedPeriod?.intention ?? '',
    sessionId: displayedPeriod?.sessionId ?? '',
    durationMs,
    deadlineMs: current.status === 'running' ? active.deadlineMs : null,
    remainingMs,
    elapsedMs,
    progress: durationMs === null ? 0 : Math.min(1, Math.max(0, elapsedMs / durationMs)),
    expired: current.status === 'running' && remainingMs === 0,
    suggestedKind: nextKind(current),
    lastReceipt: latestReceipt ? clone(latestReceipt) : null,
    receiptWindow: {
      limit: MAX_RECEIPTS,
      retained: current.receipts.length,
      discarded: current.discardedReceipts,
      label: 'Totals cover retained receipts only (up to the most recent 1000).',
    },
    totals,
  };
}

export function mergeFocus(current, incoming) {
  const currentState = checkedState(current);
  const incomingState = checkedState(incoming);
  const merged = clone(currentState);
  const receiptById = new Map(currentState.receipts.map((receipt) => [receipt.id, receipt]));
  for (const receipt of incomingState.receipts) {
    if (!receiptById.has(receipt.id)) receiptById.set(receipt.id, clone(receipt));
  }
  let active = currentState.active;
  if (active) {
    // The current in-progress period wins over an incoming completion of the same period.
    receiptById.delete(active.id);
  } else if (incomingState.active && !receiptById.has(incomingState.active.id)) {
    // A current completion wins over an older incoming active copy with the same id.
    active = incomingState.active;
  }
  const receipts = [...receiptById.values()].sort((left, right) => (
    left.completedAtMs - right.completedAtMs || left.id.localeCompare(right.id)
  ));
  const excess = Math.max(0, receipts.length - MAX_RECEIPTS);
  merged.receipts = excess ? receipts.slice(excess) : receipts;
  merged.discardedReceipts = Math.max(currentState.discardedReceipts, incomingState.discardedReceipts) + excess;
  const cadence = retainedCadence(merged.receipts);
  if (merged.discardedReceipts === 0 || cadence.hasRetainedLong) {
    merged.focusBlocksSinceLong = cadence.focusCount;
  } else {
    const possibleMaximum = cadence.focusCount + merged.discardedReceipts;
    merged.focusBlocksSinceLong = Math.min(possibleMaximum, Math.max(
      cadence.focusCount,
      currentState.focusBlocksSinceLong,
      incomingState.focusBlocksSinceLong,
    ));
  }
  merged.nextSequence = Math.max(currentState.nextSequence, incomingState.nextSequence);
  merged.updatedAtMs = Math.max(currentState.updatedAtMs, incomingState.updatedAtMs);
  if (active) {
    merged.active = clone(active);
    merged.status = currentState.active ? currentState.status : incomingState.status;
  } else {
    merged.active = null;
    merged.status = (currentState.status === 'completed' || incomingState.status === 'completed')
      && merged.receipts.length ? 'completed' : 'idle';
  }
  const validation = validateFocus(merged);
  if (!validation.ok) throw new Error(`Merged focus state is invalid: ${validation.errors.join(' ')}`);
  return merged;
}
