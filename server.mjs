/** Loopback-only static preview. Codex is reachable only with the explicit --codex flag. */
import http from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {BROWSER_ASSETS} from './public-assets.mjs';

const moduleFile = fileURLToPath(import.meta.url);
const root = path.dirname(moduleFile);
const allowed = new Set(BROWSER_ASSETS);
const types = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webp':'image/webp',
};

export function parseServerOptions(argv = process.argv.slice(2), env = process.env) {
  if (argv.some(argument => argument !== '--codex')) throw new Error('Usage: node server.mjs [--codex]');
  if (argv.filter(argument => argument === '--codex').length > 1) throw new Error('Use --codex at most once.');
  const port = Number(env.PORT || 4177);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be an integer from 1024 to 65535.');
  return {port, codex:argv.includes('--codex')};
}

export function createPadippsServer({port = 4177, chatHandler = null} = {}) {
  return http.createServer(async (req, res) => {
    if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(req.headers.host)) {
      res.writeHead(403);
      res.end('Loopback host required');
      return;
    }
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');

    if (chatHandler && await chatHandler(req, res)) return;
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, {Allow:'GET, HEAD'});
      res.end();
      return;
    }
    let file;
    try {
      const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
      file = pathname === '/' ? 'index.html' : pathname.slice(1);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (!allowed.has(file)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    try {
      const target = await realpath(path.join(root, file));
      if (!target.startsWith(root + path.sep)) throw new Error('Outside app');
      const body = await readFile(target);
      res.writeHead(200, {'Content-Type':types[path.extname(target)], 'Content-Length':body.length});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

async function main() {
  const options = parseServerOptions();
  let chatHandler = null;
  if (options.codex) {
    const [{createStudyChatApi}, {createCodexStudyProvider, resolveCodexExecutable}] = await Promise.all([
      import('./chat-api.mjs'),
      import('./chat-provider.mjs'),
    ]);
    const executable = await resolveCodexExecutable().catch(() => null);
    chatHandler = createStudyChatApi({provider:createCodexStudyProvider({executable})});
  }
  const server = createPadippsServer({port:options.port, chatHandler});
  server.listen(options.port, '127.0.0.1', () => {
    console.log(`Padipps: http://127.0.0.1:${options.port}${options.codex ? ' (local Codex chat enabled)' : ' (chat disabled)'}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === moduleFile) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
