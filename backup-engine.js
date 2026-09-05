/** Bind portable learner data to the exact curriculum it describes. */
function canonical(value) {
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value && typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export async function fingerprintPack(pack) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(pack)));
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function encodeBackup(kind,context,state) {
  return JSON.stringify({format:`padipps-${kind}`,version:1,packId:context.packId,packFingerprint:context.fingerprint,state},null,2);
}
export function decodeBackup(text,kind,context) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>2*1024*1024)throw Error('Backup must be JSON smaller than 2 MB.');
  let value;try{value=JSON.parse(text);}catch{throw Error('Backup contains malformed JSON.');}
  if(!value || value.format!==`padipps-${kind}` || value.version!==1 || !value.state)throw Error(`Choose a Padipps ${kind} backup exported from this app.`);
  if(value.packId!==context.packId || value.packFingerprint!==context.fingerprint)throw Error('This backup belongs to a different study pack or revision. Open its original pack before restoring it.');
  return JSON.stringify(value.state);
}
