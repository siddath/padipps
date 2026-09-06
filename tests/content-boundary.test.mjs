import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {parsePack} from '../pack-engine.js';
import {fingerprintPack,encodeBackup,decodeBackup} from '../backup-engine.js';
import {freshState} from '../engine.js';
import {studyContext,validateStudyContext} from '../chat-context.js';
import {STATIC_FILES} from '../public-assets.mjs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const sample=JSON.parse(read('packs/starter.json'));

test('release tree contains only the neutral sample and no retired curriculum artifacts',()=>{
 assert.deepEqual(readdirSync(new URL('packs/',root)),['starter.json']);
 for(const file of ['materials','docs/AI_ROUTE.md','docs/STUDY_TRACKS.md','docs/screenshots/ai-route.jpg'])assert.equal(existsSync(new URL(file,root)),false,file);
 assert.deepEqual(STATIC_FILES.filter(file=>file.startsWith('packs/')),['packs/starter.json']);
 assert.equal(STATIC_FILES.some(file=>file.startsWith('materials/')),false);
 assert.doesNotMatch(read('packs-ui.js'),/engineering\.json|engineering-v1\.json|data-pack-action="engineering/);
});
test('arbitrary retained imported revisions and their backups keep separate histories',async()=>{
 const previous=structuredClone(sample.pack);previous.id='retained-owner-pack';
 const revised=structuredClone(previous);revised.description='An edited description.';
 const oldContext={packId:previous.id,fingerprint:await fingerprintPack(previous)};
 const newContext={packId:revised.id,fingerprint:await fingerprintPack(revised)};
 assert.notEqual(oldContext.fingerprint,newContext.fingerprint);
 const state=freshState();const encoded=encodeBackup('notebook',oldContext,state);
 assert.deepEqual(JSON.parse(decodeBackup(encoded,'notebook',oldContext)),state);
 assert.throws(()=>decodeBackup(encoded,'notebook',newContext),/different study pack/);
 assert.match(read('content.js'),/ACTIVE_PACK_KEY = 'padipps-active-pack-v1'/);
});
test('sample tutor context retains answer-key and stage boundaries',()=>{
 const session=sample.pack.sessions[0];
 for(let stage=0;stage<=4;stage++){
  const context=studyContext(session,stage);assert.equal(validateStudyContext(context).ok,true);
  for(const field of ['answer','options','feedback','decision','trace','rubric','checklist'])assert.equal(Object.hasOwn(context,field),false,field);
  if(stage===0||stage===2)assert.equal(Object.hasOwn(context,'model'),false);
 }
});
test('local pipeline builds exact schema input, validates, rejects invalid content and preserves existing output',()=>{
 const folder=mkdtempSync(join(tmpdir(),'padipps-source-'));
 try {
  const {sessions,...metadata}=sample.pack;
  writeFileSync(join(folder,'pack.json'),JSON.stringify(metadata));writeFileSync(join(folder,'sessions.json'),JSON.stringify(sessions));
  const output=join(folder,'output.json');
  const build=new URL('scripts/build-pack.mjs',root);const validate=new URL('scripts/validate-pack.mjs',root);
  execFileSync(process.execPath,[fileURLToPath(build),folder,output]);
  assert.deepEqual(parsePack(readFileSync(output,'utf8')).value,sample);
  execFileSync(process.execPath,[fileURLToPath(validate),output]);
  const bytes=readFileSync(output,'utf8');assert.equal(spawnSync(process.execPath,[fileURLToPath(build),folder,output]).status,1);assert.equal(readFileSync(output,'utf8'),bytes);
  writeFileSync(join(folder,'sessions.json'),'[]');const bad=join(folder,'bad.json');assert.equal(spawnSync(process.execPath,[fileURLToPath(build),folder,bad]).status,1);assert.equal(existsSync(bad),false);
  writeFileSync(join(folder,'invalid.json'),'{}');assert.equal(spawnSync(process.execPath,[fileURLToPath(validate),join(folder,'invalid.json')]).status,1);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
