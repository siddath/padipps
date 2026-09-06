import { PACK, PACK_ERROR, ACTIVE_PACK_RAW, STARTER_PACK_URL, activePackStorageKey, readActivePack, saveActivePack, clearActivePack } from './content.js';
import { parsePack } from './pack-engine.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function setupPacks({download, announce, onChange, beforeSwitch}) {
  let pending = null, message = '', useStarter = false;
  let storage = null;
  const params = new URLSearchParams(location.search);
  try { storage = window.localStorage; if(params.has('qa') && ['blocked','quota'].includes(params.get('fault'))) storage=null; } catch {}
  const packText = pack => JSON.stringify({version:1,pack},null,2);
  function page() {
    return `<div class="page-top"><div><p class="page-kicker">Your subjects, your pace</p><h1>Bring a study pack.</h1><p class="intro">A set of small lessons. A notebook of your own. Change the subject whenever you need to.</p></div></div>
    ${PACK_ERROR ? `<p class="note warning">${esc(PACK_ERROR)} The original import is preserved.${ACTIVE_PACK_RAW ? '<button class="text-button" data-pack-action="recovery">Download original pack</button>' : ''}</p>` : ''}
    <section class="next-session pack-current"><span class="pill">Current pack</span><h2>${esc(PACK?.title || 'No pack loaded')}</h2><p>${esc(PACK?.description || 'Import a pack below to begin.')}</p><p class="fine">${PACK?.sessions.length || 0} lessons · ${PACK?.tracks.length || 0} tracks${PACK ? ` · ${esc(PACK.id)}` : ''}</p><div class="actions"><a class="button-link primary" href="#practice">Open practice →</a>${PACK ? '<button class="btn" data-pack-action="export">Download current pack</button>' : ''}</div></section>
    <section class="section"><h2>Explore the included library</h2><div class="row-list"><article class="session-row"><div class="row-main"><h3>Engineering &amp; product design</h3><p>DSA, backend, distributed systems, AI application engineering, customer delivery and product design. Original lessons and independent exercises.</p></div><button class="btn" data-pack-action="engineering">Preview engineering pack</button></article></div><p class="fine">Choosing this pack opens its own notebook. Your current work stays with its original pack. <a href="packs/engineering.json" download>Download the engineering pack</a> · <a href="https://github.com/siddath/padipps/tree/main/materials/engineering" target="_blank" rel="noopener noreferrer">Exercise materials ↗</a></p></section>
    <section class="notebook-section section"><h2>Choose another subject</h2><p>Import a JSON study pack, preview its lessons, then choose whether to use it. Your file stays in this browser. Each pack keeps a separate notebook and focus record.</p><label class="field" for="pack-import">Import study pack JSON</label><input id="pack-import" type="file" accept=".json,application/json"><p class="fine">Up to 2 MB. Keep a copy of every pack you use so you can reopen its notebook later. Download the current pack before replacing an edited curriculum. <a href="packs/starter.json" download>Download starter template</a>.</p><button class="text-button" data-pack-action="starter">Preview the built-in starter pack</button><p class="feedback" id="pack-message" role="status">${esc(message)}</p>
    ${pending ? `<div class="note pack-preview"><p class="page-kicker">Preview · ${pending.sessions.length} lessons · ${pending.tracks.length} tracks</p><h3>${esc(pending.title)}</h3><p>${esc(pending.description)}</p><details><summary>See the lessons</summary><ul>${pending.sessions.map(s=>`<li>${esc(s.title)} <span class="fine">· ${esc(s.category)}</span></li>`).join('')}</ul></details><p class="fine">${PACK?.id===pending.id && JSON.stringify(PACK)!==JSON.stringify(pending) ? 'This is a new content revision. It opens a separate notebook; retain the old pack file to reopen its history.' : 'Your existing notebook stays under its current pack ID. A running focus timer must be paused before switching.'}</p><div class="actions"><button class="btn primary" data-pack-action="use">Use this pack →</button><button class="text-button" data-pack-action="cancel">Cancel</button></div></div>` : ''}</section>
    <section class="notebook-portable"><h2>Make it about what you want to learn.</h2><p>Download a pack and edit its JSON: rename the subject, replace the prompts and models, define a practical task, and link trustworthy references. Keep lesson IDs stable. Use a new pack ID for changes that alter the lesson gates.</p><p>Imported packs are teaching material from their author. Validation checks their structure, not the accuracy of their ideas.</p><a href="https://github.com/siddath/padipps/blob/main/PACKS.md" target="_blank" rel="noopener noreferrer">Read the pack format ↗</a></section>`;
  }
  function afterRender() {
    document.querySelector('#pack-import')?.addEventListener('change', async event => {
      const file = event.target.files[0]; if(!file)return;
      pending=null;useStarter=false;
      try { if(file.size>2*1024*1024)throw Error('Pack exceeds 2 MB.'); const result=parsePack(await file.text()); if(!result.ok)throw Error(result.errors.join(' '));pending=result.pack;message='Pack validated. Review its lessons before using it.'; }
      catch(error){message=error.message;}
      onChange();document.querySelector('#pack-message')?.focus();announce(message);
    });
  }
  document.addEventListener('click', async event => {
    const button=event.target.closest('[data-pack-action]');if(!button || button.disabled)return;
    switch(button.dataset.packAction){
      case 'export': if(PACK)download(`${PACK.id}-pack.json`,packText(PACK));break;
      case 'recovery': if(ACTIVE_PACK_RAW)download('padipps-original-pack.txt',ACTIVE_PACK_RAW,'text/plain');break;
      case 'cancel': pending=null;message='Pack preview closed.';onChange();break;
      case 'starter':
        try { const response=await fetch(STARTER_PACK_URL);if(!response.ok)throw Error('Starter file is unavailable.');const parsed=parsePack(await response.text());if(!parsed.ok)throw Error(parsed.errors.join(' '));pending=parsed.pack;useStarter=true;message='Starter preview ready. Your current notebook stays separate.'; }
        catch(error){message=error.message;}onChange();break;
      case 'engineering':
        pending=null;useStarter=false;
        try { const response=await fetch(new URL('./packs/engineering.json',import.meta.url));if(!response.ok)throw Error('Engineering pack is unavailable.');const parsed=parsePack(await response.text());if(!parsed.ok)throw Error(parsed.errors.join(' '));pending=parsed.pack;message='Engineering preview ready. Review it before opening a separate notebook.'; }
        catch(error){message=error.message;}onChange();announce(message);break;
      case 'use': {
        if(!pending)return;
        const blocked=beforeSwitch();if(blocked){message=blocked;onChange();announce(message);return;}
        const current=readActivePack(storage);
        if(current.status==='corrupt'){try{storage.setItem(`${activePackStorageKey()}-recovery-${Date.now()}`,current.raw);}catch{message='Could not archive the unreadable original. Download it before clearing browser storage; this import has not replaced it.';onChange();return;}}
        const result=useStarter?clearActivePack(storage):saveActivePack(storage,packText(pending),{overwrite:true});
        if(!result.ok){message=result.message;onChange();announce(message);return;}
        location.hash='#today';location.reload();break;
      }
    }
  });
  return {page,afterRender};
}
