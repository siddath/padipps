/** Explicit browser release boundary. Never include a backend, credential or learner file. */
export const BROWSER_ASSETS = Object.freeze([
  'index.html','app.js','styles.css','appearance.js','motion.js','engine.js',
  'content.js','catalog.js','pack-engine.js','backup-engine.js','packs-ui.js',
  'notebook-ui.js','focus-ui.js','focus-engine.js','focus.css','reflections.js',
  'chat-ui.js','chat-engine.js','chat-context.js','chat.css',
  'assets/padipps-icon.webp','vendor/gsap-3.15.0.min.js',
  'packs/starter.json','packs/engineering.json','packs/engineering-v1.json',
]);
export const STATIC_FILES = Object.freeze([...BROWSER_ASSETS,'.nojekyll','LICENSE','THIRD_PARTY_LICENSES.md']);
