import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {catalogForPack} from '../catalog.js';
import {parsePack,sessionsForTrack} from '../pack-engine.js';
import {fingerprintPack,encodeBackup,decodeBackup} from '../backup-engine.js';
import {freshState} from '../engine.js';
import {studyContext,validateStudyContext} from '../chat-context.js';
import {STATIC_FILES} from '../public-assets.mjs';

const read=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');
const current=parsePack(read('packs/engineering.json')).pack;
const previousText=read('packs/engineering-v1.json');
const previous=parsePack(previousText).pack;
const AI_ROUTE=['ai-llm-foundations','ai-rag-foundations','ai-advanced-rag','ai-rag-architectures','ai-single-agent','ai-multi-agent','ai-context-evals','ai-production-capstone'];

test('AI has eight ordered modules plus shared companion lessons; Kafka has one distributed home',()=>{
 assert.deepEqual(sessionsForTrack(current,'ai').map(s=>s.id),[...AI_ROUTE,'job-api','ai-gateway']);
 assert.ok(current.tracks.find(t=>t.id==='distributed').sessionIds.includes('kafka-consumer-lag'));
 assert.deepEqual(current.tracks.filter(t=>t.sessionIds.includes('kafka-consumer-lag')).map(t=>t.id),['distributed']);
 const byId=new Map(current.sessions.map(s=>[s.id,s]));
 for(const [index,id] of AI_ROUTE.entries()){
  assert.deepEqual(byId.get(id).prerequisites,index?[AI_ROUTE[index-1]]:[],id);
  const folder='materials/engineering/'+id;
  assert.ok(existsSync(new URL('../'+folder+'/README.md',import.meta.url)),id);
  assert.match(read(folder+'/README.md'),/unsolved|TODO|independent/i,id);
 }
});

test('each visible track resolves its own ordered lesson identities and tasks',()=>{
 const catalog=catalogForPack(current);
 assert.equal(catalog[0].sessions.length,40);
 for(const track of current.tracks){
  const visible=catalog.find(t=>t.id===track.id).sessions;
  assert.deepEqual(visible.map(s=>s.id),track.sessionIds,track.id);
  assert.ok(visible.every(s=>typeof s.task==='string'&&s.task.includes('materials/engineering/')),track.id);
 }
 assert.equal(catalog.find(t=>t.id==='ai').sessions[0].id,'ai-llm-foundations');
 assert.notEqual(catalog.find(t=>t.id==='dsa').sessions[0].task,catalog.find(t=>t.id==='backend').sessions[0].task);
});

test('previous engineering bytes and lessons remain unchanged and their backups stay separate',async()=>{
 assert.equal(createHash('sha256').update(previousText).digest('hex'),'93575e626f58d9afb136d0355bd3c9b7893743a6005c769b82ca0c21cafdc14c');
 assert.equal(previous.id,'engineering-v1');assert.equal(current.id,'engineering-v2');
 for(const old of previous.sessions)assert.deepEqual(current.sessions.find(s=>s.id===old.id),old,old.id);
 assert.ok(STATIC_FILES.includes('packs/engineering-v1.json'));
 const oldContext={packId:previous.id,fingerprint:await fingerprintPack(previous)};
 const newContext={packId:current.id,fingerprint:await fingerprintPack(current)};
 assert.notEqual(oldContext.fingerprint,newContext.fingerprint);
 const state=freshState();const original=encodeBackup('notebook',oldContext,state);
 assert.deepEqual(JSON.parse(decodeBackup(original,'notebook',oldContext)),state);
 assert.throws(()=>decodeBackup(original,'notebook',newContext),/different study pack/);
});

test('new lessons never attach recognition keys, trace decisions or rubrics to tutor context',()=>{
 for(const id of [...AI_ROUTE,'kafka-consumer-lag']){
  const session=current.sessions.find(s=>s.id===id);const before=JSON.stringify(session);
  for(let stage=0;stage<=4;stage++){
   const context=studyContext(session,stage);assert.equal(validateStudyContext(context).ok,true,id);
   for(const field of ['answer','options','feedback','decision','trace','rubric','checklist'])assert.equal(Object.hasOwn(context,field),false,`${id}: ${field}`);
   if(stage===0||stage===2)assert.equal(Object.hasOwn(context,'model'),false,id);
  }
  assert.equal(JSON.stringify(session),before,id);
 }
});
