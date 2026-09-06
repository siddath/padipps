import { PACK, SESSIONS, FIRST_SESSION, PACK_ERROR, PACK_FINGERPRINT } from './content.js';
import { encodeBackup, decodeBackup } from './backup-engine.js';
import { catalogForPack } from './catalog.js';
import { notebookPage, emptyNote } from './notebook-ui.js';
import { setupMotion } from './motion.js';
import { setupFocus } from './focus-ui.js';
import { setupPacks } from './packs-ui.js';
import { setupStudyChat } from './chat-ui.js';
import { STORAGE_KEY, freshState, loadState, saveState, parseImport, mergeStates, makeDraft, elapsedMs, pauseTimer, finishAttempt, dueReviews, recommend, markdownExport, saveNotebookNote, notebookMarkdown, isNoteDraftDirty } from './engine.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const now = () => new Date().toISOString();
const date = value => new Date(value).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
const minutes = value => `${Math.floor(value / 60000)}m ${Math.floor(value / 1000) % 60}s`;
const clockText = value => `${String(Math.floor(value / 60000)).padStart(2,'0')}:${String(Math.floor(value / 1000) % 60).padStart(2,'0')}`;
const qaParams = new URLSearchParams(location.search);
const qaMode = qaParams.has('qa');
const qaFault = qaMode && /^[A-Za-z0-9._-]{1,64}$/.test(qaParams.get('fault') || '') ? qaParams.get('fault') : '';
const packId = String(PACK?.id || 'default');
export const STORAGE_NAMESPACE = `${qaMode ? `padipps-qa:${qaFault ? `${qaFault}:` : ''}` : ''}padipps:${packId}:${PACK_FINGERPRINT}:`;
const backupContext = {packId, fingerprint:PACK_FINGERPRINT};
const fullStorageKey = `${STORAGE_NAMESPACE}${STORAGE_KEY}`;

let baseStorage, storage;
try {
  baseStorage = window.localStorage;
  storage = {
    getItem: key => baseStorage.getItem(`${STORAGE_NAMESPACE}${key}`),
    setItem: (key, value) => baseStorage.setItem(`${STORAGE_NAMESPACE}${key}`, value),
    removeItem: key => baseStorage.removeItem(`${STORAGE_NAMESPACE}${key}`)
  };
  if (qaFault === 'corrupt' && storage.getItem(STORAGE_KEY) === null) storage.setItem(STORAGE_KEY, '{Padipps: corrupt JSON');
  if (qaFault === 'focus-corrupt' && storage.getItem('padipps-focus-v1') === null) storage.setItem('padipps-focus-v1', '{Padipps: corrupt focus JSON');
  if (qaFault === 'blocked') storage = { getItem(){ throw Error('QA storage blocked'); }, setItem(){ throw Error('QA storage blocked'); }, removeItem(){ throw Error('QA storage blocked'); } };
  if (qaFault === 'quota') storage = { ...storage, setItem(){ throw new DOMException('QA quota exhausted', 'QuotaExceededError'); } };
} catch { storage = null; }

const motion = setupMotion(storage);
const loaded = loadState(storage);
let state = loaded.state;
let storageProblem = ['blocked','corrupt'].includes(loaded.status) ? loaded.message : '';
let recoveryRaw = loaded.raw || '';
let currentRoute = '', feedback = '', practiceFilter = 'all', practiceQuery = '', historyTab = 'review', pendingImport = null, importMessage = '', lastClosed = null, multiTabConflict = false, hasSaved = loaded.status === 'ok';
let noteQuery = '', noteFilter = 'all', noteMessage = '', focusNote = false;
const steps = ['Recognise','Understand','Explain back','Practise','Review'];
const tracks = catalogForPack(PACK);
const sessionById = id => SESSIONS.find(session => session.id === id);
function readPracticeRoute(hash = location.hash) {
  const raw = String(hash || '#today').replace(/^#/, '');
  const [route = 'today', search = ''] = raw.split('?', 2);
  const params = new URLSearchParams(search);
  const requestedTrack = params.get('track');
  return {
    route,
    track: tracks.some(track => track.id === requestedTrack) ? requestedTrack : 'all',
    query: String(params.get('q') || '').slice(0, 160)
  };
}
function practiceHash(track = 'all', query = '') {
  const params = new URLSearchParams();
  if (track !== 'all' && tracks.some(item => item.id === track)) params.set('track', track);
  if (query) params.set('q', String(query).slice(0, 160));
  const search = params.toString();
  return `#practice${search ? `?${search}` : ''}`;
}
function practiceSessions(trackId, query = '') {
  const sessions = tracks.find(track => track.id === trackId)?.sessions || [];
  const needle = String(query).trim().toLowerCase();
  if (!needle) return sessions;
  return sessions.filter(session => [session.title, session.category, session.capability, session.task].filter(value => typeof value === 'string').join(' ').toLowerCase().includes(needle));
}

function knownState(candidate) {
  const errors = [];
  for (const [id, draft] of Object.entries(candidate.drafts || {})) {
    const session = sessionById(id);
    if (!session) { errors.push(`Unknown session: ${id}.`); continue; }
    if (draft.traceIndex > session.trace.length) errors.push(`Trace is out of range: ${id}.`);
    if (draft.stage >= 1 && !draft.evidence.foundationStop && !draft.recognitionCorrect) errors.push(`Recognition gate missing: ${id}.`);
    if (draft.stage >= 2 && !draft.evidence.foundationStop && (!draft.decisionCorrect || draft.traceIndex < session.trace.length)) errors.push(`Trace/decision gate missing: ${id}.`);
    if (draft.stage >= 3 && !draft.evidence.foundationStop && (!draft.explanation.trim() || !session.checklist.every((_, index) => draft.selfCheck[index] === true))) errors.push(`Explain-back self-check missing: ${id}.`);
  }
  for (const attempt of candidate.attempts || []) {const s=sessionById(attempt.sessionId);if(!s || attempt.home!==s.home || attempt.capability!==s.capability || JSON.stringify(attempt.lenses)!==JSON.stringify(s.lenses))errors.push(`Attempt metadata does not match this pack: ${attempt.sessionId}.`);}
  for(const note of [...(candidate.notes || []), ...(candidate.noteDraft?[candidate.noteDraft]:[])])if(note.sessionId&&!sessionById(note.sessionId))errors.push(`Note references an unknown session: ${note.sessionId}.`);
  return errors;
}
if (knownState(state).length) {
  recoveryRaw = JSON.stringify(state);
  state = freshState();
  storageProblem = 'Saved work does not match this study pack. Export recovery data before importing a compatible backup.';
}
for (const [id, draft] of Object.entries(state.drafts || {})) if (draft.timerRunningSince !== null) state.drafts[id] = pauseTimer(draft, Math.max(draft.timerRunningSince, Date.parse(draft.updatedAt)));

function announce(message) { $('#announcement').textContent = message; }
const focusRoom = setupFocus({
  storage,
  sessions: SESSIONS,
  qa: qaMode,
  namespace: STORAGE_NAMESPACE,
  backupContext,
  onChange() { if (['focus', 'today'].includes(currentRoute)) render(false); else focusRoom.afterRender(); },
  announce,
  download
});
const packUI = setupPacks({
  download,
  announce,
  onChange() { render(false); },
  beforeSwitch() {
    pauseAll();
    if (storageProblem || multiTabConflict || recoveryRaw) return 'Back up or recover this notebook before switching study packs.';
    if (focusRoom.isRunning()) return 'Pause your focus timer before switching study packs.';
    return '';
  }
});
const studyChat = setupStudyChat({
  storage,
  namespace:STORAGE_NAMESPACE,
  sessions:SESSIONS,
  packFingerprint:PACK_FINGERPRINT,
  getLessonState(id) { return {session:sessionById(id), stage:state.drafts[id]?.stage ?? 0}; },
  announce,
  download,
});
function storageUI() {
  $('#save-status').textContent = storageProblem ? 'Unsaved · export to keep work' : hasSaved ? 'Saved in this browser' : 'Local notebook · ready';
  $('#storage-alert').hidden = !storageProblem;
  $('#storage-alert').innerHTML = storageProblem ? `${esc(storageProblem)} Work can continue in memory. <a href="#storage">Back up or recover your notebook</a>.` : '';
  $('#due-count').textContent = dueReviews(state).length || '';
}
function persist() {
  state.updatedAt = now();
  if (multiTabConflict || recoveryRaw) { storageUI(); return false; }
  const result = saveState(storage, state);
  storageProblem = result.ok ? '' : result.message;
  if (result.ok) hasSaved = true;
  storageUI();
  return result.ok;
}
function touch(draft) { draft.updatedAt = now(); persist(); }
function download(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function goto(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function pageHeading(title, text) { return `<h1>${esc(title)}</h1>${text ? `<p class="intro">${esc(text)}</p>` : ''}`; }
function taskText(session) {
  if (typeof session.task === 'string') return session.task;
  if (session.task && typeof session.task === 'object') return session.task.description || session.task.prompt || session.task.title || '';
  return '';
}
function startSession(id, reviewOf) {
  const session = sessionById(id); if (!session) return;
  if (!state.drafts[id]) state.drafts[id] = makeDraft(id);
  if (reviewOf && !state.drafts[id].evidence.reviewOf) state.drafts[id].evidence.reviewOf = reviewOf;
  touch(state.drafts[id]); feedback = ''; goto(`#session/${id}`);
}
function sessionRow(session, detail) {
  const draft = state.drafts[session.id];
  return `<div class="session-row" data-session="${esc(session.id)}"><span class="row-type">${esc(session.category || 'Practice')}</span><div class="row-main"><h3>${esc(session.title)}</h3><p>${esc(detail || session.capability || taskText(session))}${draft ? ` · Draft: ${esc(steps[draft.stage])}` : ''}</p></div><button class="btn" data-start="${esc(session.id)}">${draft ? 'Resume' : 'Start'} <span class="action-arrow" aria-hidden="true">→</span></button></div>`;
}
function packAlert() { return PACK_ERROR ? `<div class="note warning" role="alert"><strong>This pack needs attention.</strong> ${esc(PACK_ERROR)} You can still use the available sessions and save local work.</div>` : ''; }
function today() {
  const recommendation = recommend(state, [sessionById(FIRST_SESSION), ...SESSIONS.filter(s=>s.id!==FIRST_SESSION)].filter(Boolean));
  const session = sessionById(recommendation.sessionId) || sessionById(FIRST_SESSION) || SESSIONS[0];
  if (!session) return `${pageHeading('No sessions are available yet.','Choose a study pack when one is ready.')}<a class="button-link primary" href="#packs">Study packs →</a>`;
  const draft = state.drafts[session.id];
  const reason = recommendation.kind === 'draft' ? (storageProblem ? 'Your draft is in this tab. Pick up here, then export to keep it.' : 'Your notes and place are saved. Pick up where you left off.') : recommendation.kind === 'review' ? 'An earlier attempt is ready for another retrieval. Try it before opening the model.' : state.attempts.length ? 'Build on the evidence you have. The next block stays small.' : 'Start with one small model, then make work you can inspect.';
  return `${packAlert()}${pageHeading('Make time for understanding.','One small model, your own work, and an honest return to the gap.')}<div class="today-layout"><section class="next-session" aria-label="Your next session"><span class="pill">${recommendation.kind === 'draft' ? 'Continue your draft' : recommendation.kind === 'review' ? 'Ready for retrieval' : 'Start here'} · ${esc(session.category || 'Practice')}</span><h2>${esc(session.title)}</h2><p class="description">${esc(reason)}</p><div class="session-meta"><span>${draft ? esc(steps[draft.stage]) : 'Foundation check first'}</span><span>Practice starts untimed</span></div><div class="actions"><button class="btn primary" data-start="${esc(session.id)}" ${recommendation.reviewOf ? `data-review-of="${esc(recommendation.reviewOf)}"` : ''}>${draft ? 'Resume session' : 'Begin this block'} <span class="action-arrow" aria-hidden="true">→</span></button><button class="btn quiet" data-study-chat="${esc(session.id)}" aria-controls="study-chat-root" aria-expanded="false">Ask Padipps Study</button></div><p class="fine">Chatting about this lesson does not start a practice draft or alter any study record.</p>${draft ? `<button class="text-button" data-action="park-draft" data-park-id="${esc(session.id)}">Park this draft for later</button>` : ''}<div class="study-chat-slot" data-study-chat-slot="${esc(session.id)}"></div></section><aside class="loop-note"><h3>The practice loop</h3><ol><li data-n="1"><strong>Recognise & understand</strong>A small model. One decision.</li><li data-n="2"><strong>Explain it yourself</strong>Close the model. Rebuild it.</li><li data-n="3"><strong>Make & test</strong>Your editor. Your artifact.</li><li data-n="4"><strong>Record & return</strong>What happened. What comes next.</li></ol><p class="fine">A local guide. No automatic grading.</p></aside></div>${focusRoom.entry()}<section class="section"><div class="section-heading"><h2>Your evidence so far</h2><a href="#history">Open your record →</a></div>${state.attempts.length ? `<div class="stats-line"><span><strong>${state.attempts.length}</strong> recorded attempts</span><span><strong>${state.attempts.filter(attempt => attempt.review).length}</strong> with recorded reviewer feedback</span><span><strong>${dueReviews(state).length}</strong> ready to retrieve</span></div><p class="fine">Outcomes remain self-reported. Named reviewer feedback is a separate record.</p>` : `<div class="empty"><h3>No completed practice recorded here yet.</h3><p>Reading and checkboxes do not fill this space; your attempt and its evidence will.</p></div>`}</section><section class="section"><div class="section-heading"><h2>Explore this pack</h2><a href="#practice">Browse practice →</a></div><div class="row-list">${SESSIONS.slice(0, 3).map(session => sessionRow(session)).join('')}</div></section>`;
}
function practice() {
  const track = tracks.find(item => item.id === practiceFilter) || tracks[0];
  const list = practiceSessions(track.id, practiceQuery);
  const all = practiceSessions(track.id);
  return `${packAlert()}<div class="page-top"><div><p class="page-kicker">${esc(PACK?.title || 'Study pack')}</p><h1>Practice library</h1><p class="intro">Choose a focused exercise, make your own attempt, then record what happened.</p></div><span class="library-count">${SESSIONS.length} sessions · ${Math.max(0, tracks.length - 1)} tracks</span></div><div class="filterbar" aria-label="Filter practice">${tracks.map(item => `<button data-filter="${esc(item.id)}" aria-pressed="${track.id === item.id}">${esc(item.title)} <span class="filter-count">${practiceSessions(item.id).length}</span></button>`).join('')}</div><section class="track-context"><div><h2>${esc(track.title)}</h2><p>${esc(track.description || 'Sessions in this study pack.')}</p></div><form id="practice-search-form" class="search-form"><label class="sr-only" for="practice-search">Search this track</label><input type="search" id="practice-search" name="query" value="${esc(practiceQuery)}" placeholder="Search this track" maxlength="160"><button class="btn" type="submit">Find</button></form></section><div class="result-heading"><p id="practice-result-count" role="status">${list.length} of ${all.length} sessions${practiceQuery ? ` matching “${esc(practiceQuery)}”` : ''}</p>${practiceQuery ? '<button class="text-button" data-action="clear-search">Clear search</button>' : ''}</div><div id="practice-results" class="row-list">${list.length ? list.map(session => sessionRow(session)).join('') : '<div class="empty"><h3>No session matches this search.</h3><p>Try a shorter term or clear the search to return to this track.</p></div>'}</div>`;
}
function choices(session, type, draft) {
  const decision = type === 'decision', question = decision ? session.decision : session;
  return `<div class="choices" role="group" aria-label="${decision ? 'Trace decision' : 'Recognition options'}">${question.options.map((value, index) => `<button class="choice" data-choice="${index}" data-choice-type="${type}" ${decision ? draft.decisionCorrect ? 'disabled' : '' : draft.recognitionCorrect ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span>${esc(value)}</button>`).join('')}</div>`;
}
function hint(session, draft) { return `<div class="hint-area"><button class="text-button" data-action="hint">${draft.hintShown ? 'Hide the hint' : 'I need a small hint'}</button>${draft.hintShown ? `<div class="note">${esc(session.feedback)}</div>` : ''}</div>`; }
function feedbackBlock() { return feedback ? `<div class="feedback ${feedback.startsWith('Correct') ? 'success' : 'error'}" role="status">${esc(feedback)}</div>` : ''; }
function sourceAside(session, draft) {
  const sources = Array.isArray(session.sources) ? session.sources : [];
  return `<aside class="lesson-aside"><div><h3>What this block produces</h3><p>${esc(draft.stage === 0 ? 'Recognise, explain, and test a new example.' : session.capability || taskText(session))}</p><p>An independently made attempt or an honestly recorded miss.</p><hr class="divider"><p><strong>${draft.hints}</strong> hint reveals · <strong>${draft.recognitionTries + draft.decisionTries}</strong> choice attempts</p><p>Explain-back is your self-check. This guide cannot verify understanding.</p></div><div>${session.prerequisites.length?`<h3>Earlier skills to check</h3><p>These are suggested foundations, not locks. If this diagnostic reveals a gap, return to one.</p><ul>${session.prerequisites.map(id=>`<li><button class="text-button" data-start="${esc(id)}">${esc(sessionById(id)?.title || id)}</button></li>`).join('')}</ul>`:''}<h3>Sources</h3>${sources.length ? `<ul>${sources.map(source => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label || source.url)}</a></li>`).join('')}</ul>` : '<p>No external source is required for this block.</p>'}<p>External references open only when you choose them. No notebook content is sent.</p>${draft.stage < 4 ? `<button class="text-button" data-action="foundation-stop">Record a miss and stop here</button><br><button class="text-button" data-action="park-draft" data-park-id="${esc(session.id)}">Park this draft for later</button>` : ''}</div></aside>`;
}
function handoff(session, draft) {
  const task = taskText(session);
  return `<h2>Now make it yours.</h2><p>${esc(task || 'Work independently in the environment you choose. Keep enough evidence to explain what you tried, what happened, and what you would change.')}</p><p class="fine">Use your own tools and record only evidence you can stand behind. This app does not open files, run commands, or inspect your work.</p><h3 class="section">Your review rubric</h3><ul class="rubric">${(session.rubric || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul><div class="timer"><time id="clock" aria-label="Elapsed practice time">${clockText(elapsedMs(draft))}</time><button class="btn" data-action="timer">${draft.timerRunningSince !== null ? 'Pause timer' : draft.practiceStarted ? 'Resume timer' : 'Start practice timer'}</button><button class="text-button" data-action="timer-reset">Reset clock</button></div><p class="fine">The optional clock pauses when this page closes or reloads. It is a reference, not a score or a deadline.</p><div class="actions"><button class="btn" data-action="untimed">${draft.practiceStarted ? 'Continue without the clock' : 'Begin untimed practice'}</button><button class="btn primary" data-action="to-evidence" ${draft.practiceStarted ? '' : 'disabled'}>I’m back — record what happened →</button></div>`;
}
function defaultReview(session) {
  const prior = state.attempts.filter(attempt => attempt.sessionId === session.id);
  const last = prior.at(-1);
  return !last || last.outcome !== 'independent' || last.confidence < 4 ? state.settings.reviewDays[0] : state.settings.reviewDays[Math.min(prior.length, state.settings.reviewDays.length - 1)];
}
function evidenceForm(session, draft) {
  const evidence = draft.evidence, stopped = !!evidence.foundationStop, canIndependent = draft.hints === 0 && draft.recognitionTries <= 1 && draft.decisionTries <= 1 && !stopped;
  return `<h2>${stopped ? 'Record the exact sticking point.' : 'What happened in your attempt?'}</h2><p>${stopped ? 'Stopping at a foundation gap is valid evidence. Name the gap without checking boxes you cannot support.' : 'Record the actual result. Passing your own checks is a self-report until someone reviews the artifact.'}</p><form id="evidence-form"><div class="form-grid"><label class="field">Outcome<select name="outcome" required><option value="missed" ${!evidence.outcome || evidence.outcome === 'missed' ? 'selected' : ''}>Missed / incomplete</option><option value="assisted" ${evidence.outcome === 'assisted' ? 'selected' : ''} ${stopped ? 'disabled' : ''}>Completed with assistance</option><option value="independent" ${evidence.outcome === 'independent' && canIndependent ? 'selected' : ''} ${canIndependent ? '' : 'disabled'}>Independently completed — self-reported</option></select></label><label class="field">Confidence (self-report)<select name="confidence">${[1,2,3,4,5].map(value => `<option value="${value}" ${Number(evidence.confidence || 2) === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label></div>${!canIndependent ? '<p class="fine">A hint, corrective answer, or incomplete foundation means this attempt cannot be labelled independent. Try again on a fresh retrieval.</p>' : ''}<label class="field">Your artifact or reference<textarea name="artifact" required maxlength="12000" placeholder="What you produced, or why nothing was produced.">${esc(evidence.artifact || '')}</textarea></label><label class="field">Tests or comparison evidence<textarea name="testEvidence" required maxlength="12000" placeholder="What you checked and what happened.">${esc(evidence.testEvidence || '')}</textarea></label><label class="field">Exact failure or remaining limitation<textarea name="failure" maxlength="12000" placeholder="Which input, assumption, or decision failed?">${esc(evidence.failure || '')}</textarea></label><label class="field">One lesson, in your words<textarea name="lesson" required maxlength="12000" placeholder="What you will do differently next time.">${esc(evidence.lesson || '')}</textarea></label><label class="field">Retrieve again in days<input type="number" min="0" max="365" step="1" name="nextReviewDays" value="${esc(evidence.nextReviewDays ?? defaultReview(session))}" required></label><p class="fine">0 means today. The saved interval ladder is an adjustable default, not a guarantee.</p>${feedbackBlock()}<div class="actions"><button class="btn primary" type="submit">Save this attempt →</button><button class="btn" type="button" data-action="back-practice">Keep working</button></div><p class="fine">This saves browser-local evidence. It does not publish, submit, or append an external log.</p></form>`;
}
function sessionPage(id) {
  const session = sessionById(id); if (!session) return pageHeading('Session not found.','Choose a session from Practice.');
  if (!state.drafts[id]) state.drafts[id] = makeDraft(id);
  const draft = state.drafts[id]; let body = '';
  if (draft.stage === 0) body = `<h2>First, recognise the shape.</h2><p class="prompt">${esc(session.prompt)}</p>${choices(session,'recognition',draft)}${feedbackBlock()}${hint(session,draft)}${draft.recognitionCorrect ? '<div class="actions"><button class="btn primary" data-action="to-model">Open the small model →</button></div>' : ''}`;
  if (draft.stage === 1) { const trace = session.trace[Math.min(draft.traceIndex, session.trace.length - 1)]; body = `<h2>A model you can rebuild.</h2><p>${esc(session.model)}</p><dl class="model-def"><dt>When it fits</dt><dd>${esc(session.trigger)}</dd><dt>When it does not</dt><dd>${esc(session.nonTrigger)}</dd><dt>The invariant</dt><dd>${esc(session.invariant)}</dd></dl><div class="trace"><span class="trace-counter">Trace ${Math.min(draft.traceIndex + 1, session.trace.length)} of ${session.trace.length}</span><pre>${esc(trace.code)}</pre><p>${esc(trace.note)}</p></div>${draft.traceIndex < session.trace.length ? `<button class="btn" data-action="trace-next">${draft.traceIndex === session.trace.length - 1 ? 'I traced it — try a new decision' : 'Trace the next step'} →</button>` : `<p class="prompt">${esc(session.decision.prompt)}</p>${choices(session,'decision',draft)}${feedbackBlock()}${draft.decisionCorrect ? '<div class="actions"><button class="btn primary" data-action="to-explain">Hide the model & explain →</button></div>' : ''}`}`; }
  if (draft.stage === 2) body = `<h2>The model is closed. Your turn.</h2><p class="prompt">${esc(session.explainPrompt)}</p><label class="field" for="explanation">Your unaided explanation<textarea id="explanation" maxlength="12000" rows="6" placeholder="Rebuild the idea in your own words.">${esc(draft.explanation)}</textarea></label><div class="checks">${session.checklist.map((item, index) => `<label class="check"><input type="checkbox" data-selfcheck="${index}" ${draft.selfCheck[index] ? 'checked' : ''}>${esc(item)}</label>`).join('')}</div><p class="fine">These checks are your judgment, not an automated score.</p>${feedbackBlock()}<div class="actions"><button class="btn primary" data-action="to-practice">Take it to independent practice →</button><button class="text-button" data-action="revisit-model">I need to revisit the model</button></div>`;
  if (draft.stage === 3) body = handoff(session, draft);
  if (draft.stage === 4) body = evidenceForm(session, draft);
  return `<div class="session-heading"><div><p class="eyebrow">${esc(session.category || 'Practice')}</p><h1>${esc(session.title)}</h1></div><div class="session-tools"><button class="text-button" data-study-chat="${esc(session.id)}" aria-controls="study-chat-root" aria-expanded="false">Study this lesson</button><button class="text-button" data-action="session-note" data-session-id="${esc(session.id)}">Write a note</button><button class="btn quiet" data-action="pause-leave">Save & leave</button></div></div><div class="progress-track" aria-hidden="true"><span class="progress-ink"></span></div><ol class="steps" aria-label="Session stages">${steps.map((step, index) => `<li data-stage="${index}" ${index === draft.stage ? 'aria-current="step"' : ''} class="${index < draft.stage ? 'done' : ''}">${index + 1}. ${step}</li>`).join('')}</ol><div class="lesson-layout"><section class="lesson-pane">${body}</section><div class="study-chat-slot" data-study-chat-slot="${esc(session.id)}"></div>${sourceAside(session,draft)}</div>`;
}
function reviewEntry(a){const s=sessionById(a.sessionId);return `<details class="history-entry"><summary>${esc(s?.title||a.sessionId)}<small>${date(a.completedAt)} · ${esc(a.outcome)} · self-reported · ${minutes(a.elapsedMs)}${a.review?' · reviewer feedback recorded':''}</small></summary><dl><dt>Artifact</dt><dd>${esc(a.artifact)}</dd><dt>Explanation</dt><dd>${esc(a.explanation)}</dd><dt>Test evidence</dt><dd>${esc(a.testEvidence)}</dd><dt>Failure / limit</dt><dd>${esc(a.failure||'None reported; not independently verified.')}</dd><dt>Lesson</dt><dd>${esc(a.lesson)}</dd><dt>Next retrieval</dt><dd>${date(a.nextReviewAt)} · ${esc(s?.reviewPrompt||'')}</dd><dt>Assistance</dt><dd>${a.hints} hint reveals; ${a.recognitionTries} recognition and ${a.decisionTries} decision tries</dd><dt>Study category</dt><dd>${esc(a.home)} · one attempt</dd><dt>Stable ID</dt><dd>${esc(a.id)}</dd>${a.review?`<dt>Reviewer</dt><dd>${esc(a.review.reviewer)} · ${date(a.review.reviewedAt)}<br>${esc(a.review.notes)}</dd>`:''}</dl><button class="btn" data-start="${a.sessionId}" data-review-of="${a.id}">Try a fresh retrieval →</button><details class="review-panel"><summary>Record actual reviewer feedback</summary><p class="fine">Use only feedback actually received after inspecting the artifact. This records provenance; it does not verify identity or mark mastery.</p><form data-review-form="${a.id}"><label class="field">Reviewer name and role<input name="reviewer" type="text" required maxlength="1000" value="${esc(a.review?.reviewer||'')}"></label><label class="field">What they checked, found and asked you to change<textarea name="notes" required maxlength="12000">${esc(a.review?.notes||'')}</textarea></label><button type="submit" class="btn compact">Save reviewer feedback</button></form></details></details>`;}
function history() {
  const due = dueReviews(state);
  return `${pageHeading('Keep the lesson. Return to the gap.','A missed attempt gives you a precise next move. There is no streak to protect.')}<div class="view-switch"><button data-history="review" aria-pressed="${historyTab === 'review'}">Retrieval queue (${due.length})</button><button data-history="attempts" aria-pressed="${historyTab === 'attempts'}">Attempts (${state.attempts.length})</button></div>${historyTab === 'review' ? (due.length ? due.map(attempt => `<section class="history-entry"><span class="pill">Ready to retrieve · ${date(attempt.nextReviewAt)}</span><h2 class="compact">${esc(sessionById(attempt.sessionId)?.title || attempt.sessionId)}</h2><p class="intro">${esc(attempt.failure || attempt.lesson)}</p><p>${esc(sessionById(attempt.sessionId)?.reviewPrompt || '')}</p><div class="actions"><button class="btn primary" data-start="${esc(attempt.sessionId)}" data-review-of="${esc(attempt.id)}">Try this retrieval →</button></div></section>`).join('') : `<div class="empty"><h3>No retrieval is due right now.</h3><p>${state.attempts.length ? 'Your next dates are in each attempt.' : 'Record an attempt and choose its next review. The queue grows from your work.'}</p></div>`) : (state.attempts.length ? [...state.attempts].reverse().map(reviewEntry).join('') : '<div class="empty"><h3>Your first attempt will go here.</h3><p>Drafts and viewed lessons remain introductions. Finish a practice attempt or record a foundation miss to create evidence.</p></div>')}`;
}
function storagePage() {
  const parked = Object.entries(state.legacyNotes || {}).filter(([key]) => key.startsWith('parked:'));
  const parkedSection = `<section class="notebook-section"><h2>Parked drafts</h2><p>Parked drafts stay local and do not decide Today until you restore one.</p>${parked.length ? parked.map(([key, draft]) => `<details class="compact"><summary>${esc(sessionById(draft?.sessionId)?.title || 'Saved draft')}</summary><p class="fine">${esc(steps[draft?.stage] || 'Draft')} · ${esc(draft?.updatedAt ? date(draft.updatedAt) : 'saved locally')}</p><button class="btn" data-action="restore-parked" data-note-key="${esc(key)}" ${state.drafts[draft?.sessionId] ? 'disabled' : ''}>Restore draft</button></details>`).join('') : '<p class="fine">No drafts are parked.</p>'}</section>`;
  return `${pageHeading('Back up your notebook.','Browser-local work can be lost when browser data is cleared or when the origin changes. Keep a portable backup.')}<section class="notebook-section"><h2>Back up or restore</h2><p>Exports include your explanations, references, and review notes. JSON restores this pack; Markdown is a reviewable export.</p><div class="actions"><button class="btn primary" data-action="export-json">Download notebook JSON</button><button class="btn" data-action="restore-backup">Preview last saved backup</button></div><label class="field" for="import-file">Import a Padipps notebook</label><input id="import-file" type="file" accept="application/json,.json"><p class="fine">Import is validated and merged by stable ID. Current conflicting entries and drafts stay in this browser.</p><div id="import-message" class="feedback" role="status">${esc(importMessage)}</div>${pendingImport ? `<div class="note import-preview">Valid notebook: ${pendingImport.attempts.length} attempts and ${Object.keys(pendingImport.drafts).length} drafts. Current work will be preserved.<div class="actions"><button class="btn" data-action="confirm-import">Merge this notebook</button><button class="text-button" data-action="cancel-import">Cancel</button></div></div>` : ''}${recoveryRaw ? `<div class="note warning compact">The unreadable original is preserved. Download it before recovering.<div class="actions"><button class="btn" data-action="raw-recovery">Download original recovery data</button><button class="btn" data-action="recover-storage">Archive original & save current notebook</button></div></div>` : ''}${multiTabConflict ? '<div class="note warning compact">Another tab changed this notebook. Export this tab’s work first, then reload and import the export to merge it.</div>' : ''}</section>${parkedSection}<section class="notebook-section"><h2>Reviewable export</h2><p>Review the export and your work before sharing it. A browser entry is not independently verified.</p><div class="actions"><button class="btn" data-action="preview-markdown">Preview Markdown</button><button class="btn" data-action="export-markdown">Download Markdown</button></div><div id="markdown-preview"></div></section><section class="notebook-section"><h2>Retrieval defaults</h2><p>Adjust the review ladder or set the next date when closing each attempt.</p><form id="settings-form"><label class="field">Day intervals, in ascending order<input name="reviewDays" type="text" value="${esc(state.settings.reviewDays.join(', '))}" required></label><button class="btn compact" type="submit">Save intervals</button><span id="settings-status" class="feedback" role="status"></span></form></section>`;
}
function about() { return `${pageHeading('A guide for the loop. You do the work.','Padipps is a local, rule-based practice guide.')}<section class="notebook-section"><h2>How Today chooses</h2><p>Today resumes the latest draft, then a due retrieval, then this pack’s first session. Recognition opens the model; explain-back closes it so you can reconstruct the idea.</p></section><section class="notebook-section"><h2>Privacy and evidence boundaries</h2><p>No account, cloud connection, model call, uploaded code, or automatic grading is required. Browser state is local to this origin and can be exported or restored by you.</p><p>Self-reported results, elapsed practice time, and notes remain distinct from independent review. This app does not publish or append records elsewhere.</p></section>`; }
function complete() { const attempt = lastClosed || state.attempts.at(-1); if (!attempt) return today(); const session = sessionById(attempt.sessionId); return `${pageHeading(storageProblem ? 'The attempt is in this tab. Back it up.' : 'The attempt is saved. The lesson stays.','You have a concrete result to return to.')}<section class="next-session"><span class="pill">${esc(attempt.outcome)} · self-reported</span><h2>${esc(session?.title || attempt.sessionId)}</h2><p>${esc(attempt.lesson)}</p><div class="checkpoint"><strong>Your next retrieval · ${date(attempt.nextReviewAt)}</strong><p>${esc(session?.reviewPrompt || '')}</p></div><div class="actions"><a class="button-link primary" href="#storage">Review export →</a><a class="button-link" href="#today">Back to Today</a></div><p class="fine">${storageProblem ? 'Local saving failed. Export your notebook to keep this attempt.' : 'Saved in this browser.'}</p></section>`; }
function render(focus = true, kind = 'view') {
  motion.beforeRender();
  if (focus) $('#announcement').textContent = '';
  const parsed = readPracticeRoute(location.hash); const route = parsed.route || 'today'; currentRoute = route; feedback = focus ? '' : feedback;
  if (route === 'practice') { practiceFilter = parsed.track; practiceQuery = parsed.query; }
  const nav = route.startsWith('session/') ? 'practice' : route === 'complete' ? 'history' : route === 'storage' ? 'notebook' : route;
  document.querySelectorAll('[data-nav]').forEach(link => link.setAttribute('aria-current', link.dataset.nav === nav ? 'page' : 'false'));
  $('#breadcrumb').textContent = route.startsWith('session/') ? 'Practice / focused session' : ({ today:'Your practice desk', focus:'Focus room', practice:'Practice library', packs:'Study packs', history:'Evidence & retrieval', notebook:'Your notebook', storage:'Backup & restore', about:'How this works', complete:'Session close' })[route] || 'Padipps';
  $('#main').innerHTML = route.startsWith('session/') ? sessionPage(route.slice(8)) : route === 'focus' ? focusRoom.page() : route === 'practice' ? practice() : route === 'packs' ? packUI.page() : route === 'history' ? history() : route === 'notebook' ? notebookPage(state, SESSIONS, { query:noteQuery, filter:noteFilter, message:noteMessage, storageProblem }) : route === 'storage' ? storagePage() : route === 'about' ? about() : route === 'complete' ? complete() : today();
  storageUI(); studyChat.sync(document.querySelector('[data-study-chat-slot]')?.dataset.studyChatSlot || ''); if (focus) { $('#main').focus({ preventScroll:true }); window.scrollTo(0, 0); } bindForms();
  focusRoom.afterRender(); focusRoom.update(); motion.afterRender(route,kind);
  if (route === 'packs') packUI.afterRender();
  if (route === 'notebook' && focusNote) { focusNote = false; $('#note-form [name=title]')?.focus(); }
}
function active() { if (!currentRoute.startsWith('session/')) return {}; const session = sessionById(currentRoute.slice(8)); return { session, draft:session && state.drafts[session.id] }; }
function rerenderSession() { render(false); }
function stage(draft, number) { draft.stage = number; feedback = ''; touch(draft); render(false); $('#main').focus({ preventScroll:true }); window.scrollTo(0, 0); }
function pauseAll() { for (const [id, draft] of Object.entries(state.drafts)) if (draft.timerRunningSince !== null) { state.drafts[id] = pauseTimer(draft); state.drafts[id].updatedAt = now(); } persist(); }

document.addEventListener('input', event => { const { draft } = active(); if (!draft) return; if (event.target.id === 'explanation') draft.explanation = event.target.value; if (event.target.closest('#evidence-form') && event.target.name) draft.evidence[event.target.name] = event.target.value; touch(draft); });
document.addEventListener('change', event => { const { draft } = active(); if (draft && event.target.dataset.selfcheck !== undefined) { draft.selfCheck[Number(event.target.dataset.selfcheck)] = event.target.checked; for (let index = 0; index < draft.selfCheck.length; index++) if (draft.selfCheck[index] === undefined) draft.selfCheck[index] = false; touch(draft); } });
document.addEventListener('click', event => {
  if (event.target.closest('a.skip')) { event.preventDefault(); $('#main').focus(); $('#main').scrollIntoView(); return; }
  const button = event.target.closest('[data-action],[data-start],[data-choice],[data-filter],[data-history]'); if (!button || button.disabled) return;
  if (button.dataset.start) { startSession(button.dataset.start, button.dataset.reviewOf); return; }
  if (button.dataset.filter) { practiceFilter = button.dataset.filter; practiceQuery = ''; window.history.replaceState(null, '', practiceHash(practiceFilter)); render(false,'filter'); document.querySelector(`[data-filter="${practiceFilter}"]`)?.focus(); announce($('#practice-result-count').textContent); return; }
  if (button.dataset.history) { historyTab = button.dataset.history; render(false); document.querySelector(`[data-history="${historyTab}"]`)?.focus(); return; }
  const { session, draft } = active();
  if (button.dataset.choice !== undefined && draft) { const decision = button.dataset.choiceType === 'decision', question = decision ? session.decision : session; draft[decision ? 'decisionTries' : 'recognitionTries']++; const correct = Number(button.dataset.choice) === question.answer; if (correct) draft[decision ? 'decisionCorrect' : 'recognitionCorrect'] = true; feedback = correct ? `Correct. ${decision ? question.feedback : 'You can now open the model and check why it works.'}` : `That choice does not hold. ${decision ? question.feedback : session.feedback}`; touch(draft); rerenderSession(); document.querySelector('[data-action=to-model],[data-action=to-explain]')?.focus(); announce(feedback); return; }
  switch (button.dataset.action) {
    case 'motion-toggle': motion.toggle(); focusRoom.update(); break;
    case 'clear-search': window.history.replaceState(null, '', practiceHash(practiceFilter)); render(false,'filter'); $('#practice-search')?.focus(); break;
    case 'export-notebook': download(`${packId}-notes.md`, notebookMarkdown(state, SESSIONS), 'text/markdown'); announce('Markdown notebook prepared.'); break;
    case 'session-notes': noteQuery = sessionById(button.dataset.sessionId)?.title || ''; noteFilter = 'all'; goto('#notebook'); break;
    case 'session-note':
    case 'new-note':
    case 'edit-note': {
      if (isNoteDraftDirty(state)) { noteMessage = 'Save your current note before opening another. Your draft is preserved.'; goto('#notebook'); break; }
      const note = state.notes?.find(item => item.id === button.dataset.noteId);
      state.noteDraft = note ? { id:note.id, sessionId:note.sessionId, title:note.title, body:note.body, status:note.status } : emptyNote(button.dataset.sessionId);
      persist(); noteMessage = ''; focusNote = true;
      if (currentRoute === 'notebook') render(false); else goto('#notebook');
      break;
    }
    case 'park-draft': { const parked = state.drafts[button.dataset.parkId]; if (parked) { state.legacyNotes = state.legacyNotes || {}; state.legacyNotes[`parked:${button.dataset.parkId}:${Date.now()}`] = pauseTimer(parked); delete state.drafts[button.dataset.parkId]; persist(); goto('#today'); announce('Draft parked. It remains internal to this notebook and no longer drives Today.'); } break; }
    case 'restore-parked': { const parked = state.legacyNotes?.[button.dataset.noteKey]; if (parked && !state.drafts[parked.sessionId]) { const candidate = structuredClone(state); candidate.drafts[parked.sessionId] = parked; const parsed = parseImport(JSON.stringify(candidate)); if (parsed.ok && !knownState(parsed.state).length) { state = parsed.state; state.drafts[parked.sessionId].updatedAt = now(); persist(); goto('#today'); announce('Parked draft restored.'); } } break; }
    case 'to-model': if (draft.recognitionCorrect) stage(draft, 1); break;
    case 'trace-next': draft.traceIndex = Math.min(draft.traceIndex + 1, session.trace.length); touch(draft); rerenderSession(); document.querySelector('[data-action=trace-next],[data-choice]')?.focus(); break;
    case 'to-explain': if (draft.decisionCorrect && draft.traceIndex >= session.trace.length) stage(draft, 2); break;
    case 'to-practice': if (!draft.explanation.trim() || !session.checklist.every((_, index) => draft.selfCheck[index])) { feedback = 'Write your explanation and complete each honest self-check, or record a miss.'; rerenderSession(); announce(feedback); } else stage(draft, 3); break;
    case 'hint': draft.hintShown = !draft.hintShown; if (draft.hintShown) draft.hints++; touch(draft); rerenderSession(); document.querySelector('[data-action=hint]')?.focus(); break;
    case 'revisit-model': draft.hints++; draft.hintShown = false; draft.selfCheck = []; stage(draft, 1); break;
    case 'timer': draft.practiceStarted = true; if (draft.timerRunningSince !== null) state.drafts[session.id] = pauseTimer(draft); else draft.timerRunningSince = Date.now(); touch(state.drafts[session.id]); rerenderSession(); break;
    case 'timer-reset': draft.evidence.clockResets = (Number(draft.evidence.clockResets) || 0) + 1; draft.elapsedMs = 0; draft.timerRunningSince = null; touch(draft); rerenderSession(); break;
    case 'untimed': state.drafts[session.id] = pauseTimer(draft); state.drafts[session.id].practiceStarted = true; touch(state.drafts[session.id]); rerenderSession(); break;
    case 'to-evidence': if (draft.practiceStarted) { state.drafts[session.id] = pauseTimer(draft); stage(state.drafts[session.id], 4); } break;
    case 'back-practice': if (draft.evidence.foundationStop) { delete draft.evidence.foundationStop; stage(draft, draft.recognitionCorrect ? draft.decisionCorrect ? 2 : 1 : 0); } else stage(draft, 3); break;
    case 'foundation-stop': draft.evidence.foundationStop = true; draft.evidence.outcome = 'missed'; draft.evidence.stoppedAtStage = draft.stage; state.drafts[session.id] = pauseTimer(draft); state.drafts[session.id].stage = 4; touch(state.drafts[session.id]); rerenderSession(); break;
    case 'pause-leave': pauseAll(); goto('#today'); break;
    case 'export-json': pauseAll(); download(`${packId}-notebook.json`, encodeBackup('notebook',backupContext,state)); announce('Notebook export prepared.'); break;
    case 'export-markdown': download(`${packId}-notebook.md`, markdownExport(state, SESSIONS), 'text/markdown'); break;
    case 'preview-markdown': $('#markdown-preview').innerHTML = `<label class="field">Reviewable Markdown<textarea readonly rows="16">${esc(markdownExport(state, SESSIONS))}</textarea></label>`; break;
    case 'restore-backup': try { previewImport(storage.getItem(`${STORAGE_KEY}-backup`) || '', true); } catch { importMessage = 'Backup storage is unavailable. Import an exported JSON notebook.'; render(false); } break;
    case 'cancel-import': pendingImport = null; importMessage = 'Import cancelled. Your notebook is unchanged.'; render(false); break;
    case 'confirm-import': try { state = mergeStates(state, pendingImport); pendingImport = null; const saved = persist(); importMessage = saved ? 'Notebook merged without duplicate IDs.' : 'Notebook merged in this tab. Export it now; local saving is unavailable.'; render(false); } catch (error) { importMessage = error.message; render(false); } break;
    case 'raw-recovery': download(`${packId}-recovery.txt`, recoveryRaw, 'text/plain'); break;
    case 'recover-storage': if (multiTabConflict) { importMessage = 'Another tab changed this notebook. Export this tab, reload, then merge before recovery.'; render(false); break; } try { storage.setItem(`${STORAGE_KEY}-recovery-${Date.now()}`, recoveryRaw); storage.removeItem(STORAGE_KEY); recoveryRaw = ''; storageProblem = ''; persist(); importMessage = 'Original recovery data was archived. Current notebook saved.'; render(false); } catch { importMessage = 'Could not archive the original. Download recovery data and your current notebook.'; render(false); } break;
  }
});
function previewImport(text, internal = false) { let result;try{result=parseImport(internal?text:decodeBackup(text,'notebook',backupContext));}catch(error){result={ok:false,errors:[error.message]};} const errors = result.ok ? knownState(result.state) : result.errors; pendingImport = errors.length ? null : result.state; importMessage = errors.length ? errors.slice(0, 4).join(' ') : 'Validated. Review the counts, then merge.'; render(false); announce(importMessage); }
function captureNoteDraft(form) { state.noteDraft = { id:state.noteDraft?.id || '', ...Object.fromEntries(new FormData(form)) }; const saved = persist(); const status = $('#note-draft-status'); if (status) status.textContent = saved ? 'Working draft saved.' : 'Draft is in this tab only. Export JSON to keep it.'; }
function bindForms() {
 document.querySelectorAll('[data-review-form]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form)),a=state.attempts.find(x=>x.id===form.dataset.reviewForm);const reviewer=values.reviewer.trim(),notes=values.notes.trim();if(!reviewer||!notes){announce('Enter a reviewer and actual feedback, not only whitespace.');let error=form.querySelector('.feedback');if(!error){error=document.createElement('p');error.className='feedback error';error.setAttribute('role','alert');form.append(error);}error.textContent='Enter a reviewer and actual feedback, not only whitespace.';return;}a.review={reviewer,notes,reviewedAt:now()};const saved=persist();render(false);announce(saved?'Reviewer feedback recorded locally. The outcome remains self-reported.':'Reviewer feedback is in this tab only. Saving failed; export the notebook to keep it.');}));
  $('#practice-search-form')?.addEventListener('submit', event => { event.preventDefault(); practiceQuery = new FormData(event.target).get('query'); window.history.replaceState(null, '', practiceHash(practiceFilter, practiceQuery)); render(false); $('#practice-search').focus(); announce($('#practice-result-count').textContent); });
  $('#note-search-form')?.addEventListener('submit', event => { event.preventDefault(); noteQuery = new FormData(event.target).get('query'); render(false); $('#note-search').focus(); });
  $('#note-filter')?.addEventListener('change', event => { noteFilter = event.target.value; render(false); $('#note-filter').focus(); });
  const noteForm = $('#note-form'); noteForm?.addEventListener('input', () => captureNoteDraft(noteForm)); noteForm?.addEventListener('change', () => captureNoteDraft(noteForm));
  noteForm?.addEventListener('submit', event => { event.preventDefault(); const input = { ...Object.fromEntries(new FormData(event.target)) }; if (state.noteDraft?.id) input.id = state.noteDraft.id; try { const savedNote = saveNotebookNote(state, input); state = savedNote.state; const note = savedNote.note; state.noteDraft = { id:note.id, sessionId:note.sessionId, title:note.title, body:note.body, status:note.status }; const saved = persist(); noteMessage = saved ? 'Note saved in this notebook.' : 'Note saved in this tab. Export JSON to keep it.'; render(false); $('#note-form [type=submit]')?.focus({ preventScroll:true }); announce(noteMessage); } catch (error) { $('#note-message').textContent = error.message; $('#note-message').setAttribute('role','alert'); } });
  $('#import-file')?.addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { importMessage = 'Import exceeds the 2 MB limit. Use a smaller valid notebook.'; pendingImport = null; render(false); return; } try { previewImport(await file.text()); } catch { importMessage = 'Could not read this file. Choose an exported JSON notebook.'; render(false); } });
  $('#settings-form')?.addEventListener('submit', event => { event.preventDefault(); const values = new FormData(event.target).get('reviewDays').split(',').map(value => value.trim()).map(Number); if (!values.length || values.length > 12 || values.some((value, index) => !Number.isInteger(value) || value < 1 || value > 365 || (index && value <= values[index - 1]))) { $('#settings-status').textContent = 'Use 1–12 increasing whole numbers from 1 to 365.'; return; } state.settings.reviewDays = values; $('#settings-status').textContent = persist() ? 'Saved. Existing scheduled dates are unchanged.' : 'Changed in this tab only. Saving failed; export your notebook to keep this setting.'; });
  $('#evidence-form')?.addEventListener('submit', event => { event.preventDefault(); const { session, draft } = active(); const form = Object.fromEntries(new FormData(event.target)); Object.assign(draft.evidence, form); const result = { ...form, testEvidence:form.testEvidence + (draft.evidence.clockResets ? `\nClock reset ${draft.evidence.clockResets} time(s); duration is since the last reset.` : ''), confidence:Number(form.confidence), nextReviewDays:Number(form.nextReviewDays), reviewOf:draft.evidence.reviewOf }; try { const done = finishAttempt(state, draft, session, result); state = done.state; lastClosed = done.attempt; persist(); goto('#complete'); } catch (error) { feedback = error.message; rerenderSession(); announce(feedback); } });
}
window.addEventListener('hashchange', () => render());
window.addEventListener('pagehide', pauseAll);
window.addEventListener('storage', event => { if (event.key === fullStorageKey) { multiTabConflict = true; storageProblem = 'Another tab changed this notebook. Saving is paused to protect both versions.'; storageUI(); } });
setInterval(() => { const { draft } = active(); if (draft?.timerRunningSince !== null) { const clock = $('#clock'); if (clock) clock.textContent = clockText(elapsedMs(draft)); } }, 500);
setInterval(() => { for (const draft of Object.values(state.drafts)) if (draft.timerRunningSince !== null) touch(draft); }, 5000);
render(false); storageUI();
