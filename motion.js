/** Local GSAP motion. Reading is still; state changes and controls acknowledge input. */
export function setupMotion(storage) {
  const gsap = window.gsap;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let quiet = false, previousStage = 0, previousSession = '', previousRoute = '';
  try { quiet = storage?.getItem('padipps-motion') === 'reduced'; } catch {}
  const targets = new Set();
  const reduced = () => !gsap || quiet || media.matches;
  function sync() {
    document.documentElement.dataset.motion = reduced() ? 'reduced' : 'full';
    const control = document.querySelector('#motion-toggle');
    if (control) {
      control.textContent = reduced() ? 'Motion: reduced' : 'Motion: full';
      control.setAttribute('aria-pressed', String(reduced()));
      control.disabled = media.matches || !gsap;
      control.title = media.matches ? 'Following your system reduced-motion preference' : 'Change motion for this browser';
    }
  }
  function clear() {
    if (!gsap) return;
    for (const element of targets) {
      gsap.killTweensOf(element);
      if (element.isConnected) gsap.set(element, { clearProps: 'transform,opacity,clipPath' });
    }
    targets.clear();
  }
  function fromTo(element, from, to) {
    if (!element || reduced()) return;
    targets.add(element);
    gsap.fromTo(element, from, { duration: .23, ease: 'power3.out', overwrite: true, ...to,
      onComplete() { gsap.set(element, {clearProps:'transform,opacity,clipPath'}); targets.delete(element); } });
  }
  function afterRender(route, kind = 'view') {
    sync();
    const pane = document.querySelector('.lesson-pane');
    const active = document.querySelector('.steps [aria-current="step"]');
    const stage = active ? Number(active.dataset.stage) : 0;
    const ink = document.querySelector('.progress-ink');
    if (ink) {
      const value = (stage + 1) / 5;
      ink.style.transform = `scaleX(${value})`;
      if (!reduced() && previousSession === route && previousStage !== stage) {
        gsap.fromTo(ink, {scaleX:(previousStage+1)/5}, {scaleX:value,duration:.34,ease:'power3.out',overwrite:true});
        targets.add(ink);
        fromTo(pane, {clipPath:'inset(0 3% 0 0)',opacity:.75}, {clipPath:'inset(0 0% 0 0)',opacity:1,duration:.28});
      }
    }
    if (kind === 'filter') document.querySelectorAll('#practice-results .session-row').forEach((row, i) => fromTo(row,{x:8,opacity:.65},{x:0,opacity:1,delay:Math.min(i,5)*.018}));
    else if (previousRoute && route !== previousRoute) fromTo(document.querySelector('#main'),{opacity:.8},{opacity:1,duration:.16});
    if (route === 'complete') fromTo(document.querySelector('.checkpoint'),{clipPath:'inset(0 8% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:.35});
    previousStage = stage; previousSession = pane ? route : ''; previousRoute = route;
  }
  function feedback() { fromTo(document.querySelector('#save-status'),{opacity:.4},{opacity:1,duration:.25}); }
  const controlFor = event => event.target.closest('button:not(:disabled),a.button-link,.rail nav a,summary');
  document.addEventListener('pointerdown', event => {
    const control = controlFor(event); if (!control || reduced()) return;
    targets.add(control); gsap.to(control,{scale:.98,duration:.1,ease:'power2.out',overwrite:true});
  });
  function release() { for (const element of targets) if (element.matches?.('button,a,summary')) fromTo(element,{scale:.98},{scale:1,duration:.18}); }
  document.addEventListener('pointerup',release); document.addEventListener('pointercancel',release);
  document.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){const c=controlFor(event);if(c)fromTo(c,{scale:.985},{scale:1,duration:.2});}});
  document.addEventListener('pointerover',event=>{
    const c=controlFor(event),arrow=c?.querySelector('.action-arrow');
    if(arrow&&!c.contains(event.relatedTarget))fromTo(arrow,{x:0},{x:4,duration:.16});
  });
  document.addEventListener('toggle',event=>{if(event.target.open)fromTo(event.target.querySelector('.detail-body'),{opacity:.6},{opacity:1,duration:.18});},true);
  media.addEventListener('change',()=>{clear();sync();const ink=document.querySelector('.progress-ink');if(ink)ink.style.transform=`scaleX(${(previousStage+1)/5})`;});
  sync();
  return { beforeRender:clear, afterRender, feedback, toggle() {
    quiet = !quiet; clear(); try{storage?.setItem('padipps-motion',quiet?'reduced':'full');}catch{}
    sync(); const ink=document.querySelector('.progress-ink');if(ink)ink.style.transform=`scaleX(${(previousStage+1)/5})`;
  } };
}
