/* Apply local appearance preferences before CSS paints. */
(() => {
  const themes = ['ink', 'sand', 'midnight', 'violet', 'rose', 'graphite'];
  const params = new URLSearchParams(location.search);
  const qa = params.has('qa'), fault = qa ? params.get('fault') : '';
  const prefix = qa ? 'padipps-qa:' + (fault ? fault + ':' : '') : '';
  const themeKey = prefix + 'padipps-theme';
  const railKey = prefix + 'padipps-rail-collapsed';
  let theme = 'ink', railCollapsed = false;

  try {
    if (fault !== 'blocked') {
      theme = localStorage.getItem(themeKey) || theme;
      railCollapsed = localStorage.getItem(railKey) === 'true';
    }
  } catch {}
  if (!themes.includes(theme)) theme = 'ink';

  const applyTheme = value => {
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value === 'midnight' ? 'dark' : 'light';
  };
  const applyRail = collapsed => {
    railCollapsed = collapsed;
    document.documentElement.dataset.rail = collapsed ? 'collapsed' : 'expanded';
    const toggle = document.querySelector('#rail-toggle');
    const nav = document.querySelector('#main-navigation');
    const foot = document.querySelector('.rail-foot');
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      const text = toggle.querySelector('.rail-toggle-text');
      if (text) text.textContent = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    }
    if (nav) {
      nav.hidden = collapsed;
      nav.inert = collapsed;
      nav.toggleAttribute('inert', collapsed);
    }
    if (foot) foot.hidden = collapsed;
  };
  const save = (key, value) => {
    if (fault === 'blocked' || fault === 'quota') throw Error('Unavailable');
    localStorage.setItem(key, value);
  };
  const announce = message => { const status = document.querySelector('#theme-status'); if (status) status.textContent = message; };

  applyTheme(theme);
  document.documentElement.dataset.rail = railCollapsed ? 'collapsed' : 'expanded';

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.querySelector('#theme-select');
    const toggle = document.querySelector('#rail-toggle');
    select.value = theme;
    applyRail(railCollapsed);

    select.addEventListener('change', () => {
      theme = themes.includes(select.value) ? select.value : 'ink';
      applyTheme(theme);
      let message = `${select.selectedOptions[0].textContent} theme saved.`;
      try { save(themeKey, theme); } catch { message = 'Theme changed for this page. Browser saving is unavailable.'; }
      announce(message);
    });
    const setRail = collapsed => {
      applyRail(collapsed);
      if (window.gsap && document.documentElement.dataset.motion === 'full') {
        const target = collapsed ? document.querySelector('#main') : document.querySelector('#main-navigation');
        window.gsap.fromTo(target,{opacity:.65},{opacity:1,duration:.18,ease:'power2.out',clearProps:'opacity',overwrite:true});
      }
      let message = collapsed ? 'Sidebar collapsed.' : 'Sidebar expanded.';
      try { save(railKey, String(collapsed)); } catch { message += ' Browser saving is unavailable.'; }
      announce(message);
    };
    toggle.addEventListener('click', () => setRail(!railCollapsed));
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || railCollapsed) return;
      event.preventDefault();
      setRail(true);
      toggle.focus();
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === themeKey) {
      theme = themes.includes(event.newValue) ? event.newValue : 'ink';
      applyTheme(theme);
      const select = document.querySelector('#theme-select');
      if (select) select.value = theme;
    }
    if (event.key === railKey) applyRail(event.newValue === 'true');
  });
})();
