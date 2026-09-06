import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {createStudyChatApi, compactStudyMessages} from '../chat-api.mjs';
import {studyContext} from '../chat-context.js';
import {StudyChatProviderError, StudyChatProviderUnavailableError} from '../chat-provider.mjs';

const fingerprint = 'a'.repeat(64);
const lesson = {
  id:'public-lesson', title:'Public lesson', category:'Foundations',
  capability:'Reason about state.', prompt:'Which property matters?',
  model:'Keep one small transition.', invariant:'Accepted events preserve state.',
  sources:[{label:'Source', url:'https://example.com/source'}],
};

class TestResponse extends EventEmitter {
  writableEnded = false;
  destroyed = false;
  statusCode = null;
  headers = null;
  body = '';
  writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; }
  end(body = '') { this.body = body; this.writableEnded = true; }
  json() { return this.body ? JSON.parse(this.body) : null; }
}

function request({method = 'POST', route = '/api/study-chat', headers = {}, body} = {}) {
  const req = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
  req.method = method;
  req.url = route;
  req.headers = {
    host:'127.0.0.1:4177',
    origin:'http://127.0.0.1:4177',
    'sec-fetch-site':'same-origin',
    'content-type':'application/json',
    'x-padipps-chat':'1',
    ...headers,
  };
  return req;
}

function validBody(overrides = {}) {
  return {
    packFingerprint:fingerprint,
    context:studyContext(lesson, 1),
    mode:'explain',
    messages:[{role:'user', content:'Why preserve that state?'}],
    ...overrides,
  };
}

async function call(handler, options) {
  const req = request(options);
  const res = new TestResponse();
  const handled = await handler(req, res);
  return {res, handled};
}

test('status and chat expose only the bounded local contract', async () => {
  let receivedPrompt = '';
  const provider = {
    status:async () => ({available:true, provider:'codex', model:'gpt-test', message:'Ready.'}),
    complete:async prompt => {
      receivedPrompt = prompt;
      return {reply:'A small invariant narrows the next transition.', provider:'codex', model:'gpt-test'};
    },
  };
  const handler = createStudyChatApi({provider});
  const status = await call(handler, {method:'GET', route:'/api/study-chat/status', headers:{origin:undefined, 'content-type':undefined, 'x-padipps-chat':undefined}});
  assert.equal(status.res.statusCode, 200);
  assert.deepEqual(status.res.json(), {available:true, provider:'codex', model:'gpt-test', message:'Ready.'});
  const chat = await call(handler, {body:validBody()});
  assert.equal(chat.res.statusCode, 200);
  assert.deepEqual(chat.res.json(), {reply:'A small invariant narrows the next transition.', provider:'codex', model:'gpt-test'});
  assert.match(receivedPrompt, /"lessonId":"public-lesson"/);
  assert.match(receivedPrompt, new RegExp(fingerprint));
  assert.match(receivedPrompt, /Why preserve that state/);
});

test('request security rejects origins, missing marker, paths, tools, model overrides, and malformed context', async () => {
  const handler = createStudyChatApi({provider:{status:async()=>({available:true}), complete:async()=>({reply:'ok', provider:'codex'})}});
  const cases = [
    [{body:validBody(), headers:{origin:'http://attacker.example'}}, 403],
    [{body:validBody(), headers:{host:'attacker.example'}}, 403],
    [{body:validBody(), headers:{'x-padipps-chat':'0'}}, 403],
    [{body:validBody(), headers:{'content-type':'text/plain'}}, 415],
    [{body:{...validBody(), path:'/private/repo'}}, 400],
    [{body:{...validBody(), tools:['shell']}}, 400],
    [{body:{...validBody(), model:'override'}}, 400],
    [{body:validBody({packFingerprint:'not-a-fingerprint'})}, 400],
    [{body:validBody({context:{...studyContext(lesson, 1), path:'/tmp/private'}})}, 400],
    [{body:validBody({context:{...studyContext(lesson, 0), model:'revealed'}})}, 400],
    [{body:validBody({mode:'execute'})}, 400],
    [{body:validBody({messages:[{role:'assistant', content:'last'}]})}, 400],
    [{body:validBody({messages:[{role:'user', content:'x'.repeat(12_001)}]})}, 400],
    [{body:'not json'}, 400],
  ];
  for (const [options, status] of cases) {
    const result = await call(handler, options);
    assert.equal(result.res.statusCode, status, JSON.stringify(options));
    assert.deepEqual(Object.keys(result.res.json()), ['error']);
  }
});

test('different pack fingerprints remain opaque and request-local', async () => {
  const prompts = [];
  const handler = createStudyChatApi({provider:{status:async()=>({available:true}), complete:async prompt=>{prompts.push(prompt);return {reply:'ok', provider:'codex'};}}});
  assert.equal((await call(handler, {body:validBody()})).res.statusCode, 200);
  assert.equal((await call(handler, {body:validBody({packFingerprint:'b'.repeat(64)})})).res.statusCode, 200);
  assert.match(prompts[0], /a{64}/);
  assert.ok(!prompts[0].includes('b'.repeat(64)));
  assert.match(prompts[1], /b{64}/);
});

test('message selection counts Unicode and never sends partial older messages', () => {
  const messages = [{role:'assistant', content:'a'.repeat(21_000)}, {role:'user', content:'📖'.repeat(12_000)}];
  assert.deepEqual(compactStudyMessages(messages), [messages[1]]);
});

test('rate, concurrent, unavailable, oversized, and timeout failures return safe errors', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const handler = createStudyChatApi({provider:{status:async()=>({available:true}), complete:async()=>pending}, timeoutMs:100});
  const first = call(handler, {body:validBody()});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await call(handler, {body:validBody()})).res.statusCode, 429);
  release({reply:'done', provider:'codex'});
  assert.equal((await first).res.statusCode, 200);

  let current = 1_000;
  const rateHandler = createStudyChatApi({provider:{status:async()=>({available:true}), complete:async()=>({reply:'ok', provider:'codex'})}, rateLimit:1, now:()=>current});
  assert.equal((await call(rateHandler, {body:validBody()})).res.statusCode, 200);
  assert.equal((await call(rateHandler, {body:validBody()})).res.statusCode, 429);
  current += 60_001;
  assert.equal((await call(rateHandler, {body:validBody()})).res.statusCode, 200);

  const unavailable = createStudyChatApi({provider:{status:async()=>({available:false}), complete:async()=>{throw new StudyChatProviderUnavailableError('Not signed in.');}}});
  assert.equal((await call(unavailable, {body:validBody()})).res.statusCode, 503);
  const oversized = createStudyChatApi({provider:{status:async()=>({available:true}), complete:async()=>({reply:'x'.repeat(4_001), provider:'codex'})}});
  assert.equal((await call(oversized, {body:validBody()})).res.statusCode, 502);
  const timedOut = createStudyChatApi({provider:{status:async()=>({available:true}), complete:async (_prompt, {signal})=>new Promise((_, reject)=>{
    // Model the active socket/process that keeps a real provider alive. Node 22
    // exits an otherwise empty test loop before the API's unref'ed timer fires.
    const watchdog = setTimeout(()=>reject(new Error('The API did not abort the synthetic provider.')), 1_000);
    signal.addEventListener('abort', ()=>{
      clearTimeout(watchdog);
      reject(new StudyChatProviderError('cancelled', 'aborted'));
    }, {once:true});
  })}, timeoutMs:5});
  assert.equal((await call(timedOut, {body:validBody()})).res.statusCode, 504);
});

test('unknown paths are left to the static server', async () => {
  const handler = createStudyChatApi({provider:{status:async()=>({available:true}), complete:async()=>({reply:'ok', provider:'codex'})}});
  const result = await call(handler, {method:'GET', route:'/index.html'});
  assert.equal(result.handled, false);
  assert.equal(result.res.writableEnded, false);
});
