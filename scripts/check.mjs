import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for (const file of (await readdir(new URL('../', import.meta.url))).filter(f=>f.endsWith('.js')||f.endsWith('.mjs'))) {
  const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
console.log('All application modules parse.');
