/** Pure browser-local conversation state. It never writes practice, notebook, or focus state. */
import {validPackFingerprint} from './chat-context.js';

export const CHAT_VERSION = 1;
export const CHAT_STORAGE_KEY = 'padipps-study-chat-v1';
export const CHAT_TRANSCRIPT_LIMIT = 80;
export const CHAT_CONTEXT_LIMIT = 12;

const MODES = new Set(['explain', 'quiz', 'check']);
const ROLES = new Set(['user', 'assistant']);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/u;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_TEXT = 12_000;
const MAX_SERIALIZED_BYTES = 2 * 1024 * 1024;

function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function onlyKeys(value, allowed) {
  return Object.keys(value).every(key => allowed.has(key) && !DANGEROUS_KEYS.has(key));
}

function byteLength(text) {
  return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : Buffer.byteLength(text);
}

function validText(value, allowEmpty = false) {
  return typeof value === 'string'
    && (allowEmpty || value.trim().length > 0)
    && Array.from(value).length <= MAX_TEXT;
}

function validTimestamp(value) {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && value === new Date(parsed).toISOString();
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function withoutTimestamp(value) {
  if (!plainObject(value)) return value;
  const copy = {...value};
  delete copy.updatedAt;
  return copy;
}

function nextMessageId() {
  if (globalThis.crypto?.randomUUID) return `msg-${globalThis.crypto.randomUUID()}`;
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function validLessonId(value) {
  return typeof value === 'string' && SAFE_ID.test(value) && !DANGEROUS_KEYS.has(value);
}

export function conversationKey(packFingerprint, lessonId) {
  if (!validPackFingerprint(packFingerprint)) throw new Error('Conversation pack fingerprint is invalid.');
  if (!validLessonId(lessonId)) throw new Error('Conversation lesson ID is invalid.');
  return `${CHAT_STORAGE_KEY}:${packFingerprint}:${encodeURIComponent(lessonId)}`;
}

export function freshConversation(packFingerprint, lessonId, at = new Date().toISOString()) {
  conversationKey(packFingerprint, lessonId);
  if (!validTimestamp(at)) throw new Error('Conversation timestamp is invalid.');
  return {
    version: CHAT_VERSION,
    packFingerprint,
    lessonId,
    updatedAt: at,
    mode: 'explain',
    draft: '',
    messages: [],
    discardedMessages: 0,
  };
}

export function validateConversation(value, expected = {}) {
  const errors = [];
  let serialized = '';
  try { serialized = JSON.stringify(value); } catch { errors.push('Conversation cannot be serialized.'); }
  if (serialized && byteLength(serialized) > MAX_SERIALIZED_BYTES) errors.push('Conversation exceeds the 2 MB limit.');
  if (!plainObject(value)) return {ok:false, errors:[...errors, 'Conversation must be an object.']};
  const fields = new Set(['version', 'packFingerprint', 'lessonId', 'updatedAt', 'mode', 'draft', 'messages', 'discardedMessages']);
  if (!onlyKeys(value, fields)) errors.push('Conversation has unknown fields.');
  if (value.version !== CHAT_VERSION) errors.push(`Unsupported conversation version: ${String(value.version)}.`);
  if (!validPackFingerprint(value.packFingerprint)) errors.push('Conversation pack fingerprint is invalid.');
  if (!validLessonId(value.lessonId)) errors.push('Conversation lesson ID is invalid.');
  if (expected.packFingerprint !== undefined && value.packFingerprint !== expected.packFingerprint) errors.push('Conversation belongs to another pack revision.');
  if (expected.lessonId !== undefined && value.lessonId !== expected.lessonId) errors.push('Conversation belongs to another lesson.');
  if (!validTimestamp(value.updatedAt)) errors.push('Conversation timestamp is invalid.');
  if (!MODES.has(value.mode)) errors.push('Conversation mode is invalid.');
  if (!validText(value.draft, true)) errors.push('Conversation draft is invalid.');
  if (!Number.isSafeInteger(value.discardedMessages) || value.discardedMessages < 0) errors.push('Discarded message count is invalid.');
  if (!Array.isArray(value.messages) || value.messages.length > CHAT_TRANSCRIPT_LIMIT) {
    errors.push(`Conversation must contain at most ${CHAT_TRANSCRIPT_LIMIT} messages.`);
  } else {
    const ids = new Set();
    value.messages.forEach((message, index) => {
      const label = `messages[${index}]`;
      if (!plainObject(message)) { errors.push(`${label} must be an object.`); return; }
      if (!onlyKeys(message, new Set(['id', 'role', 'content', 'createdAt']))) errors.push(`${label} has unknown fields.`);
      if (!validLessonId(message.id) || ids.has(message.id)) errors.push(`${label}.id is invalid or duplicated.`);
      ids.add(message.id);
      if (!ROLES.has(message.role)) errors.push(`${label}.role is invalid.`);
      if (!validText(message.content)) errors.push(`${label}.content is invalid.`);
      if (!validTimestamp(message.createdAt)) errors.push(`${label}.createdAt is invalid.`);
    });
  }
  return {ok:errors.length === 0, errors};
}

export function parseConversation(text, expected = {}) {
  if (typeof text !== 'string' || byteLength(text) > MAX_SERIALIZED_BYTES) {
    return {ok:false, errors:['Conversation data is missing or exceeds the 2 MB limit.']};
  }
  try {
    const state = JSON.parse(text);
    const result = validateConversation(state, expected);
    return result.ok ? {ok:true, state} : result;
  } catch {
    return {ok:false, errors:['Conversation data is not valid JSON.']};
  }
}

export function sameConversationContent(left, right) {
  return JSON.stringify(withoutTimestamp(left)) === JSON.stringify(withoutTimestamp(right));
}

export function loadConversation(storage, packFingerprint, lessonId, at = new Date().toISOString()) {
  const key = conversationKey(packFingerprint, lessonId);
  const fresh = () => freshConversation(packFingerprint, lessonId, at);
  if (!storage) return {status:'blocked', state:fresh(), raw:'', message:'Browser conversation storage is unavailable.'};
  let raw;
  try { raw = storage.getItem(key); }
  catch { return {status:'blocked', state:fresh(), raw:'', message:'Browser conversation storage cannot be read.'}; }
  if (raw === null) return {status:'empty', state:fresh(), raw:null, message:''};
  const parsed = parseConversation(raw, {packFingerprint, lessonId});
  if (!parsed.ok) return {status:'corrupt', state:fresh(), raw, message:'Saved conversation is unreadable. It was left untouched; export this tab before replacing anything.'};
  return {status:'ok', state:parsed.state, raw, message:''};
}

export function saveConversation(storage, state, expectedRaw = null) {
  const scope = {packFingerprint:state?.packFingerprint, lessonId:state?.lessonId};
  const checked = validateConversation(state, scope);
  if (!checked.ok) return {ok:false, kind:'invalid', message:checked.errors[0]};
  if (!storage) return {ok:false, kind:'blocked', message:'Browser conversation storage is unavailable.'};
  const key = conversationKey(state.packFingerprint, state.lessonId);
  try {
    const currentRaw = storage.getItem(key);
    const expected = expectedRaw === null ? null : parseConversation(expectedRaw, scope);
    const current = currentRaw === null ? null : parseConversation(currentRaw, scope);
    if ((expectedRaw !== null && !expected?.ok) || (currentRaw !== null && !current?.ok)) {
      return {ok:false, kind:'corrupt', raw:currentRaw, message:'Saved conversation is unreadable. It was left untouched; export this tab before replacing anything.'};
    }
    if (currentRaw !== expectedRaw) {
      const timestampOnly = current?.ok && expected?.ok && sameConversationContent(current.state, expected.state);
      if (!timestampOnly) return {ok:false, kind:'conflict', raw:currentRaw, message:'Another tab changed this conversation. Saving is paused; export this tab before reloading.'};
    }
    const text = JSON.stringify(state);
    storage.setItem(key, text);
    return {ok:true, raw:text, message:''};
  } catch (error) {
    const quota = error?.name === 'QuotaExceededError';
    return {ok:false, kind:quota ? 'quota' : 'blocked', message:quota
      ? 'Browser storage is full. This conversation is in this tab only; export it now.'
      : 'Browser conversation storage cannot be written. This conversation is in this tab only; export it now.'};
  }
}

export function updateDraft(state, draft, at = new Date().toISOString()) {
  if (!validText(draft, true)) throw new Error('Conversation draft is invalid.');
  if (!validTimestamp(at)) throw new Error('Conversation timestamp is invalid.');
  return {...clone(state), draft, updatedAt:at};
}

export function changeMode(state, mode, at = new Date().toISOString()) {
  if (!MODES.has(mode)) throw new Error('Conversation mode is invalid.');
  if (!validTimestamp(at)) throw new Error('Conversation timestamp is invalid.');
  return {...clone(state), mode, updatedAt:at};
}

export function appendMessage(state, role, content, options = {}) {
  if (!ROLES.has(role) || !validText(content)) throw new Error('Conversation message is invalid.');
  const createdAt = options.createdAt || new Date().toISOString();
  const id = options.id || nextMessageId();
  if (!validTimestamp(createdAt) || !validLessonId(id)) throw new Error('Conversation message metadata is invalid.');
  const next = clone(state);
  next.messages.push({id, role, content:content.trim(), createdAt});
  const overflow = Math.max(0, next.messages.length - CHAT_TRANSCRIPT_LIMIT);
  if (overflow) next.messages.splice(0, overflow);
  next.discardedMessages += overflow;
  if (role === 'user') next.draft = '';
  next.updatedAt = options.updatedAt || createdAt;
  const checked = validateConversation(next, {packFingerprint:state.packFingerprint, lessonId:state.lessonId});
  if (!checked.ok) throw new Error(checked.errors[0]);
  return next;
}

export function recentMessages(state, limit = CHAT_CONTEXT_LIMIT) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > CHAT_TRANSCRIPT_LIMIT) throw new Error('Conversation context limit is invalid.');
  return state.messages.slice(-limit).map(({role, content}) => ({role, content}));
}

export function conversationExport(state) {
  const checked = validateConversation(state, {packFingerprint:state?.packFingerprint, lessonId:state?.lessonId});
  if (!checked.ok) throw new Error(checked.errors[0]);
  return JSON.stringify({
    exportKind:'padipps-study-conversation-archive',
    restoreSupported:false,
    evidenceBoundary:'A Study conversation is not a completed attempt, reviewer feedback, notebook entry, focus record, or canonical log.',
    exportedAt:new Date().toISOString(),
    conversation:clone(state),
  }, null, 2);
}

export function conversationMarkdown(state, lessonTitle = state.lessonId) {
  const checked = validateConversation(state, {packFingerprint:state?.packFingerprint, lessonId:state?.lessonId});
  if (!checked.ok) throw new Error(checked.errors[0]);
  const lines = [
    '# Padipps Study conversation', '',
    `- Lesson: ${lessonTitle}`,
    `- Lesson ID: ${state.lessonId}`,
    `- Pack fingerprint: ${state.packFingerprint}`,
    `- Mode: ${state.mode}`,
    `- Exported: ${new Date().toISOString()}`,
    `- Earlier messages discarded locally: ${state.discardedMessages}`, '',
    'This conversation is local study context. It is not a completed attempt, reviewer feedback, notebook entry, focus record, or canonical log.', '',
  ];
  for (const message of state.messages) lines.push(`## ${message.role === 'user' ? 'You' : 'Padipps Study'} · ${message.createdAt}`, '', message.content, '');
  if (state.draft.trim()) lines.push('## Unsent draft', '', state.draft, '');
  return lines.join('\n');
}
