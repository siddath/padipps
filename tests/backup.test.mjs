import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerprintPack,encodeBackup,decodeBackup} from '../backup-engine.js';
import {freshState} from '../engine.js';

test('pack fingerprints ignore object key order but change with learning content',async()=>{
  const a={id:'a',sessions:[{id:'x',prompt:'Why?'}]};
  assert.equal(await fingerprintPack(a),await fingerprintPack({sessions:[{prompt:'Why?',id:'x'}],id:'a'}));
  assert.notEqual(await fingerprintPack(a),await fingerprintPack({...a,sessions:[{id:'x',prompt:'What?'}]}));
});
test('notebook and focus backups reject other packs and changed revisions',()=>{
  const context={packId:'a',fingerprint:'one'},state=freshState();
  const text=encodeBackup('notebook',context,state);
  assert.deepEqual(JSON.parse(decodeBackup(text,'notebook',context)),state);
  assert.throws(()=>decodeBackup(text,'notebook',{...context,packId:'b'}),/different study pack/);
  assert.throws(()=>decodeBackup(text,'notebook',{...context,fingerprint:'two'}),/different study pack/);
  assert.throws(()=>decodeBackup(text,'focus',context),/focus backup/);
  assert.throws(()=>decodeBackup('{bad','notebook',context),/malformed/);
});
