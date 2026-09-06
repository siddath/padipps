/** Strict same-origin HTTP boundary for the opt-in local text-only tutor. */
import {
  CHAT_MODES,
  studyMessages,
  studyPrompt,
  validPackFingerprint,
  validateStudyContext,
} from './chat-context.js';
import {StudyChatProviderError, StudyChatProviderUnavailableError} from './chat-provider.mjs';

const BODY_LIMIT_BYTES = 160 * 1024;
const MESSAGE_LIMIT = 12;
const MESSAGE_CHAR_LIMIT = 12_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;
const DEFAULT_TIMEOUT_MS = 30_000;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function sendJson(res, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':Buffer.byteLength(body),
    'Cache-Control':'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function plainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, keys) {
  return plainObject(value)
    && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key));
}

function validateOrigin(req, {required}) {
  const host = req.headers.host;
  const origin = req.headers.origin;
  if (!host || !/^(?:127\.0\.0\.1|localhost):\d{4,5}$/u.test(host)) throw new HttpError(403, 'Loopback request required.');
  if ((required && !origin) || (origin && origin !== `http://${host}`)) throw new HttpError(403, 'Same-origin request required.');
  const fetchSite = req.headers['sec-fetch-site'];
  if (fetchSite && fetchSite !== 'same-origin') throw new HttpError(403, 'Same-origin request required.');
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT_BYTES) throw new HttpError(413, 'Study chat request is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Send valid JSON.'); }
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > MESSAGE_LIMIT) {
    throw new HttpError(400, `Send 1 to ${MESSAGE_LIMIT} conversation messages.`);
  }
  for (const message of messages) {
    if (!exactKeys(message, ['role', 'content']) || !['user', 'assistant'].includes(message.role)
      || typeof message.content !== 'string' || !message.content.trim()
      || Array.from(message.content).length > MESSAGE_CHAR_LIMIT) {
      throw new HttpError(400, `Each message needs a valid role and 1 to ${MESSAGE_CHAR_LIMIT} characters.`);
    }
  }
  if (messages.at(-1).role !== 'user') throw new HttpError(400, 'The latest conversation message must be from the learner.');
}

export function validateChatRequest(body) {
  if (!exactKeys(body, ['packFingerprint', 'context', 'mode', 'messages'])) {
    throw new HttpError(400, 'Send only the documented study chat fields.');
  }
  if (!validPackFingerprint(body.packFingerprint)) throw new HttpError(400, 'Choose a valid pack revision.');
  const context = validateStudyContext(body.context);
  if (!context.ok) throw new HttpError(400, context.error);
  if (!CHAT_MODES.includes(body.mode)) throw new HttpError(400, 'Choose a supported conversation mode.');
  validateMessages(body.messages);
  return {
    packFingerprint:body.packFingerprint,
    context:context.context,
    mode:body.mode,
    messages:studyMessages(body.messages),
  };
}

export const compactStudyMessages = studyMessages;

export function createStudyChatApi({
  provider,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = () => Date.now(),
  rateLimit = RATE_LIMIT,
} = {}) {
  if (!provider || typeof provider.status !== 'function' || typeof provider.complete !== 'function') {
    throw new TypeError('A study chat provider is required.');
  }
  const recentRequests = [];
  let inFlight = false;

  return async function handleStudyChatApi(req, res) {
    let pathname;
    try { pathname = new URL(req.url, `http://${req.headers.host || 'invalid'}`).pathname; }
    catch { return false; }
    const statusRoute = pathname === '/api/study-chat/status';
    const chatRoute = pathname === '/api/study-chat';
    if (!statusRoute && !chatRoute) return false;

    try {
      if (statusRoute) {
        validateOrigin(req, {required:false});
        if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'Method not allowed.');
        const status = await provider.status();
        if (req.method === 'HEAD') {
          res.writeHead(200, {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store'});
          res.end();
        } else sendJson(res, 200, status);
        return true;
      }

      validateOrigin(req, {required:true});
      if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
      if (req.headers['x-padipps-chat'] !== '1') throw new HttpError(403, 'Study chat request marker required.');
      if (!/^application\/json(?:\s*;|$)/iu.test(req.headers['content-type'] || '')) throw new HttpError(415, 'Send application/json.');
      const request = validateChatRequest(await readJson(req));
      const current = now();
      while (recentRequests.length && recentRequests[0] <= current - RATE_WINDOW_MS) recentRequests.shift();
      if (recentRequests.length >= rateLimit) throw new HttpError(429, 'Study chat rate limit reached. Pause, then try again.');
      if (inFlight) throw new HttpError(429, 'Study chat is already answering.');
      recentRequests.push(current);
      inFlight = true;
      const controller = new AbortController();
      const abort = () => { if (!res.writableEnded) controller.abort(); };
      req.once?.('aborted', abort);
      res.once?.('close', abort);
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      timer.unref?.();
      try {
        const prompt = studyPrompt(request);
        const result = await provider.complete(prompt, {signal:controller.signal});
        if (!result || typeof result.reply !== 'string' || !result.reply.trim()
          || Array.from(result.reply).length > 4_000 || result.provider !== 'codex') {
          throw new StudyChatProviderError('The study provider returned an invalid reply.', 'invalid_response');
        }
        sendJson(res, 200, {reply:result.reply, provider:'codex', ...(result.model ? {model:result.model} : {})});
      } finally {
        clearTimeout(timer);
        req.off?.('aborted', abort);
        res.off?.('close', abort);
        inFlight = false;
      }
      return true;
    } catch (error) {
      if (res.writableEnded || res.destroyed) return true;
      if (error instanceof HttpError) {
        sendJson(res, error.status, {error:error.message}, error.status === 405 ? {Allow:statusRoute ? 'GET, HEAD' : 'POST'} : {});
      } else if (error instanceof StudyChatProviderUnavailableError) {
        sendJson(res, 503, {error:error.message});
      } else if (error instanceof StudyChatProviderError && error.code === 'aborted') {
        sendJson(res, 504, {error:'The study response timed out.'});
      } else {
        sendJson(res, 502, {error:error instanceof StudyChatProviderError ? error.message : 'The study provider failed.'});
      }
      return true;
    }
  };
}
