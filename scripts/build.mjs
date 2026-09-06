import { mkdir, copyFile, rm, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STATIC_FILES } from '../public-assets.mjs';
const root=await realpath(fileURLToPath(new URL('../',import.meta.url)));
const output=path.join(root,'dist');
const checked=[];
for(const file of STATIC_FILES){
  if(path.isAbsolute(file)||file.split('/').includes('..'))throw Error('Unsafe public asset path');
  const source=path.join(root,file),resolved=await realpath(source),stat=await lstat(source);
  if(!resolved.startsWith(root+path.sep)||!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1)throw Error(`Public asset must be an ordinary in-repo file: ${file}`);
  checked.push({file,source});
}
// dist is generated output. Start clean so stale local files cannot enter a release.
await rm(output,{recursive:true,force:true});
// Only the explicit public asset list is copied; private packs and backups are excluded.
for(const {file,source} of checked){const target=path.join(output,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(source,target);}
console.log(`Built ${checked.length} allowlisted public assets in dist/. No backend or local data included.`);
