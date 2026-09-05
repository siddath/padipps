import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FOCUS_STORAGE_KEY,
  configureFocus,
  focusView,
  freshFocus,
  mergeFocus,
  parseFocus,
  pauseFocus,
  resetFocus,
  resumeFocus,
  settleFocus,
  startFocus,
  validateFocus,
} from '../focus-engine.js';

const START = 1_800_000_000_000;
const MINUTE = 60_000;
const MAX_TIMESTAMP = 8_640_000_000_000_000;

function qaStart(state, kind = 'focus', nowMs = state.updatedAtMs, intention) {
  return startFocus(state, {
    kind,
    intention: intention ?? (kind === 'focus' ? 'Implement one bounded test' : undefined),
    sessionId: kind === 'focus' ? 'prefix-count' : '',
    durationMs: 5000,
    qa: true,
  }, nowMs);
}

function completeQa(state, kind = 'focus', nowMs = state.updatedAtMs, intention) {
  const running = qaStart(state, kind, nowMs, intention);
  return settleFocus(running, nowMs + 5000);
}

test('defaults and storage contract are stable', () => {
  const state = freshFocus(START);
  assert.equal(FOCUS_STORAGE_KEY, 'padipps-focus-v1');
  assert.deepEqual(state.settings, { focusMinutes: 25, shortMinutes: 5, longMinutes: 15, longEvery: 4 });
  assert.equal(state.status, 'idle');
  assert.equal(validateFocus(state).ok, true);
});

test('running countdown pauses, freezes, resumes, and keeps the original duration', () => {
  const initial = freshFocus(START);
  const running = startFocus(initial, { kind: 'focus', intention: '  Study prefix sums  ', sessionId: 'prefix-count' }, START);
  assert.equal(initial.status, 'idle');
  assert.equal(focusView(running, START + 5 * MINUTE).remainingMs, 20 * MINUTE);
  const paused = pauseFocus(running, START + 5 * MINUTE);
  assert.equal(paused.status, 'paused');
  assert.equal(focusView(paused, START + 20 * MINUTE).remainingMs, 20 * MINUTE);
  const configured = configureFocus(paused, { focusMinutes: 40, shortMinutes: 7, longMinutes: 20, longEvery: 3 }, START + 20 * MINUTE);
  assert.equal(configured.active.durationMs, 25 * MINUTE);
  const resumed = resumeFocus(configured, START + 21 * MINUTE);
  assert.equal(resumed.active.deadlineMs, START + 41 * MINUTE);
  assert.equal(focusView(resumed, START + 31 * MINUTE).progress, 0.6);
});

test('view clamps a backwards wall clock without throwing or leaving progress bounds', () => {
  const running = qaStart(freshFocus(START));
  const view = focusView(running, START - 1000);
  assert.equal(view.clockSkew, true);
  assert.equal(view.remainingMs, 5000);
  assert.equal(view.elapsedMs, 0);
  assert.equal(view.progress, 0);
  assert.equal(view.expired, false);
  assert.equal(focusView(running, START).clockSkew, false);
});

test('expiry creates one stable elapsed-timer receipt and remains idempotent after reload', () => {
  const running = qaStart(freshFocus(START));
  const before = settleFocus(running, START + 4999);
  assert.equal(before.receipts.length, 0);
  const completed = settleFocus(running, START + 5000);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.receipts.length, 1);
  assert.equal(completed.receipts[0].id, running.active.id);
  assert.equal(completed.receipts[0].evidenceKind, 'elapsed-timer');
  assert.equal(focusView(completed, START + 5000).progress, 1);
  assert.equal(focusView(completed, START + 5000).kind, 'focus');
  const reloaded = parseFocus(JSON.stringify(completed));
  assert.deepEqual(settleFocus(reloaded, START + 9000), reloaded);
});

test('focus blocks suggest a long break on the configured cadence and breaks suggest focus', () => {
  let state = freshFocus(START);
  for (let index = 0; index < 3; index += 1) {
    state = completeQa(state, 'focus', state.updatedAtMs);
    assert.equal(focusView(state, state.updatedAtMs).suggestedKind, 'short');
  }
  state = completeQa(state, 'focus', state.updatedAtMs);
  assert.equal(state.focusBlocksSinceLong, 4);
  assert.equal(focusView(state, state.updatedAtMs).suggestedKind, 'long');
  state = completeQa(state, 'long', state.updatedAtMs);
  assert.equal(state.focusBlocksSinceLong, 0);
  assert.equal(focusView(state, state.updatedAtMs).suggestedKind, 'focus');
  assert.equal(state.receipts.at(-1).intention, 'Take a break');
});

test('every period requires explicit start and resetting a partial period gives no credit', () => {
  const running = qaStart(freshFocus(START));
  const reset = resetFocus(running, START + 1000);
  assert.equal(reset.status, 'idle');
  assert.equal(reset.active, null);
  assert.equal(reset.receipts.length, 0);
  assert.throws(() => pauseFocus(reset, START + 1001), /running/);
  const completed = completeQa(reset, 'short', START + 1001);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.active, null);
});

test('settings, timestamps, intentions, and QA overrides reject invalid values', () => {
  const state = freshFocus(START);
  for (const settings of [
    { focusMinutes: 0, shortMinutes: 5, longMinutes: 15, longEvery: 4 },
    { focusMinutes: 25, shortMinutes: 61, longMinutes: 15, longEvery: 4 },
    { focusMinutes: 25, shortMinutes: 5, longMinutes: 15, longEvery: 9 },
    { focusMinutes: 25.5, shortMinutes: 5, longMinutes: 15, longEvery: 4 },
  ]) assert.throws(() => configureFocus(state, settings, START), /Focus settings/);
  assert.throws(() => startFocus(state, { kind: 'focus', intention: '', sessionId: '' }, START), /Intention/);
  assert.doesNotThrow(() => startFocus(state, { kind: 'focus', intention: '😀'.repeat(200), sessionId: '' }, START));
  assert.throws(() => startFocus(state, { kind: 'focus', intention: '😀'.repeat(201), sessionId: '' }, START), /200 Unicode/);
  assert.throws(() => startFocus(state, { kind: 'focus', intention: 'Work', sessionId: '', durationMs: 5000 }, START), /explicit qa/);
  assert.throws(() => startFocus(state, { kind: 'focus', intention: 'Work', sessionId: '', durationMs: 6000, qa: true }, START), /5000/);
  assert.throws(() => startFocus(state, { kind: 'focus', intention: 'Work', sessionId: '' }, -1), /Date range/);
  assert.throws(() => startFocus(state, { kind: 'focus', intention: 'Work', sessionId: '' }, Number.NaN), /Date range/);
  assert.throws(() => startFocus(state, { kind: 'focus', intention: 'Work', sessionId: '' }, START - 1), /older/);
  assert.throws(() => freshFocus(MAX_TIMESTAMP + 1), /Date range/);
});

test('validation and parsing reject corrupt imports and malformed persisted durations', () => {
  const running = qaStart(freshFocus(START));
  const malformed = structuredClone(running);
  malformed.active.durationMs = 6000;
  assert.equal(validateFocus(malformed).ok, false);
  assert.throws(() => parseFocus(JSON.stringify(malformed)), /Invalid focus import/);
  const impossibleDeadline = structuredClone(running);
  impossibleDeadline.active.deadlineMs = impossibleDeadline.active.startedAtMs + 4999;
  assert.equal(validateFocus(impossibleDeadline).ok, false);
  assert.match(validateFocus(impossibleDeadline).errors.join(' '), /earlier than the timer duration/);
  const impossibleDate = structuredClone(running);
  impossibleDate.updatedAtMs = MAX_TIMESTAMP + 1;
  assert.equal(validateFocus(impossibleDate).ok, false);
  const futureReceipt = completeQa(freshFocus(START));
  futureReceipt.receipts[0].completedAtMs = futureReceipt.updatedAtMs + 1;
  assert.equal(validateFocus(futureReceipt).ok, false);
  assert.throws(() => parseFocus('{broken'), /malformed JSON/);
  assert.throws(() => parseFocus('['.repeat(2 * 1024 * 1024 + 1)), /2MB/);
});

test('receipt history caps at 1000 and totals explicitly cover only retained receipts', () => {
  let state = freshFocus(START);
  for (let index = 0; index < 1001; index += 1) state = completeQa(state, 'focus', state.updatedAtMs);
  assert.equal(state.receipts.length, 1000);
  assert.equal(state.discardedReceipts, 1);
  assert.equal(state.focusBlocksSinceLong, 1001);
  assert.equal(validateFocus(state).ok, true);
  const view = focusView(state, state.updatedAtMs);
  assert.equal(view.totals.periods, 1000);
  assert.equal(view.totals.focusBlocks, 1000);
  assert.equal(view.receiptWindow.limit, 1000);
  assert.equal(view.receiptWindow.discarded, 1);
  assert.match(view.receiptWindow.label, /retained receipts only/);
});

test('merge unions stable receipt IDs, keeps current conflicts/settings/active, and imports active when current has none', () => {
  const base = freshFocus(START);
  const current = completeQa(base, 'focus', START);
  current.settings.focusMinutes = 40;
  const currentActive = qaStart(current, 'short', current.updatedAtMs);

  const incoming = completeQa(freshFocus(START + 1), 'short', START + 1);
  incoming.receipts.push({ ...current.receipts[0], intention: 'Incoming conflict loses' });
  incoming.receipts.sort((a, b) => a.completedAtMs - b.completedAtMs || a.id.localeCompare(b.id));
  incoming.focusBlocksSinceLong = 1;
  incoming.nextSequence = 3;
  const merged = mergeFocus(currentActive, incoming);
  assert.equal(merged.receipts.length, 2);
  assert.equal(merged.receipts.find(receipt => receipt.id === current.receipts[0].id).intention, current.receipts[0].intention);
  assert.equal(merged.active.id, currentActive.active.id);
  assert.equal(merged.settings.focusMinutes, 40);

  const importedActive = mergeFocus(freshFocus(START), qaStart(freshFocus(START), 'long', START));
  assert.equal(importedActive.status, 'running');
  assert.equal(importedActive.active.kind, 'long');

  const sharedRunning = qaStart(freshFocus(START + 20_000), 'focus', START + 20_000);
  const currentCompleted = settleFocus(sharedRunning, START + 25_000);
  const staleIncoming = mergeFocus(currentCompleted, sharedRunning);
  assert.equal(staleIncoming.status, 'completed');
  assert.equal(staleIncoming.active, null);
  assert.equal(staleIncoming.receipts[0].id, sharedRunning.active.id);
});

test('cadence validation rejects fabricated focus progress and merge recomputes union history', () => {
  let onlyBreaks = freshFocus(START);
  for (let index = 0; index < 3; index += 1) onlyBreaks = completeQa(onlyBreaks, 'short', onlyBreaks.updatedAtMs);
  const fabricated = structuredClone(onlyBreaks);
  fabricated.focusBlocksSinceLong = 3;
  assert.equal(validateFocus(fabricated).ok, false);
  assert.match(validateFocus(fabricated).errors.join(' '), /does not match completed focus periods/);

  const current = completeQa(freshFocus(START), 'focus', START);
  let incoming = freshFocus(START + 100_000);
  for (let index = 0; index < 3; index += 1) incoming = completeQa(incoming, 'focus', incoming.updatedAtMs);
  const merged = mergeFocus(current, incoming);
  assert.equal(merged.receipts.length, 4);
  assert.equal(merged.focusBlocksSinceLong, 4);
  assert.equal(focusView(merged, merged.updatedAtMs).suggestedKind, 'long');
});


test('a book keeps its idea through pause, reload, completion and merge; older records remain valid', () => {
  const base = freshFocus(START);
  const running = startFocus(base,{kind:'focus',intention:'One idea',reflectionId:'art-negative-space',qa:true,durationMs:5000},START);
  const paused = pauseFocus(running,START+1000);
  const resumed = resumeFocus(parseFocus(JSON.stringify(paused)),START+2000);
  const completed = settleFocus(resumed,START+6000);
  assert.equal(completed.receipts[0].reflectionId,'art-negative-space');
  assert.equal(mergeFocus(base,completed,START+7000).receipts[0].reflectionId,'art-negative-space');
  const old = JSON.parse(JSON.stringify(completed)); delete old.receipts[0].reflectionId;
  assert.equal(validateFocus(old).ok,true);
  assert.throws(()=>startFocus(base,{kind:'focus',intention:'Unsafe',reflectionId:'<script>'},START),/reflectionId/);
  const quiet = startFocus(base,{kind:'focus',intention:'No suggestion',reflectionId:''},START);
  assert.equal(quiet.active.reflectionId,'');
  const rest = startFocus(base,{kind:'short',reflectionId:'art-negative-space'},START);
  assert.equal(rest.active.reflectionId,'');
});
