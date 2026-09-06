import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createPadippsServer, parseServerOptions} from '../server.mjs';

class TestResponse extends EventEmitter {
  headers = {};
  status = null;
  body = '';
  setHeader(name, value) { this.headers[name] = value; }
  writeHead(status, headers = {}) { this.status = status; Object.assign(this.headers, headers); }
  end(body = '') { this.body = body ? String(body) : ''; }
}

async function get(server, port, pathname) {
  const req = {method:'GET', url:pathname, headers:{host:`127.0.0.1:${port}`}};
  const res = new TestResponse();
  await server.listeners('request')[0](req, res);
  return res;
}

test('default server options keep Codex disabled and reject implicit flags', () => {
  assert.deepEqual(parseServerOptions([], {}), {port:4177, codex:false});
  assert.deepEqual(parseServerOptions(['--codex'], {PORT:'4181'}), {port:4181, codex:true});
  assert.throws(() => parseServerOptions(['--model', 'anything'], {}), /Usage/);
  assert.throws(() => parseServerOptions(['--codex', '--codex'], {}), /at most once/);
});

test('default local server serves chat UI assets but has no chat API handler', async () => {
  const port = 4177;
  const server = createPadippsServer({port});
  const context = await get(server, port, '/chat-context.js');
  assert.equal(context.status, 200);
  assert.match(context.body, /stage-aware lesson context/);
  assert.equal((await get(server, port, '/api/study-chat/status')).status, 404);
  assert.equal((await get(server, port, '/chat-api.mjs')).status, 404);
  assert.equal((await get(server, port, '/chat-provider.mjs')).status, 404);
});
