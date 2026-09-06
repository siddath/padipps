import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {inspectText,inspectPath,publicCommitEmail,reviewedScreenshot} from '../scripts/audit-publication.mjs';
import {BROWSER_ASSETS,STATIC_FILES} from '../public-assets.mjs';

test('publication guard detects secrets without returning their values',()=>{
 const fake=['sk','proj', 'A'.repeat(35)].join('-');const finding=inspectText(`first line\n${fake}`);
 assert.deepEqual(finding,[{rule:'openai-key',line:2}]);assert.equal(JSON.stringify(finding).includes(fake),false);
 assert.ok(inspectText(['https:/','user:password@production.invalid/'].join('/')).some(x=>x.rule==='embedded-url-credentials'));
 assert.deepEqual(inspectText('https://user:password@example.com/'),[]);
 const local=['','Users','sample-person','notes'].join('/');assert.ok(inspectText(local).some(x=>x.rule==='absolute-home-path'));
});
test('commit metadata permits only noreply or an explicitly public contact',()=>{
 const approved='maintainer@example.org';
 assert.equal(publicCommitEmail(approved),false);
 assert.equal(publicCommitEmail(approved,[approved]),true);
 assert.equal(publicCommitEmail('someone-else@example.org',[approved]),false);
 assert.equal(publicCommitEmail('maintainer@example.org.attacker.test',[approved]),false);
 assert.equal(publicCommitEmail('123+contributor@users.noreply.github.com'),true);
 assert.equal(publicCommitEmail('noreply@github.com'),true);
 assert.equal(publicCommitEmail('contributor@users.noreply.github.com.attacker.test'),false);
});
test('publication boundary excludes local state, auth, archives and backend from static files',()=>{
 for(const file of ['.env','.codex/auth.json','backups/notebook.json','private-packs/course.json','photos.zip','account.key'])assert.ok(inspectPath(file).length,file);
 for(const file of ['README.md','packs/starter.json'])assert.equal(inspectPath(file).length,0,file);
 assert.equal(new Set(STATIC_FILES).size,STATIC_FILES.length);
 assert.deepEqual(BROWSER_ASSETS.filter(file=>file.startsWith('packs/')),['packs/starter.json']);assert.ok(BROWSER_ASSETS.includes('chat-ui.js'));
 for(const file of STATIC_FILES){assert.equal(inspectPath(file).length,0,file);assert.equal(file.endsWith('.mjs'),false,file);assert.equal(file.startsWith('tests/'),false,file);assert.equal(file.includes('..'),false,file);}
});

test('only exact manually reviewed screenshot bytes and paths are admitted',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../docs/screenshots/reviewed-images.json',import.meta.url)));
 for(const file of Object.keys(manifest)){
  const bytes=readFileSync(new URL('../'+file,import.meta.url));
  assert.equal(reviewedScreenshot(file,bytes,manifest),true,file);
  const changed=Buffer.from(bytes);changed[changed.length-1]^=1;
  assert.equal(reviewedScreenshot(file,changed,manifest),false);
  assert.equal(reviewedScreenshot(file,Buffer.concat([bytes,Buffer.from('private metadata')]),manifest),false);
  assert.equal(reviewedScreenshot('assets/renamed.jpg',bytes,manifest),false);
  assert.equal(reviewedScreenshot(file,bytes,{}),false);
  assert.equal(reviewedScreenshot('docs/screenshots/../private.jpg',bytes,manifest),false);
 }
});
