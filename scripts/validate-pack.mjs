import {readFile} from 'node:fs/promises';
import {parsePack} from '../pack-engine.js';

const [file,...extra]=process.argv.slice(2);
if(!file||extra.length){console.error('Usage: npm run validate:pack -- path/to/pack.json');process.exitCode=1;}
else {
 try {
  const result=parsePack(await readFile(file,'utf8'));
  if(!result.ok)throw Error(result.errors.join('\n'));
  console.log(`Valid pack: ${result.pack.sessions.length} lessons, ${result.pack.tracks.length} tracks. Review teaching accuracy and privacy before importing.`);
 } catch(error){console.error(error.code ? `Could not read the selected pack (${error.code}).` : error.message);process.exitCode=1;}
}
