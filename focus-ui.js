import { encodeBackup, decodeBackup } from './backup-engine.js';
import { FOCUS_STORAGE_KEY, freshFocus, parseFocus, startFocus, pauseFocus, resumeFocus, settleFocus, resetFocus, configureFocus, focusView, mergeFocus } from './focus-engine.js';

import { REFLECTION_TOPICS, chooseReflection, getReflection } from './reflections.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titles = {focus:'Focus',short:'Short break',long:'Long break'};
const timeText = ms => `${String(Math.floor(Math.ceil(ms / 1000) / 60)).padStart(2,'0')}:${String(Math.ceil(ms / 1000) % 60).padStart(2,'0')}`;
const durationText = ms => ms < 60000 ? `${ms / 1000}s` : `${ms / 60000} min`;

/** Focus time has its own record. It never mutates a lesson, attempt, or practice log. */
export function setupFocus({storage, sessions, qa, namespace, onChange, announce, download, backupContext}) {
  let state = freshFocus(), raw = null, problem = '', recovery = '', message = '', busy = false, dirty = false, conflict = false;
  let selectedKind = 'focus', draft = {intention:'',sessionId:''}, pending = null, settingsDraft = null, celebrate = false;
  let openDetails = new Set(), selectedBook = null;
  const topicsKey = 'padipps-reflection-topics';
  let topics = REFLECTION_TOPICS.map(t => t.id);
  try { const saved = JSON.parse(storage?.getItem(topicsKey) || 'null'); if (Array.isArray(saved)) topics = REFLECTION_TOPICS.filter(t => saved.includes(t.id)).map(t => t.id); } catch {}
  const nextIdea = s => chooseReflection(s.receipts.filter(r => r.kind === 'focus').length + s.discardedReceipts, topics)?.id || '';
  const draftKey = 'padipps-focus-draft';
  try {
    raw = storage?.getItem(FOCUS_STORAGE_KEY) ?? null;
    if (raw !== null) state = parseFocus(raw);
    if (!storage) problem = 'Browser storage is unavailable. Keep this tab open and export your focus record.';
  } catch {
    if (raw !== null) { recovery = raw; problem = 'The saved focus record could not be read. Export recovery data; it has not been overwritten.'; }
    else problem = 'Browser storage is unavailable. Keep this tab open and export your focus record.';
  }
  try {
    const saved = JSON.parse(storage?.getItem(draftKey) || 'null');
    if (saved && typeof saved.intention === 'string' && saved.intention.length <= 400 && typeof saved.sessionId === 'string') draft = saved;
  } catch { /* A broken intention draft does not invalidate completed focus history. */ }
  selectedKind = focusView(state).suggestedKind;

  function refreshStored() {
    if (recovery || conflict) return;
    try {
      const latest = storage?.getItem(FOCUS_STORAGE_KEY) ?? null;
      if (latest !== raw) {
        if (dirty) { conflict = true; problem = 'Another tab changed the focus record while this tab had unsaved work. Export this tab, reload, then import to merge. Saving is paused to protect both versions.'; return; }
        try {
          const incoming = latest === null ? freshFocus() : parseFocus(latest);
          // Without browser lock support, retain both branches if a racing write lost
          // one of this tab's receipts or replaced its distinct active interval.
          if (!navigator.locks?.request) {
            const incomingIds = new Set(incoming.receipts.map(r => r.id));
            const lostReceipt = state.receipts.some(r => !incomingIds.has(r.id));
            const lostActive = state.active && incoming.active?.id !== state.active.id && !incomingIds.has(state.active.id);
            if (lostReceipt || lostActive) {
              conflict = true;
              problem = 'Concurrent focus changes need a manual merge in this browser. This tab’s version is preserved. Export it, reload, then import to merge.';
              return;
            }
          }
          state = incoming; raw = latest; problem = '';
        }
        catch { conflict = true; problem = 'Another tab wrote an unreadable focus record. Export this tab’s record before reloading; saving is paused.'; }
      }
    } catch { problem = 'Browser focus storage cannot be read. Work can continue in this tab; export it before closing.'; }
  }
  function persist() {
    if (recovery || conflict) return false;
    try {
      if (!storage) throw Error('Unavailable');
      // Also protect engines without Web Locks against a change observed before writing.
      if (storage.getItem(FOCUS_STORAGE_KEY) !== raw) {
        conflict = true;
        problem = 'Another tab changed the focus record before saving. Export this tab, reload, then import to merge. Both versions are preserved.';
        return false;
      }
      const text = JSON.stringify(state);
      storage.setItem(FOCUS_STORAGE_KEY, text); raw = text; dirty = false; problem = ''; return true;
    } catch { problem = 'Focus is running in this tab only. Browser saving failed; export your focus record to keep it.'; return false; }
  }
  async function transact(operation, success = '') {
    if (busy) return;
    busy = true;
    const focused = document.activeElement;
    const restoreId = focused?.id;
    const restoreAction = focused?.dataset?.focusAction;
    const restoreSettings = focused?.closest('#focus-settings-form') && focused?.type === 'submit';
    const run = () => {
      refreshStored();
      const runningId = state.status === 'running' ? state.active.id : null;
      state = operation(state);
      dirty = true;
      const saved = persist();
      if (runningId && state.status === 'completed' && focusView(state).lastReceipt?.id === runningId) {
        selectedKind = focusView(state).suggestedKind;
        celebrate = focusView(state).kind === 'focus';
        selectedBook = celebrate ? runningId : null;
        success = focusView(state).kind === 'focus' ? 'Focus block finished. Your book has joined the shelf. Take a break when you’re ready.' : 'Break finished. Start another focus block when you’re ready.';
      }
      message = success + (saved ? '' : ' This record is in memory; export it before closing.');
    };
    try {
      if (navigator.locks?.request) await navigator.locks.request(namespace + FOCUS_STORAGE_KEY, run);
      else run();
    } catch (error) { message = error.message; }
    finally {
      busy = false; onChange(); update();
      if (restoreId) document.getElementById(restoreId)?.focus({preventScroll:true});
      else if (restoreSettings) document.querySelector('#focus-settings-form [type=submit]')?.focus({preventScroll:true});
      else if (restoreAction && location.hash === '#focus') {
        const nextAction = state.status === 'running' ? 'pause' : state.status === 'paused' ? 'resume' : null;
        document.querySelector(nextAction ? `[data-focus-action=${nextAction}]` : '.focus-start')?.focus({preventScroll:true});
      }
      if (message) announce(message);
    }
  }
  const sessionName = id => sessions.find(s => s.id === id)?.title || 'General study';
  function controls(view) {
    if (view.status === 'running') return '<button class="btn primary" data-focus-action="pause">Pause interval</button><button class="text-button" data-focus-action="end">End this interval</button>';
    if (view.status === 'paused') return '<button class="btn primary" data-focus-action="resume">Resume interval <span class="action-arrow" aria-hidden="true">→</span></button><button class="text-button" data-focus-action="end">End this interval</button>';
    return `<button class="btn primary focus-start" type="submit" form="focus-start-form">Start ${titles[selectedKind].toLowerCase()} <span class="action-arrow" aria-hidden="true">→</span></button>`;
  }
  function shelf(view) {
    const books = state.receipts.filter(r => r.kind === 'focus');
    const recent = books.slice(-8);
    return `<section class="focus-shelf"><div class="section-heading"><div><h2>Your study shelf</h2><p class="fine">${books.length ? `${books.length} finished focus ${books.length === 1 ? 'block' : 'blocks'} · ${durationText(books.reduce((sum,r)=>sum+r.durationMs,0))} of focus timers` : 'Your first finished focus block will become a book here.'}</p></div><a href="#notebook">Open notebook →</a></div>
    <div class="bookshelf" aria-label="Most recent finished focus blocks">${recent.length ? recent.map((r, i) => `<button class="shelf-book book-${i % 4}" data-focus-action="book" data-period-id="${esc(r.id)}" aria-label="${r.reflectionId ? 'Open idea for' : 'Open focus record for'} ${esc(r.intention)}, ${durationText(r.durationMs)}${r.qa ? ', QA test' : ''}" ${['running','paused'].includes(view.status)?'disabled':''}><span class="book-time">${esc(durationText(r.durationMs))}</span><span class="book-name">${esc(r.intention)}</span><span class="book-seal" aria-hidden="true">${r.qa ? 'QA' : 'P'}</span></button>`).join('') : '<div class="shelf-placeholder"><span class="empty-book" aria-hidden="true"></span><p>A small beginning.<br>Choose one intention above.</p></div>'}</div>
    <p class="fine">Books record completed timers. Your explanations, artifacts and tests stay in the practice notebook.${state.discardedReceipts ? ` Showing the most recent ${state.receipts.length} intervals; ${state.discardedReceipts} older intervals are outside this record.` : ''}</p>${reflectionCard(view)}<details class="reflection-preferences"><summary>Ideas for future books</summary><p class="fine">Choose the subjects you would enjoy on a break. Uncheck all to keep a quiet shelf. Each book keeps the idea chosen when its timer started.</p><fieldset id="reflection-topics"><legend class="sr-only">Reflection interests</legend>${REFLECTION_TOPICS.map(t=>`<label><input type="checkbox" name="reflection-topic" value="${t.id}" ${topics.includes(t.id)?'checked':''}> ${esc(t.label)}</label>`).join('')}</fieldset><p class="fine" id="reflection-preference-status" role="status"></p></details></section>`;
  }
  function reflectionCard(view) {
    if (['running','paused'].includes(view.status)) return '';
    const receipt = state.receipts.find(r => r.id === selectedBook) || (view.status === 'completed' && view.lastReceipt?.kind === 'focus' ? view.lastReceipt : null);
    if (!receipt?.reflectionId) return '';
    const idea = getReflection(receipt.reflectionId);
    return `<article class="reflection-card" aria-label="This book’s idea"><div class="reflection-spine" aria-hidden="true">${idea ? esc(REFLECTION_TOPICS.find(t=>t.id===idea.topic)?.label) : 'Your book'}</div><div><p class="page-kicker">A thought for your break · ${esc(receipt.intention)}</p><h3 id="reflection-heading" tabindex="-1">${idea ? esc(idea.title) : 'A little space to reflect.'}</h3>${idea ? `<p class="reflection-idea">${esc(idea.idea)}</p><p class="reflection-question">${esc(idea.prompt)}</p><p class="fine">${esc(idea.framing)} <a href="${esc(idea.source.url)}" target="_blank" rel="noopener noreferrer">${esc(idea.source.label)} ↗</a> · ${esc(idea.source.locator)}</p>` : `<p class="reflection-idea">${receipt.reflectionId ? 'This idea is not in the current collection. The original idea ID is preserved in your backup.' : 'No idea was attached to this book. Choose interests below for future books, or keep this space for your own thoughts.'}</p>`}<a href="#notebook">Keep a thought in your notebook →</a></div></article>`;
  }
  function page() {
    if (document.querySelector('.focus-room')) openDetails = new Set([...document.querySelectorAll('.focus-bottom details[open]')].map(d => d.id));
    const v = focusView(state), engaged = ['running','paused'].includes(v.status);
    const warning = problem || (v.clockSkew ? 'Your device clock is earlier than this saved focus record. The timer is held; correct the device time or wait for it to catch up.' : '');
    const kind = engaged ? v.kind : selectedKind;
    const isBreak = kind !== 'focus';
    const label = v.status === 'running' ? (isBreak ? 'Time to step away' : 'One thing at a time') : v.status === 'paused' ? 'Your place is held' : v.status === 'completed' ? 'A little more room to think' : 'Make a little room';
    const displayMs = engaged ? v.remainingMs : (kind === 'focus' ? state.settings.focusMinutes : kind === 'short' ? state.settings.shortMinutes : state.settings.longMinutes) * 60000;
    return `<div class="page-top"><div><p class="page-kicker">Your focus room</p><h1>One block. One book.</h1><p class="intro">Choose one thing to move forward. Let everything else wait.</p></div><a class="focus-back" href="#practice">Browse practice →</a></div>
    <div class="focus-storage ${warning ? 'warning' : ''}" role="status">${esc(warning || 'Your focus record stays in this browser.')} ${problem ? '<button class="text-button" data-focus-action="record">Export your record</button>' : ''}</div>
    <section class="focus-room" aria-label="Pomodoro timer">
      <div class="focus-console"><div class="focus-phases" role="group" aria-label="Choose an interval">${Object.entries(titles).map(([k,title]) => `<button data-focus-action="kind" data-kind="${k}" aria-pressed="${kind===k}" ${engaged?'disabled':''}>${title}</button>`).join('')}</div>
      <p class="focus-state">${esc(label)}</p><time class="focus-clock" id="focus-clock" aria-label="Time remaining" role="timer" aria-live="off">${timeText(displayMs)}</time>
      <p class="focus-cycle">${state.focusBlocksSinceLong} of ${state.settings.longEvery} focus blocks toward a long break${v.status === 'paused' ? ' · Paused' : ''}</p>
      <form id="focus-start-form"><label class="field" for="focus-intention">${engaged ? 'Your intention' : isBreak ? 'Your break' : 'What is this block for?'}<input id="focus-intention" name="intention" type="text" maxlength="200" value="${esc(engaged?v.intention:isBreak?'Step away from the screen':draft.intention)}" placeholder="e.g. Trace one prefix-sum example" ${engaged?'readonly':''} ${isBreak?'':'required'}></label>
      <label class="field" for="focus-session">Connect to a practice session <span class="optional">(optional)</span><select id="focus-session" name="sessionId" ${engaged?'disabled':''}><option value="">General study</option>${sessions.map(s=>`<option value="${s.id}" ${(engaged?v.sessionId:draft.sessionId)===s.id?'selected':''}>${esc(s.title)}</option>`).join('')}</select></label></form>
      <div class="actions focus-actions">${controls(v)}</div>
      ${qa && !engaged ? '<button class="text-button qa-timer-test" data-focus-action="qa-start">QA: test a 5-second focus block</button>' : ''}
      <p class="focus-message" id="focus-message" role="status">${esc(message)}</p>
      <p class="fine">${v.status==='paused'?'The countdown is paused, including across reloads. Resume when you’re ready.':engaged?'This countdown continues in VS Code and across reloads. Pause when you need to.':'Start each interval yourself. Focus and break lengths are adjustable below.'} The practice stopwatch is separate.</p></div>
      <div class="focus-visual ${isBreak ? 'is-break' : ''}" aria-hidden="true"><div class="volume-art"><img class="volume-ghost" src="assets/padipps-icon.webp" alt="" width="320" height="320"><div class="volume-progress"><img src="assets/padipps-icon.webp" alt="" width="320" height="320"></div><span class="volume-tab"></span></div><p class="volume-caption">${isBreak ? 'Leave a little space.' : engaged ? 'Your next volume, taking shape.' : v.status === 'completed' ? 'A block of time, kept.' : 'A shelf built one block at a time.'}</p><p class="volume-detail">${isBreak ? 'Stand up. Look away. Come back when you’re ready.' : 'Set an intention. Give it your attention. Keep the time.'}</p><div class="focus-progress-track"><span id="focus-progress-bar"></span></div><p class="volume-progress-label" id="volume-progress-label">${engaged?Math.floor(v.progress*100):0}% of this interval</p></div>
    </section>
    ${v.status === 'completed' ? `<div class="focus-finished"><div><h2>${v.kind==='focus'?'This block has a place on your shelf.':'Your break is complete.'}</h2><p>${v.kind==='focus'?'Before moving on, capture one thing that changed in your understanding.':'Choose the next small intention. There is no need to rush back.'}</p></div><a class="button-link" href="#notebook">Write a note →</a></div>` : ''}
    ${shelf(v)}
    <div class="focus-bottom"><details id="focus-rhythm" class="focus-settings" ${openDetails.has('focus-rhythm')?'open':''}><summary>Adjust your rhythm <span>${state.settings.focusMinutes} / ${state.settings.shortMinutes} / ${state.settings.longMinutes} min</span></summary><form id="focus-settings-form"><div class="focus-settings-grid">${[['focusMinutes','Focus minutes',1,120],['shortMinutes','Short break',1,60],['longMinutes','Long break',1,60],['longEvery','Long break every',2,8]].map(([name,label,min,max])=>`<label class="field">${label}<input type="number" name="${name}" value="${esc(settingsDraft?.[name]??state.settings[name])}" min="${min}" max="${max}" step="1" required></label>`).join('')}</div><p class="fine">25 / 5 / 15 is a starting point, not a target to beat. New lengths apply to the next interval.</p><button class="btn" type="submit">Save timer settings</button></form></details>
    <details id="focus-record" class="focus-record" ${openDetails.has('focus-record')?'open':''}><summary>Focus record & backup <span>${state.receipts.length} ${state.receipts.length===1?'interval':'intervals'}</span></summary><p class="fine">The clock measures elapsed time, including time away from the screen. It cannot verify attention or understanding. The latest 1,000 intervals are retained. Focus JSON is separate from your notebook backup.</p><div class="actions"><button class="btn" data-focus-action="export">Export focus JSON</button>${recovery?'<button class="btn" data-focus-action="recovery">Export unreadable original</button><button class="btn" data-focus-action="recover">Archive original & recover focus</button>':''}</div><label class="field" for="focus-import">Restore a focus record</label><input id="focus-import" type="file" accept="application/json,.json">${pending?`<p class="note">Validated: ${pending.receipts.length} intervals. Merge by stable ID; this tab’s active interval and settings stay yours.<button class="btn" data-focus-action="merge">Merge focus record</button><button class="text-button" data-focus-action="cancel-import">Cancel</button></p>`:''}<div class="focus-receipts">${state.receipts.slice(-12).reverse().map(r=>`<article><span>${esc(titles[r.kind])}${r.qa?' · QA test':''}</span><strong>${esc(r.intention)}</strong><small>${esc(durationText(r.durationMs))} · ${new Date(r.completedAtMs).toLocaleString()} · ${esc(sessionName(r.sessionId))}</small>${r.kind==='focus'?`<button class="text-button" data-focus-action="book" data-period-id="${esc(r.id)}">Open book idea →</button>`:''}</article>`).join('') || '<p class="fine">No finished intervals yet.</p>'}</div></details></div>`;
  }
  function entry() {
    const v = focusView(state), engaged = ['running','paused'].includes(v.status);
    return `<section class="focus-entry"><div><p class="page-kicker">A rhythm for your study</p><h2>${engaged ? esc(v.intention) : 'Make time. Build your shelf.'}</h2><p data-focus-entry-status>${engaged ? `${titles[v.kind]} · ${v.status} · ${timeText(v.remainingMs)} remaining` : 'One focused interval, a book for your shelf, then room for a break.'}</p></div><a class="button-link" href="#focus">${engaged?'Return to timer':'Open focus room'} <span class="action-arrow" aria-hidden="true">→</span></a></section>`;
  }
  function update() {
    const v = focusView(state), engaged = ['running','paused'].includes(v.status);
    const entryStatus=document.querySelector('[data-focus-entry-status]');
    if(entryStatus&&engaged)entryStatus.textContent=`${titles[v.kind]} · ${v.status} · ${timeText(v.remainingMs)} remaining`;
    const clock = document.querySelector('#focus-clock');
    if (clock && engaged) clock.textContent = timeText(v.remainingMs);
    const progress = engaged || v.status === 'completed' ? v.progress : 0;
    const bar = document.querySelector('#focus-progress-bar');
    if (bar) bar.style.transform = `scaleX(${progress})`;
    const art = document.querySelector('.volume-progress');
    const quiet = document.documentElement.dataset.motion !== 'full' || document.hidden;
    if (quiet && window.gsap) {
      const books = document.querySelectorAll('.shelf-book');
      window.gsap.killTweensOf(books);
      window.gsap.set(books,{clearProps:'transform,opacity'});
    }
    if (art) {
      const clipPath = `inset(${(1-progress)*100}% 0 0 0)`;
      if (window.gsap && !quiet && engaged) window.gsap.to(art,{clipPath,duration:.55,ease:'none',overwrite:true});
      else { window.gsap?.killTweensOf(art); art.style.clipPath = clipPath; }
    }
    const label = document.querySelector('#volume-progress-label');
    if (label) label.textContent = v.status === 'completed' ? `${titles[v.kind]} interval complete` : `${Math.floor(progress*100)}% of this interval`;
    const dock = document.querySelector('#focus-dock');
    if (dock) {
      dock.hidden = location.hash.split('?')[0] === '#focus' || !(engaged || v.status === 'completed');
      const key = `${v.status}:${v.kind}:${v.intention}`;
      if (dock.dataset.key !== key) {
        dock.dataset.key = key;
        dock.innerHTML = `<a href="#focus"><span class="dock-label">${v.status==='completed'?`${titles[v.kind]} finished`:`${titles[v.kind]}${v.status==='paused'?' · paused':''}`}</span><strong>${esc(v.intention)}</strong></a><time id="focus-dock-clock">${timeText(v.remainingMs)}</time>${engaged?`<button class="btn" data-focus-action="${v.status==='running'?'pause':'resume'}">${v.status==='running'?'Pause':'Resume'}</button>`:`<a class="button-link" href="#focus">${v.kind==='focus'?'Take a break':'Return to focus'} →</a>`}`;
      }
      const time = document.querySelector('#focus-dock-clock'); if (time) time.textContent = timeText(v.remainingMs);
      document.body.classList.toggle('has-focus-dock',!dock.hidden);
    }
  }
  function afterRender() {
    document.querySelector('#focus-start-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(event.target));
      transact(s => startFocus(s,{...form,kind:selectedKind,reflectionId:nextIdea(s)}), `${titles[selectedKind]} started.`);
    });
    document.querySelector('#focus-start-form')?.addEventListener('input', event => {
      if (['running','paused'].includes(state.status) || selectedKind !== 'focus') return;
      draft = Object.fromEntries(new FormData(event.currentTarget));
      try { storage?.setItem(draftKey,JSON.stringify(draft)); } catch {}
    });
    document.querySelector('#focus-settings-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const settings = Object.fromEntries([...new FormData(event.target)].map(([k,v])=>[k,Number(v)]));
      transact(s => { const next=configureFocus(s,settings); settingsDraft=null; selectedKind=focusView(next).suggestedKind; return next; },'Timer settings saved for the next interval.');
    });
    document.querySelector('#focus-settings-form')?.addEventListener('input', event => { settingsDraft=Object.fromEntries(new FormData(event.currentTarget)); });
    document.querySelector('#focus-import')?.addEventListener('change', async event => {
      const file = event.target.files[0]; if (!file) return;
      try { if (file.size > 2*1024*1024) throw Error('Focus import exceeds 2 MB.'); pending = parseFocus(decodeBackup(await file.text(),'focus',backupContext)); message = 'Focus backup validated. Review it in Focus record & backup.'; }
      catch (error) { pending = null; message = error.message; }
      onChange(); document.querySelector('#focus-record')?.setAttribute('open',''); announce(message);
    });
    document.querySelector('#reflection-topics')?.addEventListener('change', () => {
      topics = [...document.querySelectorAll('[name=reflection-topic]:checked')].map(i=>i.value);
      let status = topics.length ? 'Interests saved for future books.' : 'Future books will have no suggested idea.';
      try { if(!storage) throw Error(); storage.setItem(topicsKey,JSON.stringify(topics)); } catch { status += ' This preference is only kept in this tab.'; }
      document.querySelector('#reflection-preference-status').textContent=status;
    });
    update();
    if(celebrate){
      celebrate=false;
      if(window.gsap&&document.documentElement.dataset.motion==='full'&&!document.hidden){
        const book=document.querySelector('.shelf-book:last-child');
        if(book)window.gsap.fromTo(book,{y:-14,opacity:.45},{y:0,opacity:1,duration:.45,ease:'power3.out',clearProps:'transform,opacity'});
      }
    }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-focus-action]'); if (!button || button.disabled) return;
    switch (button.dataset.focusAction) {
      case 'kind': selectedKind = button.dataset.kind; message = ''; onChange(); document.querySelector(`[data-focus-action=kind][data-kind=${selectedKind}]`)?.focus(); break;
      case 'pause': transact(s=>pauseFocus(s),'Interval paused. Your place is held.'); break;
      case 'resume': transact(s=>resumeFocus(s),'Interval resumed.'); break;
      case 'end': transact(s=>resetFocus(s),'Interval ended. Earlier completed books are kept.'); break;
      case 'qa-start': if (qa) transact(s=>startFocus(s,{kind:'focus',intention:'QA timer check',sessionId:'',qa:true,durationMs:5000,reflectionId:nextIdea(s)}),'Isolated 5-second QA timer started.'); break;
      case 'book': if (['running','paused'].includes(state.status)) break; selectedBook=button.dataset.periodId; if(!state.receipts.find(r=>r.id===selectedBook)?.reflectionId){const record=document.querySelector('#focus-record');if(record){record.open=true;record.querySelector('summary').focus();record.scrollIntoView({block:'nearest'});}break;} onChange(); document.querySelector('#reflection-heading')?.focus({preventScroll:true}); document.querySelector('.reflection-card')?.scrollIntoView({block:'nearest'}); break;
      case 'record': {const record=document.querySelector('#focus-record');if(record){record.open=true;record.querySelector('summary').focus();record.scrollIntoView({block:'start'});}break;}
      case 'recover': if(recovery){try{storage.setItem(`${FOCUS_STORAGE_KEY}-recovery-${Date.now()}`,recovery);recovery='';persist();message=problem||'Original archived. The current focus record is saved.';}catch{message='Could not archive the original. Export recovery data and this tab’s focus record before closing.';}onChange();announce(message);}break;
      case 'export': download('padipps-focus.json',encodeBackup('focus',backupContext,state)); announce('Focus backup prepared. Notebook data is backed up separately.'); break;
      case 'recovery': download('padipps-focus-recovery.txt',recovery,'text/plain'); break;
      case 'merge': if (pending && !recovery) { const incoming = pending; pending = null; transact(s=>mergeFocus(s,incoming),'Focus record merged without duplicate IDs.'); } else { message='Export the unreadable original and this tab’s focus record before recovering browser storage.'; onChange(); } break;
      case 'cancel-import': pending = null; message = 'Focus import cancelled.'; onChange(); break;
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === namespace + topicsKey) {
      try { const saved=JSON.parse(event.newValue || 'null'); topics=Array.isArray(saved)?REFLECTION_TOPICS.filter(t=>saved.includes(t.id)).map(t=>t.id):REFLECTION_TOPICS.map(t=>t.id); } catch { return; }
      document.querySelectorAll('[name=reflection-topic]').forEach(input=>{input.checked=topics.includes(input.value);});
      const notice=document.querySelector('#reflection-preference-status');if(notice)notice.textContent='Interests updated from another tab.';
      return;
    }
    if (event.key !== namespace + FOCUS_STORAGE_KEY || recovery || conflict) return;
    refreshStored(); selectedKind = focusView(state).suggestedKind; onChange(); update();
  });
  document.addEventListener('visibilitychange', update);
  setInterval(() => {
    if (state.status !== 'running') return;
    const v = focusView(state);
    if (v.expired && !v.clockSkew && !busy) transact(s => settleFocus(s));
    else if (!document.hidden) update();
  }, 500);
  return {page,entry,afterRender,update,isRunning:()=>state.status==='running'};
}
