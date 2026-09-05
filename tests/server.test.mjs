import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import http from 'node:http';

test('preview serves only public assets with restrictive headers', {timeout:15000}, async()=>{
  const port=20000+Math.floor(Math.random()*20000),base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
  try {
    await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error(`Server exited: ${code}`)));});
    const page=await fetch(base);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);assert.match(await page.text(),/Padipps/);
    for(const file of ['focus-ui.js','reflections.js','backup-engine.js','packs/starter.json','assets/padipps-icon.webp'])assert.equal((await fetch(`${base}/${file}`)).status,200,file);
    for(const file of ['.git/config','README.md','private-packs/notes.json','backups/notebook.json','config.json','tests/engine.test.mjs'])assert.equal((await fetch(`${base}/${file}`)).status,404,file);
    assert.equal((await fetch(base,{method:'POST',body:'no execution'})).status,405);
    const status=await new Promise((resolve,reject)=>{const req=http.get(base,{headers:{host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(status,403);
  } finally {child.kill();}
});
