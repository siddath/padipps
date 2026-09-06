import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { catalogForPack, practiceHash, practiceSessions, readPracticeRoute } from '../catalog.js';
import {parsePack,sessionsForTrack,validatePack} from '../pack-engine.js';
const starterText=readFileSync(new URL('../packs/starter.json',import.meta.url),'utf8');
const fixture=()=>JSON.parse(starterText);

test('the only bundled sample is complete, fictional and separate from former starter identity',()=>{
 const parsed=parsePack(starterText);assert.equal(parsed.ok,true,parsed.errors?.join('\n'));
 assert.equal(parsed.pack.id,'padipps-sample-v1');assert.equal(parsed.pack.sessions.length,1);
 assert.equal(parsed.pack.firstSession,'observe-a-scene');
 assert.deepEqual(sessionsForTrack(parsed.pack,'sample').map(s=>s.id),['observe-a-scene']);
});
test('pack parser rejects hostile schema, scripts, non-http sources and oversized input',()=>{
 const extra=fixture();extra.pack.sessions[0].script='alert(1)';assert.equal(validatePack(extra).ok,false);
 const unsafe=fixture();unsafe.pack.sessions[0].sources[0].url='javascript:alert(1)';assert.equal(validatePack(unsafe).ok,false);
 const missing=fixture();delete missing.pack.sessions[0].decision;assert.equal(validatePack(missing).ok,false);
 assert.equal(parsePack('x'.repeat(2*1024*1024)).ok,false);
});
test('pack validates references, safe identifiers and cyclic prerequisites',()=>{
 const missing=fixture();missing.pack.tracks[0].sessionIds[0]='missing';assert.equal(validatePack(missing).ok,false);
 const unsafe=fixture();unsafe.pack.sessions[0].home='<private-path>';assert.equal(validatePack(unsafe).ok,false);
 const reserved=fixture();reserved.pack.tracks[0].id='all';assert.equal(validatePack(reserved).ok,false);
 const cyclic=fixture();cyclic.pack.sessions.push({...structuredClone(cyclic.pack.sessions[0]),id:'second',prerequisites:['observe-a-scene']});cyclic.pack.sessions[0].prerequisites=['second'];cyclic.pack.tracks[0].sessionIds.push('second');assert.equal(validatePack(cyclic).ok,false);
});
test('imported multi-track data filters by ordered identities and search without bundled curriculum',()=>{
 const value=fixture();value.pack.sessions.push({...structuredClone(value.pack.sessions[0]),id:'second',title:'Second fictional example',category:'Another example'});
 value.pack.tracks.push({id:'another',title:'Another',description:'Synthetic filter fixture.',sessionIds:['second']});
 const pack=parsePack(JSON.stringify(value)).pack;const catalog=catalogForPack(pack);
 assert.deepEqual(catalog.map(t=>t.id),['all','sample','another']);
 const sessions=pack.sessions.map(s=>({...s,trackIds:pack.tracks.filter(t=>t.sessionIds.includes(s.id)).map(t=>t.id)}));
 assert.deepEqual(practiceSessions(sessions,'sample').map(s=>s.id),['observe-a-scene']);
 assert.deepEqual(practiceSessions(sessions,'another','fictional').map(s=>s.id),['second']);
 assert.deepEqual(practiceSessions(sessions,'sample','Second'),[]);
 assert.deepEqual(readPracticeRoute('#practice/<bad>?q=scene'),{route:'practice',track:'all',query:'scene'});
 assert.equal(practiceHash('another','two words'),'#practice/another?q=two+words');
});
