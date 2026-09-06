import {
  appendMessage,
  changeMode,
  conversationExport,
  conversationKey,
  conversationMarkdown,
  loadConversation,
  parseConversation,
  sameConversationContent,
  saveConversation,
  updateDraft,
} from './chat-engine.js';
import {CHAT_MODES, studyContext, studyMessages, studyPrompt} from './chat-context.js';

const MODE_COPY = {
  explain:['Explain', 'Build one small model.'],
  quiz:['Quiz me', 'Ask one question at a time.'],
  check:['Check', 'Challenge my explanation.'],
};

export function localChatEndpoint(locationLike = globalThis.location) {
  if (!locationLike || locationLike.protocol !== 'http:'
    || !['127.0.0.1', 'localhost'].includes(locationLike.hostname)) return null;
  return new URL('/api/study-chat', locationLike.origin).toString();
}

function displayStage(stage) { return Number.isInteger(stage) && stage >= 0 && stage <= 4 ? stage : 0; }

export function setupStudyChat({storage, namespace = '', sessions, packFingerprint, getLessonState, announce, download}) {
  const sessionMap = new Map(sessions.map(session => [session.id, session]));
  const host = document.querySelector('#study-chat-host');
  const root = document.createElement('section');
  root.id = 'study-chat-root';
  root.className = 'study-chat-panel';
  root.hidden = true;
  root.setAttribute('aria-label', 'Padipps Study conversation');
  host?.append(root);

  const apiEndpoint = localChatEndpoint();
  const records = new Map();
  let currentId = '';
  let open = false;
  let lastOpener = null;
  let connection = apiEndpoint
    ? {checked:false, available:false, provider:'codex', message:'Checking whether local chat was explicitly enabled…'}
    : {checked:true, available:false, provider:'codex', message:'This static site made no model request. To use your own Codex locally, clone Padipps and run npm run chat.'};
  let statusPromise = Promise.resolve();

  function refreshConnection() {
    if (!apiEndpoint) {
      connection = {checked:true, available:false, provider:'codex', message:'This static site made no model request. To use your own Codex locally, clone Padipps and run npm run chat.'};
      if (currentId) render();
      return Promise.resolve();
    }
    connection = {checked:false, available:false, provider:'codex', message:'Checking whether local chat was explicitly enabled…'};
    if (currentId) render();
    statusPromise = fetch(`${apiEndpoint}/status`, {headers:{Accept:'application/json'}, credentials:'same-origin'})
      .then(async response => {
        if (!response.ok) throw new Error('Local chat is off. Start Padipps with npm run chat to opt in.');
        const value = await response.json();
        if (!value || typeof value.available !== 'boolean' || value.provider !== 'codex' || typeof value.message !== 'string') {
          throw new Error('The local model connection returned an invalid status.');
        }
        connection = {checked:true, available:value.available, provider:value.provider, model:typeof value.model === 'string' ? value.model : '', message:value.message};
      })
      .catch(error => {
        connection = {checked:true, available:false, provider:'codex', message:error.message || 'Local chat is unavailable.'};
      })
      .finally(() => { if (currentId) render(); });
    return statusPromise;
  }
  if (apiEndpoint) refreshConnection();

  function recordFor(lessonId) {
    if (!records.has(lessonId)) {
      const loaded = loadConversation(storage, packFingerprint, lessonId);
      records.set(lessonId, {
        state:loaded.state,
        raw:loaded.raw,
        recoveryRaw:loaded.status === 'corrupt' ? loaded.raw : '',
        conflict:false,
        problem:loaded.message,
        failure:'',
        manualPrompt:'',
        request:null,
        retryRequest:null,
      });
    }
    return records.get(lessonId);
  }

  function persist(record) {
    if (record.conflict || record.recoveryRaw) return false;
    const result = saveConversation(storage, record.state, record.raw);
    if (result.ok) {
      record.raw = result.raw;
      record.problem = '';
      return true;
    }
    record.problem = result.message;
    if (result.kind === 'conflict') record.conflict = true;
    return false;
  }

  function currentLesson() {
    const fallback = {session:sessionMap.get(currentId), stage:0};
    const lesson = getLessonState?.(currentId) || fallback;
    return {session:lesson.session || fallback.session, stage:displayStage(lesson.stage)};
  }

  function buildManualPrompt(request) {
    return studyPrompt({
      packFingerprint:request.packFingerprint,
      context:request.context,
      mode:request.mode,
      messages:request.messages,
    });
  }

  function connectionCopy() {
    if (!connection.checked) return connection.message;
    if (connection.available) return connection.message;
    return `${connection.message} You can still copy the bounded prompt below into a chat you choose.`;
  }

  function contextDisclosure(record) {
    const retained = record.state.messages.length;
    const sent = studyMessages(record.state.messages).length;
    const omitted = Math.max(0, retained - sent);
    const discarded = record.state.discardedMessages;
    const parts = retained
      ? [`The latest ${sent} of ${retained} retained message${retained === 1 ? '' : 's'} will be sent.`]
      : ['No earlier messages will be sent.'];
    if (omitted) parts.push(`${omitted} older retained message${omitted === 1 ? ' is' : 's are'} excluded from model context.`);
    if (discarded) parts.push(`${discarded} earlier message${discarded === 1 ? ' was' : 's were'} discarded at the local transcript limit.`);
    parts.push('Only the displayed lesson context, pack fingerprint, selected mode, and recent messages are shared. Notebook, practice, focus, paths, answer keys, and full packs are excluded.');
    return parts.join(' ');
  }

  function manualRequest(record, session, stage) {
    if (record.manualPrompt) return null;
    let messages = studyMessages(record.state.messages);
    if (record.state.draft.trim()) messages = studyMessages([...messages, {role:'user', content:record.state.draft.trim()}]);
    if (!messages.length || messages.at(-1).role === 'assistant') {
      messages = studyMessages([...messages, {role:'user', content:'Help me study this lesson in the selected mode. Start with one focused question.'}]);
    }
    return {
      packFingerprint,
      context:studyContext(session, stage),
      mode:record.state.mode,
      messages,
    };
  }

  function availableManualPrompt(record, session, stage) {
    if (record.manualPrompt) return record.manualPrompt;
    if (!connection.checked || connection.available) return '';
    return buildManualPrompt(manualRequest(record, session, stage));
  }

  function messageElement(message) {
    const article = document.createElement('article');
    article.className = `study-chat-message ${message.role}`;
    const label = document.createElement('strong');
    label.textContent = message.role === 'assistant' ? 'Padipps Study' : 'You';
    const body = document.createElement('p');
    body.textContent = message.content;
    article.append(label, body);
    return article;
  }

  function render() {
    if (!currentId || !sessionMap.has(currentId)) { root.hidden = true; return; }
    const record = recordFor(currentId);
    const {session, stage} = currentLesson();
    const previousComposer = root.querySelector('#study-chat-composer');
    const restoreComposer = document.activeElement === previousComposer;
    const selection = restoreComposer ? [previousComposer.selectionStart, previousComposer.selectionEnd] : null;
    const pending = Boolean(record.request);
    const fallbackPrompt = availableManualPrompt(record, session, stage);
    const sharedContext = record.request?.context
      || (record.manualPrompt ? record.retryRequest?.context : null)
      || studyContext(session, stage);
    root.hidden = !open;
    root.dataset.lessonId = currentId;
    root.innerHTML = `
      <div class="study-chat-head">
        <div><span class="study-chat-kicker">Optional lesson conversation</span><h2>Padipps Study</h2></div>
        <button type="button" class="text-button study-chat-close" data-chat-action="close" aria-label="Close conversation">Close</button>
      </div>
      <p class="study-chat-lesson"></p>
      <details class="study-chat-context"><summary>Exact lesson context shared with the tutor</summary><pre></pre></details>
      <div class="study-chat-modes" role="group" aria-label="Tutor mode"></div>
      <div class="study-chat-transcript" role="log" aria-live="polite" aria-label="Conversation messages"></div>
      <div class="study-chat-pending" role="status" ${pending ? '' : 'hidden'}><span class="pending-mark" aria-hidden="true"></span><span>Padipps Study is thinking…</span><button type="button" class="text-button" data-chat-action="stop">Stop</button></div>
      <div class="study-chat-error" role="alert" ${record.failure || record.problem ? '' : 'hidden'}></div>
      <form class="study-chat-form">
        <label for="study-chat-composer">Your question or explanation</label>
        <textarea id="study-chat-composer" name="message" rows="4" maxlength="12000" placeholder="Ask why, explain it back, or test a new case."></textarea>
        <p class="study-chat-network">Send is available only from an explicitly enabled loopback server. It uses that computer's existing Codex sign-in; this page never asks for credentials.</p>
        <div class="study-chat-send"><span class="study-chat-save" role="status"></span><button type="submit" class="btn primary" ${pending ? 'disabled' : ''}>Send</button></div>
      </form>
      <p class="study-chat-disclosure"></p>
      <div class="study-chat-fallback" ${fallbackPrompt ? '' : 'hidden'}>
        <label for="study-chat-copy-prompt">Manual fallback prompt</label>
        <textarea id="study-chat-copy-prompt" readonly rows="7"></textarea>
        <button type="button" class="btn compact" data-chat-action="copy">Copy prompt</button>
      </div>
      <div class="study-chat-foot">
        <span class="study-chat-connection"></span>
        <span class="study-chat-boundary">Chat cannot change practice, notebook, focus, or evidence records. Record any help used in a separate attempt honestly.</span>
        <div><button type="button" class="text-button" data-chat-action="export-json">Export archival JSON</button><button type="button" class="text-button" data-chat-action="export-markdown">Export Markdown</button>${record.recoveryRaw ? '<button type="button" class="text-button" data-chat-action="export-recovery">Export unreadable original</button>' : ''}</div>
      </div>`;

    root.querySelector('.study-chat-lesson').textContent = `${session.title} · ${MODE_COPY[record.state.mode][0]}`;
    root.querySelector('.study-chat-context pre').textContent = JSON.stringify(sharedContext, null, 2);
    const modeGroup = root.querySelector('.study-chat-modes');
    for (const mode of CHAT_MODES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.chatMode = mode;
      button.setAttribute('aria-pressed', String(record.state.mode === mode));
      button.innerHTML = `<strong>${MODE_COPY[mode][0]}</strong><span>${MODE_COPY[mode][1]}</span>`;
      modeGroup.append(button);
    }
    const transcript = root.querySelector('.study-chat-transcript');
    if (!record.state.messages.length) {
      const empty = document.createElement('p');
      empty.className = 'study-chat-empty';
      empty.textContent = 'Start with the exact point that feels unclear. This conversation changes no study record.';
      transcript.append(empty);
    } else record.state.messages.forEach(message => transcript.append(messageElement(message)));
    root.querySelector('#study-chat-composer').value = record.state.draft;
    root.querySelector('.study-chat-disclosure').textContent = contextDisclosure(record);
    root.querySelector('.study-chat-connection').textContent = connectionCopy();
    const error = root.querySelector('.study-chat-error');
    error.textContent = [record.failure, record.problem].filter(Boolean).join(' ');
    if (record.failure && !pending) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'text-button';
      retry.dataset.chatAction = 'retry';
      retry.textContent = connection.available ? 'Retry response' : 'Refresh connection';
      error.append(' ', retry);
    }
    if (fallbackPrompt) root.querySelector('#study-chat-copy-prompt').value = fallbackPrompt;
    root.querySelector('.study-chat-save').textContent = record.problem ? 'In this tab only · export available' : 'Draft saved for this pack revision and lesson';
    requestAnimationFrame(() => {
      transcript.scrollTop = transcript.scrollHeight;
      if (restoreComposer) {
        const composer = root.querySelector('#study-chat-composer');
        composer?.focus({preventScroll:true});
        composer?.setSelectionRange(selection[0], selection[1]);
      }
    });
  }

  function attach(lessonId, {openPanel = false} = {}) {
    if (!sessionMap.has(lessonId)) return;
    currentId = lessonId;
    if (openPanel) open = true;
    const slot = document.querySelector(`[data-study-chat-slot="${CSS.escape(lessonId)}"]`);
    (slot || host)?.append(root);
    render();
    document.querySelectorAll(`[data-study-chat="${CSS.escape(lessonId)}"]`).forEach(button => button.setAttribute('aria-expanded', String(open)));
    if (openPanel) requestAnimationFrame(() => root.querySelector('#study-chat-composer')?.focus());
  }

  function requestSnapshot(lessonId) {
    const record = recordFor(lessonId);
    const lesson = getLessonState?.(lessonId) || {session:sessionMap.get(lessonId), stage:0};
    return {
      id:`request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      packFingerprint,
      context:studyContext(lesson.session || sessionMap.get(lessonId), displayStage(lesson.stage)),
      mode:record.state.mode,
      messages:studyMessages(record.state.messages),
      controller:new AbortController(),
    };
  }

  async function requestResponse(request) {
    const record = recordFor(request.context.lessonId);
    if (record.request) return;
    record.request = request;
    record.failure = '';
    record.manualPrompt = '';
    if (currentId === request.context.lessonId) render();
    await statusPromise;
    if (record.request?.id !== request.id) return;
    if (!connection.available || !apiEndpoint) {
      record.failure = 'Interactive local chat is unavailable. Your message remains in this conversation.';
      record.manualPrompt = buildManualPrompt(request);
      record.retryRequest = request;
      record.request = null;
      if (currentId === request.context.lessonId) render();
      return;
    }
    try {
      const response = await fetch(apiEndpoint, {
        method:'POST',
        headers:{'Content-Type':'application/json', 'X-Padipps-Chat':'1', Accept:'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({packFingerprint:request.packFingerprint, context:request.context, mode:request.mode, messages:request.messages}),
        signal:request.controller.signal,
      });
      let value = null;
      try { value = await response.json(); } catch {}
      if (!response.ok) throw new Error(value?.error || 'The local model connection could not answer.');
      if (!value || typeof value.reply !== 'string' || !value.reply.trim()
        || Array.from(value.reply).length > 4_000 || value.provider !== 'codex') {
        throw new Error('The local model connection returned an invalid response.');
      }
      record.state = appendMessage(record.state, 'assistant', value.reply);
      persist(record);
      record.retryRequest = null;
      connection = {checked:true, available:true, provider:'codex', model:typeof value.model === 'string' ? value.model : connection.model, message:`Codex answered through this computer's existing sign-in${typeof value.model === 'string' ? ` · ${value.model}` : ''}.`};
      announce('Padipps Study answered.');
    } catch (error) {
      if (record.request?.id !== request.id) return;
      record.failure = error?.name === 'AbortError'
        ? 'Response stopped. Your question remains in the conversation.'
        : error?.message || 'The local model connection could not answer.';
      record.manualPrompt = buildManualPrompt(request);
      record.retryRequest = request;
    } finally {
      if (record.request?.id === request.id) record.request = null;
      if (currentId === request.context.lessonId) render();
    }
  }

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-study-chat]');
    if (!opener) return;
    event.preventDefault();
    lastOpener = opener;
    attach(opener.dataset.studyChat, {openPanel:true});
    opener.setAttribute('aria-expanded', 'true');
  });

  root.addEventListener('input', event => {
    if (event.target.id !== 'study-chat-composer' || !currentId) return;
    const record = recordFor(currentId);
    try { record.state = updateDraft(record.state, event.target.value); persist(record); }
    catch (error) { record.problem = error.message; }
    const status = root.querySelector('.study-chat-save');
    if (status) status.textContent = record.problem ? 'In this tab only · export available' : 'Draft saved for this pack revision and lesson';
    const copyField = root.querySelector('#study-chat-copy-prompt');
    if (copyField && connection.checked && !connection.available) {
      const {session, stage} = currentLesson();
      copyField.value = availableManualPrompt(record, session, stage);
    }
  });

  root.addEventListener('submit', event => {
    event.preventDefault();
    if (!currentId) return;
    const record = recordFor(currentId);
    if (record.request) return;
    const text = record.state.draft.trim();
    if (!text) { record.failure = 'Write a question or explanation before sending.'; render(); return; }
    try {
      record.state = appendMessage(record.state, 'user', text);
      persist(record);
      requestResponse(requestSnapshot(currentId));
      requestAnimationFrame(() => root.querySelector('#study-chat-composer')?.focus({preventScroll:true}));
    } catch (error) { record.failure = error.message; render(); }
  });

  root.addEventListener('click', async event => {
    const mode = event.target.closest('[data-chat-mode]')?.dataset.chatMode;
    const currentRecord = currentId ? recordFor(currentId) : null;
    if (mode && !currentRecord?.request) {
      currentRecord.state = changeMode(currentRecord.state, mode);
      persist(currentRecord);
      currentRecord.failure = '';
      currentRecord.manualPrompt = '';
      render();
      requestAnimationFrame(() => root.querySelector(`[data-chat-mode="${mode}"]`)?.focus({preventScroll:true}));
      return;
    }
    const action = event.target.closest('[data-chat-action]')?.dataset.chatAction;
    if (!action) return;
    const record = recordFor(currentId);
    const session = sessionMap.get(currentId);
    if (action === 'close') {
      open = false;
      root.hidden = true;
      const openers = document.querySelectorAll(`[data-study-chat="${CSS.escape(currentId)}"]`);
      openers.forEach(button => button.setAttribute('aria-expanded', 'false'));
      (lastOpener?.isConnected ? lastOpener : openers[0])?.focus();
      return;
    }
    if (action === 'stop' && record.request) {
      const request = record.request;
      request.controller.abort();
      record.failure = 'Response stopped. Your question remains in the conversation.';
      record.manualPrompt = buildManualPrompt(request);
      record.retryRequest = request;
      record.request = null;
      render();
      return;
    }
    if (action === 'retry') {
      if (!connection.available) { await refreshConnection(); return; }
      if (record.retryRequest) {
        const retry = {...record.retryRequest, id:`request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, controller:new AbortController()};
        requestResponse(retry);
      }
      return;
    }
    if (action === 'copy') {
      const field = root.querySelector('#study-chat-copy-prompt');
      try { await navigator.clipboard.writeText(field.value); announce('Conversation prompt copied.'); }
      catch { field.focus(); field.select(); announce('Select and copy the conversation prompt.'); }
      return;
    }
    const suffix = packFingerprint.slice(0, 12);
    if (action === 'export-json') download(`padipps-conversation-${currentId}-${suffix}.json`, conversationExport(record.state), 'application/json');
    if (action === 'export-markdown') download(`padipps-conversation-${currentId}-${suffix}.md`, conversationMarkdown(record.state, session.title), 'text/markdown');
    if (action === 'export-recovery') download(`padipps-conversation-${currentId}-${suffix}-unreadable.txt`, record.recoveryRaw, 'text/plain');
  });

  window.addEventListener('storage', event => {
    const entry = [...records.entries()].find(([lessonId]) => event.key === namespace + conversationKey(packFingerprint, lessonId));
    if (!entry) return;
    const [lessonId, record] = entry;
    if (event.newValue === record.raw) return;
    const expected = {packFingerprint, lessonId};
    const incoming = event.newValue === null ? null : parseConversation(event.newValue, expected);
    const existing = record.raw === null ? null : parseConversation(record.raw, expected);
    if (incoming?.ok && existing?.ok && sameConversationContent(incoming.state, existing.state)) {
      record.raw = event.newValue;
      return;
    }
    record.conflict = true;
    record.problem = 'Another tab changed this conversation. Saving is paused; export this tab before reloading.';
    if (currentId === lessonId) render();
  });

  return {
    sync(lessonId) {
      if (!lessonId) { currentId = ''; open = false; root.hidden = true; host?.append(root); return; }
      attach(lessonId);
    },
    open(lessonId) { attach(lessonId, {openPanel:true}); },
  };
}
