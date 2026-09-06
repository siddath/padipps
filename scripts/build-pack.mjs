// Reads only the two files explicitly documented by the local authoring contract.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {parsePack} from '../pack-engine.js';

const [source,output,...extra]=process.argv.slice(2);
if(!source||!output||extra.length){console.error('Usage: npm run build:pack -- source-folder output.json');process.exitCode=1;}
else {
 try {
  const folder=resolve(source);
  const metadata=JSON.parse(await readFile(join(folder,'pack.json'),'utf8'));
  const sessions=JSON.parse(await readFile(join(folder,'sessions.json'),'utf8'));
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata)||Object.hasOwn(metadata,'sessions'))throw Error('pack.json must contain pack metadata without a sessions field.');
  const result=parsePack(JSON.stringify({version:1,pack:{...metadata,sessions}}));
  if(!result.ok)throw Error(result.errors.join('\n'));
  await writeFile(resolve(output),JSON.stringify(result.value,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(`Built a validated pack: ${result.pack.sessions.length} lessons, ${result.pack.tracks.length} tracks. Review and import the output yourself.`);
 } catch(error){console.error(error.code==='EEXIST'?'Output exists. Choose a new output filename to preserve the previous revision.':error.code?`Could not read or write the selected files (${error.code}).`:error instanceof SyntaxError?'Source JSON is invalid. Check pack.json and sessions.json.':error.message);process.exitCode=1;}
}
