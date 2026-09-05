import { mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
const files=['index.html','app.js','styles.css','appearance.js','motion.js','engine.js','content.js','catalog.js','pack-engine.js','backup-engine.js','packs-ui.js','notebook-ui.js','focus-ui.js','focus-engine.js','focus.css','reflections.js','assets/padipps-icon.webp','vendor/gsap-3.15.0.min.js','packs/starter.json','.nojekyll','LICENSE','THIRD_PARTY_LICENSES.md'];
// dist is generated output. Start clean so stale local files cannot enter a release.
await rm('dist',{recursive:true,force:true});
// Only the explicit public asset list is copied; private packs and backups are excluded.
for(const file of files){await mkdir(path.dirname('dist/'+file),{recursive:true});await copyFile(file,'dist/'+file);}
console.log(`Built ${files.length} public assets in dist/. Serve over HTTP(S).`);
