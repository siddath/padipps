import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const engineSource = readFileSync(new URL('../engine.js', import.meta.url), 'utf8');
const {
  STORAGE_KEY,
  dueReviews,
  freshState,
  isNoteDraftDirty,
  loadState,
  mergeStates,
  notebookMarkdown,
  parseImport,
  recommend,
  saveNotebookNote,
  saveState,
  validateState,
} = await import(`data:text/javascript;base64,${Buffer.from(engineSource).toString('base64')}`);

const NOW = '2026-09-05T10:00:00.000Z';
const LATER = '2026-09-06T10:00:00.000Z';
const SESSIONS = [{ id: 'pair-sum', title: 'Pair Sum', category: 'DSA', prerequisites: [] }];

class FakeStorage {
  constructor(seed = {}) {
    this.data = new Map(Object.entries(seed));
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, value);
  }
}

function oldV3() {
  const state = freshState(NOW);
  delete state.notes;
  delete state.noteDraft;
  return state;
}

function noteInput(overrides = {}) {
  return {
    sessionId: 'pair-sum',
    title: 'Prefix sums',
    body: 'Store the zero prefix before scanning.',
    status: 'open',
    ...overrides,
  };
}

test('old v3 notebooks remain valid and load/import materialize notebook defaults', () => {
  const old = oldV3();
  assert.equal(validateState(old).ok, true);

  const loaded = loadState(new FakeStorage({ [STORAGE_KEY]: JSON.stringify(old) }));
  assert.equal(loaded.status, 'ok');
  assert.deepEqual(loaded.state.notes, []);
  assert.equal(loaded.state.noteDraft, null);

  const imported = parseImport(JSON.stringify(old));
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.state.notes, []);
  assert.equal(imported.state.noteDraft, null);
});

test('new notes persist through save and load without changing the v3 key', () => {
  const created = saveNotebookNote(freshState(NOW), noteInput(), NOW);
  const storage = new FakeStorage();
  assert.equal(saveState(storage, created.state).ok, true);
  assert.ok(storage.getItem(STORAGE_KEY));
  const loaded = loadState(storage);
  assert.deepEqual(loaded.state.notes, [created.note]);
  assert.equal(loaded.state.version, 3);
  const imported = parseImport(storage.getItem(STORAGE_KEY));
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.state.notes, [created.note]);
});

test('updates preserve identity, trim content, record prior revisions, and ignore no-op edits', () => {
  const created = saveNotebookNote(freshState(NOW), noteInput({ title: '  Prefix sums  ', body: '\nRemember zero.\n' }), NOW);
  assert.equal(created.note.title, 'Prefix sums');
  assert.equal(created.note.body, 'Remember zero.');
  const updated = saveNotebookNote(created.state, noteInput({
    id: created.note.id,
    title: 'Prefix sum invariant',
    body: 'Remember zero and query before insert.',
    status: 'revisit',
  }), LATER);
  assert.equal(updated.note.id, created.note.id);
  assert.equal(updated.note.createdAt, NOW);
  assert.deepEqual(updated.note.revisions, [{
    title: 'Prefix sums', body: 'Remember zero.', status: 'open', updatedAt: NOW,
  }]);

  const noOp = saveNotebookNote(updated.state, noteInput({
    id: created.note.id,
    title: '  Prefix sum invariant ',
    body: '\nRemember zero and query before insert.\n',
    status: 'revisit',
  }), '2026-09-07T10:00:00.000Z');
  assert.deepEqual(noOp.note, updated.note);
  assert.equal(noOp.state.notes[0].revisions.length, 1);
  assert.equal(noOp.state.updatedAt, updated.state.updatedAt);
});

test('note validation enforces fields, bounds, unique ids, and revision cap', () => {
  const created = saveNotebookNote(freshState(NOW), noteInput(), NOW);
  const invalidCases = [
    { ...created.note, title: ' untrimmed' },
    { ...created.note, title: 'x'.repeat(201) },
    { ...created.note, body: 'x'.repeat(12001) },
    { ...created.note, body: ' ' },
    { ...created.note, status: 'archived' },
    { ...created.note, sessionId: 'unsafe id' },
    { ...created.note, revisions: Array.from({ length: 21 }, () => ({ title: 'Old', body: 'Old body', status: 'open', updatedAt: NOW })) },
  ];
  for (const note of invalidCases) {
    assert.equal(validateState({ ...created.state, notes: [note] }).ok, false);
  }
  assert.equal(validateState({ ...created.state, notes: [created.note, structuredClone(created.note)] }).ok, false);
  assert.equal(validateState({ ...created.state, notes: Array.from({ length: 1001 }, (_, index) => ({ ...created.note, id: `note_${index}` })) }).ok, false);
  assert.throws(() => saveNotebookNote(freshState(NOW), noteInput({ title: ' ' }), NOW), /title/);
});

test('optional noteDraft accepts empty composition, rejects malformed buffers, and persists', () => {
  const state = freshState(NOW);
  state.noteDraft = { id: '', sessionId: '', title: '', body: '', status: 'open' };
  assert.equal(validateState(state).ok, true);
  const storage = new FakeStorage();
  assert.equal(saveState(storage, state).ok, true);
  assert.deepEqual(loadState(storage).state.noteDraft, state.noteDraft);
  assert.equal(isNoteDraftDirty(state), false);
  state.noteDraft = { ...state.noteDraft, sessionId: 'pair-sum', status: 'revisit' };
  assert.equal(isNoteDraftDirty(state), false);
  state.noteDraft.title = 'Meaningful draft';
  assert.equal(isNoteDraftDirty(state), true);

  for (const noteDraft of [
    { ...state.noteDraft, id: 'unsafe id' },
    { ...state.noteDraft, sessionId: 'unsafe id' },
    { ...state.noteDraft, title: 'x'.repeat(201) },
    { ...state.noteDraft, body: 'x'.repeat(12001) },
    { ...state.noteDraft, status: 'archived' },
    { ...state.noteDraft, extra: true },
  ]) {
    assert.equal(validateState({ ...state, noteDraft }).ok, false);
  }
});

test('revision history retains only the 20 most recent prior snapshots', () => {
  let result = saveNotebookNote(freshState(NOW), noteInput(), NOW);
  for (let index = 1; index <= 21; index += 1) {
    const timestamp = `2026-09-${String(index + 5).padStart(2, '0')}T10:00:00.000Z`;
    result = saveNotebookNote(result.state, noteInput({ id: result.note.id, title: `Title ${index}` }), timestamp);
  }
  assert.equal(result.note.revisions.length, 20);
  assert.equal(result.note.revisions[0].title, 'Title 1');
  assert.equal(result.note.revisions[19].title, 'Title 20');
});

test('merge deduplicates notes by stable id, keeps current conflicts, and imports missing notes', () => {
  const currentSaved = saveNotebookNote(freshState(NOW), noteInput({ title: 'Current title' }), NOW);
  const incomingConflict = structuredClone(currentSaved.note);
  incomingConflict.title = 'Incoming title';
  incomingConflict.updatedAt = LATER;
  const incomingUnique = saveNotebookNote(freshState(LATER), noteInput({ sessionId: '', title: 'Unique note' }), LATER).note;
  const incoming = { ...freshState(LATER), notes: [incomingConflict, incomingUnique] };
  incoming.noteDraft = { id: '', sessionId: '', title: 'Incoming draft', body: '', status: 'open' };
  currentSaved.state.noteDraft = { id: currentSaved.note.id, sessionId: 'pair-sum', title: 'Current draft', body: '', status: 'revisit' };
  const merged = mergeStates(currentSaved.state, incoming);
  assert.equal(merged.notes.length, 2);
  assert.equal(merged.notes.find((note) => note.id === currentSaved.note.id).title, 'Current title');
  assert.equal(merged.notes.find((note) => note.id === incomingUnique.id).title, 'Unique note');
  assert.equal(merged.noteDraft.title, 'Current draft');

  const oldMerged = mergeStates(oldV3(), incoming);
  assert.equal(oldMerged.notes.length, 2);
  assert.equal(oldMerged.noteDraft.title, 'Incoming draft');
});

test('merge ignores a clean current editor mirror, preserves dirty incoming, and lets dirty current win', () => {
  const currentSaved = saveNotebookNote(freshState(NOW), noteInput({ title: 'Filed note' }), NOW);
  currentSaved.state.noteDraft = {
    id: currentSaved.note.id,
    sessionId: currentSaved.note.sessionId,
    title: currentSaved.note.title,
    body: currentSaved.note.body,
    status: currentSaved.note.status,
  };
  assert.equal(isNoteDraftDirty(currentSaved.state), false);

  const incoming = freshState(LATER);
  incoming.noteDraft = { id: '', sessionId: '', title: 'Incoming draft', body: 'Unsaved work', status: 'open' };
  const incomingWins = mergeStates(currentSaved.state, incoming);
  assert.equal(incomingWins.noteDraft.title, 'Incoming draft');

  currentSaved.state.noteDraft.body = 'Dirty current work';
  assert.equal(isNoteDraftDirty(currentSaved.state), true);
  const currentWins = mergeStates(currentSaved.state, incoming);
  assert.equal(currentWins.noteDraft.body, 'Dirty current work');
});

test('notebook Markdown preserves complete note history and safely fences Markdown content', () => {
  const created = saveNotebookNote(freshState(NOW), noteInput({
    title: '# [Unsafe](https://example.com)',
    body: 'Before\n```\n<script>alert(1)</script>\n```\nAfter',
  }), NOW);
  const updated = saveNotebookNote(created.state, noteInput({
    id: created.note.id,
    title: 'Safe title',
    body: 'Current body',
    status: 'resolved',
  }), LATER);
  updated.state.noteDraft = { id: '', sessionId: '', title: '# Draft', body: 'Unsaved ``` body', status: 'open' };
  updated.state.attempts.push({
    id: 'attempt_history',
    sessionId: 'pair-sum',
    home: 'general',
    capability: 'Recognise prefix sums',
    lenses: ['backend'],
    completedAt: NOW,
    outcome: 'assisted',
    evidenceKind: 'self-reported',
    hints: 1,
    elapsedMs: 60000,
    explanation: 'Used prefix history.',
    recognitionTries: 1,
    decisionTries: 1,
    confidence: 3,
    artifact: '<img src=x onerror=alert(1)> [click](javascript:alert(2)) `tick` | scratch.java',
    testEvidence: 'Local tests passed.',
    lesson: 'Seed zero.',
    failure: '',
    nextReviewDays: 1,
    nextReviewAt: LATER,
    review: null,
  });
  const markdown = notebookMarkdown(updated.state, SESSIONS);
  assert.match(markdown, /## Unfiled draft \(not saved\)/);
  assert.match(markdown, /This compose buffer has not created or revised a notebook note/);
  assert.match(markdown, /Unsaved ``` body/);
  assert.match(markdown, /### Safe title/);
  assert.match(markdown, /#### Revision history/);
  assert.ok(markdown.includes('- Title: \\# \\[Unsafe\\]\\(https://example\\.com\\)'));
  assert.match(markdown, /````text\nBefore\n```\n<script>alert\(1\)<\/script>\n```\nAfter\n````/);
  assert.match(markdown, /## Attempts and review history/);
  assert.match(markdown, /Padipps practice record/);
  assert.match(markdown, /attempt_history/);
  assert.ok(markdown.includes('```text\n<img src=x onerror=alert(1)> [click](javascript:alert(2)) `tick` | scratch.java\n```'));

});

test('notebook Markdown omits clean editor mirrors but includes meaningful unsaved changes', () => {
  const created = saveNotebookNote(freshState(NOW), noteInput({ title: 'Filed once' }), NOW);
  created.state.noteDraft = {
    id: created.note.id,
    sessionId: created.note.sessionId,
    title: created.note.title,
    body: created.note.body,
    status: created.note.status,
  };
  const cleanExport = notebookMarkdown(created.state, SESSIONS);
  assert.doesNotMatch(cleanExport, /Unfiled draft/);
  assert.equal((cleanExport.match(/### Filed once/g) || []).length, 1);

  created.state.noteDraft.body = 'Unsaved changed body';
  const dirtyExport = notebookMarkdown(created.state, SESSIONS);
  assert.match(dirtyExport, /## Unfiled draft \(not saved\)/);
  assert.match(dirtyExport, /Unsaved changed body/);
});

test('saving notes never changes attempts, due reviews, or recommendations', () => {
  const state = freshState(NOW);
  const beforeDue = dueReviews(state, NOW);
  const beforeRecommendation = recommend(state, SESSIONS, NOW);
  const saved = saveNotebookNote(state, noteInput(), NOW);
  assert.deepEqual(saved.state.attempts, state.attempts);
  assert.deepEqual(dueReviews(saved.state, NOW), beforeDue);
  assert.deepEqual(recommend(saved.state, SESSIONS, NOW), beforeRecommendation);
});
