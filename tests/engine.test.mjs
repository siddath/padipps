import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../engine.js', import.meta.url), 'utf8');
const packSource = readFileSync(new URL('../pack-engine.js', import.meta.url), 'utf8');
const starterText = readFileSync(new URL('../packs/starter.json', import.meta.url), 'utf8');
const {
  STORAGE_KEY,
  dueReviews,
  finishAttempt,
  freshState,
  loadState,
  makeDraft,
  markdownExport,
  mergeStates,
  notebookMarkdown,
  parseImport,
  recommend,
  saveNotebookNote,
  saveState,
  isNoteDraftDirty,
  validateState,
} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const packUrl = `data:text/javascript;base64,${Buffer.from(packSource).toString('base64')}`;
const contentSource = readFileSync(new URL('../content.js', import.meta.url), 'utf8')
  .replace("'./pack-engine.js'", `'${packUrl}'`)
  .replace("'./backup-engine.js'", `'${new URL('../backup-engine.js', import.meta.url).href}'`)
  .replace("new URL('./packs/starter.json', import.meta.url).toString()", "'starter.json'");
const priorFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => starterText });
const { ACTIVE_PACK_KEY, readActivePack, saveActivePack, qaPrefix } = await import(`data:text/javascript;base64,${Buffer.from(contentSource).toString('base64')}`);
globalThis.fetch = priorFetch;

const NOW = '2026-09-06T09:00:00.000Z';
const LESSON = {
  id: 'pair-sum', title: 'Pair sum', home: 'general', lenses: ['algorithm'], capability: 'Hash lookup',
  trace: [{ code: 'lookup', note: 'find complement' }], checklist: ['explained'], prerequisites: [],
};

class Storage {
  constructor(seed = {}, fail = false) { this.data = new Map(Object.entries(seed)); this.fail = fail; }
  getItem(key) { if (this.fail) throw new Error('blocked'); return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { if (this.fail) throw new Error('blocked'); this.data.set(key, value); }
}
function draft(overrides = {}) {
  return { ...makeDraft(LESSON.id, NOW), stage: 4, recognitionTries: 1, recognitionCorrect: true, traceIndex: 1, decisionTries: 1, decisionCorrect: true, explanation: 'Look up the earlier complement.', selfCheck: [true], practiceStarted: true, ...overrides };
}
function result(overrides = {}) { return { outcome: 'independent', confidence: 4, artifact: 'local scratch file', testEvidence: 'three cases passed', lesson: 'check before insert', failure: '', nextReviewDays: 1, ...overrides }; }

test('public engine uses only its own key and handles corrupt or blocked storage', () => {
  const storage = new Storage({ 'unrelated-app-state': '{unrelated-data}', [STORAGE_KEY]: null });
  assert.equal(loadState(storage).status, 'empty');
  assert.equal(loadState(new Storage({}, true)).status, 'blocked');
  const corrupt = new Storage({ [STORAGE_KEY]: '{bad' });
  assert.equal(loadState(corrupt).status, 'corrupt');
  assert.equal(corrupt.getItem(STORAGE_KEY), '{bad');
});

test('generic state validates safe homes/lenses, imports, merges, and rejects false independence', () => {
  const completed = finishAttempt(freshState(NOW), draft(), LESSON, result(), NOW);
  assert.equal(completed.attempt.home, 'general');
  assert.equal(completed.attempt.lenses[0], 'algorithm');
  const falseClaim = structuredClone(completed.state);
  falseClaim.attempts[0].recognitionTries = 2;
  assert.equal(validateState(falseClaim).ok, false);
  assert.equal(parseImport(JSON.stringify(falseClaim)).ok, false);
  assert.equal(saveState(new Storage(), falseClaim).ok, false);

  const incoming = freshState('2026-09-07T09:00:00.000Z');
  incoming.drafts['other-lesson'] = makeDraft('other-lesson', incoming.updatedAt);
  const merged = mergeStates(completed.state, incoming);
  assert.equal(merged.attempts.length, 1);
  assert.ok(merged.drafts['other-lesson']);
});

test('missed foundation attempts remain honest and review links close only valid earlier work', () => {
  const missed = finishAttempt(freshState(NOW), makeDraft(LESSON.id, NOW), LESSON, result({ outcome: 'missed', confidence: 1, artifact: 'Not produced: stopped at recognition.', testEvidence: 'Not reached.', lesson: 'Revisit hash lookup.', failure: 'Could not identify the complement cue.', nextReviewDays: 0 }), NOW);
  assert.equal(missed.attempt.explanation, 'Not produced; foundation attempt stopped.');
  assert.equal(dueReviews(missed.state, NOW).length, 1);
  const retry = finishAttempt(missed.state, draft(), LESSON, result({ reviewOf: missed.attempt.id, nextReviewDays: 3 }), '2026-09-06T10:00:00.000Z');
  assert.equal(dueReviews(retry.state, '2026-09-06T10:00:00.000Z').length, 0);
  const future = structuredClone(missed.state);
  future.attempts[0].completedAt = '2026-09-06T11:00:00.000Z';
  assert.throws(() => finishAttempt(future, draft(), LESSON, result({ reviewOf: future.attempts[0].id }), '2026-09-06T10:00:00.000Z'), /earlier attempt/);

  const hostile = structuredClone(missed.state);
  hostile.attempts[0].reviewOf = hostile.attempts[0].id;
  assert.equal(validateState(hostile).ok, false);
  assert.equal(dueReviews(hostile, NOW).length, 1);
});

test('recommendation uses passed pack sessions and generic markdown contains no private paths', () => {
  const state = freshState(NOW);
  const sessions = [LESSON, { ...LESSON, id: 'second-lesson', title: 'Second', prerequisites: ['pair-sum'] }];
  assert.equal(recommend(state, sessions, NOW).sessionId, 'pair-sum');
  const completed = finishAttempt(state, draft(), LESSON, result(), NOW);
  const exported = markdownExport(completed.state, sessions);
  assert.match(exported, /Pair sum/);
  assert.match(exported, /attempt_/);
  assert.doesNotMatch(exported, /logs\/|\/Users\//);
});

test('active pack saving requires explicit overwrite for a different revision', () => {
  const storage = new Storage();
  const first = saveActivePack(storage, starterText);
  assert.equal(first.ok, true);
  assert.equal(readActivePack(storage).status, 'ok');
  const revised = JSON.parse(starterText);
  revised.pack.description = 'A revised description.';
  const replacement = JSON.stringify(revised);
  assert.equal(saveActivePack(storage, replacement).requiresOverwrite, true);
  assert.equal(storage.getItem(ACTIVE_PACK_KEY), JSON.stringify(JSON.parse(starterText)));
  assert.equal(saveActivePack(storage, replacement, { overwrite: true }).ok, true);
  assert.equal(readActivePack(storage).pack.description, 'A revised description.');
});

test('notebook notes, drafts, and parked lesson drafts remain restorable and merge safely', () => {
  const state = freshState(NOW);
  state.legacyNotes['parked:pair-sum:1'] = makeDraft('pair-sum', NOW);
  state.noteDraft = { id: '', sessionId: 'pair-sum', title: 'Invariant', body: 'Check before inserting.', status: 'open' };
  assert.equal(validateState(state).ok, true);
  assert.equal(isNoteDraftDirty(state), true);
  const saved = saveNotebookNote(state, {sessionId:state.noteDraft.sessionId,title:state.noteDraft.title,body:state.noteDraft.body,status:state.noteDraft.status}, NOW);
  assert.equal(saved.note.title, 'Invariant');
  const updated = saveNotebookNote(saved.state, { id: saved.note.id, sessionId: 'pair-sum', title: 'Invariant revised', body: 'Look up before insert.', status: 'revisit' }, '2026-09-06T09:01:00.000Z');
  assert.equal(updated.note.revisions.length, 1);
  const incoming = freshState('2026-09-06T09:02:00.000Z');
  incoming.legacyNotes['parked:other:1'] = makeDraft('other-lesson', incoming.updatedAt);
  const merged = mergeStates(updated.state, incoming);
  assert.equal(merged.notes.length, 1);
  assert.ok(merged.legacyNotes['parked:pair-sum:1']);
  assert.ok(merged.legacyNotes['parked:other:1']);
  assert.match(notebookMarkdown(merged, [LESSON]), /Invariant revised/);
});

 test('pack import sandbox keys match plain QA and fault QA routes',()=>{assert.equal(qaPrefix('?qa'),'padipps-qa:');assert.equal(qaPrefix('?qa&fault=blocked'),'padipps-qa:blocked:');assert.equal(qaPrefix(''),'');});
