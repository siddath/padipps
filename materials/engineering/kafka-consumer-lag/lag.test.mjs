import test from 'node:test';
import assert from 'node:assert/strict';
import {measureGap} from './lag.mjs';

test('a committed-position gap is measured in offsets',()=>{
  assert.deepEqual(measureGap({logEnd:700,committed:620}),{status:'known',gap:80});
  assert.deepEqual(measureGap({logEnd:700,committed:700}),{status:'known',gap:0});
});
test('unknown and inconsistent observations are not healthy zeros',()=>{
  assert.deepEqual(measureGap({logEnd:700,committed:null}),{status:'unknown',gap:null});
  assert.throws(()=>measureGap({logEnd:700,committed:701}),/invalid/i);
  assert.throws(()=>measureGap({logEnd:-1,committed:0}),/invalid/i);
  assert.throws(()=>measureGap(null),/invalid/i);
});
