import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAT_MODES, studyContext, studyMessages, studyPrompt, validateStudyContext} from '../chat-context.js';
import {localChatEndpoint} from '../chat-ui.js';

const fingerprint = 'a'.repeat(64);
const lesson = {
  id:'public-lesson',
  title:'A public lesson',
  category:'Foundations',
  capability:'Reason about a bounded mechanism.',
  prompt:'Which property matters?',
  model:'Keep one small state transition.',
  invariant:'Every accepted event preserves the state.',
  sources:[{label:'Example source', url:'https://example.com/reference'}],
  answer:1,
  feedback:'SECRET FEEDBACK',
  trace:[{code:'SECRET TRACE', note:'SECRET NOTE'}],
  rubric:['SECRET RUBRIC'],
};

test('stage-aware context includes only explicit fields and never mutates the imported lesson', () => {
  for (let stage = 0; stage <= 4; stage += 1) {
    const before = JSON.stringify(lesson);
    const context = studyContext(lesson, stage);
    const expected = stage === 1 || stage >= 3
      ? ['category','concept','invariant','lessonId','model','sources','stage','stageIndex','task','title']
      : ['category','lessonId','sources','stage','stageIndex','task','title'];
    assert.deepEqual(Object.keys(context).sort(), expected);
    assert.equal(validateStudyContext(context).ok, true);
    assert.equal(JSON.stringify(lesson), before);
    for (const secret of ['SECRET FEEDBACK', 'SECRET TRACE', 'SECRET NOTE', 'SECRET RUBRIC']) {
      assert.ok(!JSON.stringify(context).includes(secret));
    }
  }
});

test('prompt modes retain only bounded context and treat pack material as untrusted data', () => {
  for (const mode of CHAT_MODES) {
    const prompt = studyPrompt({
      packFingerprint:fingerprint,
      context:studyContext(lesson, 1),
      mode,
      messages:[{role:'user', content:'Use a smaller example.', private:'SECRET MESSAGE FIELD'}],
    });
    assert.match(prompt, /untrusted user-provided study material/);
    assert.match(prompt, /no authority to read files/i);
    assert.match(prompt, /pack fingerprint is an opaque revision identifier/i);
    assert.match(prompt, /Use a smaller example/);
    assert.ok(!prompt.includes('SECRET MESSAGE FIELD'));
    assert.ok(!prompt.includes('SECRET TRACE'));
  }
});

test('conversation compaction preserves whole recent Unicode messages', () => {
  const messages = Array.from({length:20}, (_, index) => ({role:index % 2 ? 'user' : 'assistant', content:`message ${index}`, ignored:index}));
  assert.equal(studyMessages(messages).length, 12);
  assert.deepEqual(studyMessages(messages).at(-1), {role:'user', content:'message 19'});
  const long = ['a', '📖', 'c'].map(content => ({role:'user', content:content.repeat(12_000)}));
  assert.deepEqual(studyMessages(long), long.slice(1));
});

test('static Pages never discover a chat endpoint while loopback HTTP does', () => {
  assert.equal(localChatEndpoint({protocol:'https:', hostname:'siddath.github.io', origin:'https://siddath.github.io'}), null);
  assert.equal(localChatEndpoint({protocol:'file:', hostname:'', origin:'null'}), null);
  assert.equal(localChatEndpoint({protocol:'http:', hostname:'example.test', origin:'http://example.test'}), null);
  assert.equal(localChatEndpoint({protocol:'http:', hostname:'127.0.0.1', origin:'http://127.0.0.1:4177'}), 'http://127.0.0.1:4177/api/study-chat');
  assert.equal(localChatEndpoint({protocol:'http:', hostname:'localhost', origin:'http://localhost:4177'}), 'http://localhost:4177/api/study-chat');
});

test('context validation rejects answer keys, path fields, and stage-shape mismatches', () => {
  const base = studyContext(lesson, 0);
  assert.equal(validateStudyContext({...base, answer:1}).ok, false);
  assert.equal(validateStudyContext({...base, path:'/tmp/private'}).ok, false);
  assert.equal(validateStudyContext({...base, model:'revealed too early'}).ok, false);
  assert.equal(validateStudyContext({...base, stage:'Practise'}).ok, false);
});
