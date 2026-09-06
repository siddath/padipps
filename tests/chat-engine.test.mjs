import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_CONTEXT_LIMIT,
  CHAT_TRANSCRIPT_LIMIT,
  appendMessage,
  changeMode,
  conversationExport,
  conversationKey,
  conversationMarkdown,
  freshConversation,
  loadConversation,
  parseConversation,
  recentMessages,
  sameConversationContent,
  saveConversation,
  updateDraft,
  validateConversation,
} from '../chat-engine.js';

const packA = 'a'.repeat(64);
const packB = 'b'.repeat(64);

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem:key => data.has(key) ? data.get(key) : null,
    setItem:(key, value) => data.set(key, value),
    removeItem:key => data.delete(key),
  };
}

test('conversation state is isolated by exact pack revision and lesson', () => {
  const state = freshConversation(packA, 'lesson-one', '2026-09-06T00:00:00.000Z');
  assert.equal(validateConversation(state, {packFingerprint:packA, lessonId:'lesson-one'}).ok, true);
  assert.equal(validateConversation(state, {packFingerprint:packB, lessonId:'lesson-one'}).ok, false);
  assert.equal(validateConversation(state, {packFingerprint:packA, lessonId:'lesson-two'}).ok, false);
  assert.notEqual(conversationKey(packA, 'lesson-one'), conversationKey(packB, 'lesson-one'));
  assert.notEqual(conversationKey(packA, 'lesson-one'), conversationKey(packA, 'lesson-two'));
  assert.throws(() => conversationKey(packA, '__proto__'));
});

test('drafts and modes remain separate across pack revisions and lessons', () => {
  const storage = memoryStorage();
  let state = updateDraft(freshConversation(packA, 'lesson-one', '2026-09-06T00:00:00.000Z'), 'Why?', '2026-09-06T00:00:01.000Z');
  state = changeMode(state, 'quiz', '2026-09-06T00:00:02.000Z');
  assert.equal(saveConversation(storage, state, null).ok, true);
  assert.equal(loadConversation(storage, packA, 'lesson-one').state.draft, 'Why?');
  assert.equal(loadConversation(storage, packA, 'lesson-two').state.draft, '');
  assert.equal(loadConversation(storage, packB, 'lesson-one').state.draft, '');
});

test('transcript keeps 80 messages and shares only the latest 12 role/content pairs', () => {
  let state = freshConversation(packA, 'lesson-one', '2026-09-06T00:00:00.000Z');
  for (let index = 0; index < CHAT_TRANSCRIPT_LIMIT + 7; index += 1) {
    state = appendMessage(state, index % 2 ? 'assistant' : 'user', `message ${index}`, {
      id:`msg-${index}`,
      createdAt:`2026-09-06T00:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.000Z`,
    });
  }
  assert.equal(state.messages.length, CHAT_TRANSCRIPT_LIMIT);
  assert.equal(state.discardedMessages, 7);
  const recent = recentMessages(state);
  assert.equal(recent.length, CHAT_CONTEXT_LIMIT);
  assert.deepEqual(Object.keys(recent[0]), ['role', 'content']);
  assert.equal(recent.at(-1).content, 'message 86');
});

test('timestamp-only updates do not conflict while different content does', () => {
  const storage = memoryStorage();
  const initial = freshConversation(packA, 'lesson-one', '2026-09-06T00:00:00.000Z');
  const first = saveConversation(storage, initial, null);
  const timestampOnly = {...initial, updatedAt:'2026-09-06T00:00:01.000Z'};
  storage.setItem(conversationKey(packA, 'lesson-one'), JSON.stringify(timestampOnly));
  assert.equal(sameConversationContent(initial, timestampOnly), true);
  const ownChange = updateDraft(initial, 'My draft', '2026-09-06T00:00:02.000Z');
  assert.equal(saveConversation(storage, ownChange, first.raw).ok, true);

  const expectedRaw = JSON.stringify(ownChange);
  storage.setItem(conversationKey(packA, 'lesson-one'), JSON.stringify(updateDraft(ownChange, 'Other tab', ownChange.updatedAt)));
  const conflict = saveConversation(storage, updateDraft(ownChange, 'This tab', '2026-09-06T00:00:03.000Z'), expectedRaw);
  assert.equal(conflict.kind, 'conflict');
});

test('blocked, corrupt, and quota storage stay recoverable and fail closed', () => {
  const blocked = {getItem(){throw new Error('blocked');}, setItem(){throw new Error('blocked');}};
  assert.equal(loadConversation(blocked, packA, 'lesson-one').status, 'blocked');
  const quota = memoryStorage();
  quota.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
  assert.equal(saveConversation(quota, freshConversation(packA, 'lesson-one'), null).kind, 'quota');
  const corrupt = memoryStorage();
  corrupt.setItem(conversationKey(packA, 'lesson-one'), '{broken');
  const loaded = loadConversation(corrupt, packA, 'lesson-one');
  assert.equal(loaded.status, 'corrupt');
  assert.equal(saveConversation(corrupt, updateDraft(loaded.state, 'kept in memory'), loaded.raw).kind, 'corrupt');
});

test('exports retain draft and state while stating the evidence boundary', () => {
  let state = freshConversation(packA, 'lesson-one', '2026-09-06T00:00:00.000Z');
  state = appendMessage(state, 'user', 'Explain this', {id:'msg-1', createdAt:'2026-09-06T00:00:01.000Z'});
  state = updateDraft(state, 'unsent question', '2026-09-06T00:00:02.000Z');
  assert.match(conversationExport(state), /not a completed attempt/);
  const markdown = conversationMarkdown(state, 'Public lesson');
  assert.match(markdown, /Pack fingerprint: a{64}/);
  assert.match(markdown, /Unsent draft[\s\S]*unsent question/);
  assert.equal(parseConversation(JSON.stringify(state), {packFingerprint:packA, lessonId:'lesson-one'}).ok, true);
});
