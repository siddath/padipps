/** Redacted pre-publication checks. These are guardrails, not a secret-free certification. */
import {execFileSync} from 'node:child_process';
import {readFile, lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:20*1024*1024});
const forbiddenPath=/(?:^|\/)(?:\.env(?:\..*)?|\.codex|\.claude|\.agents|\.ssh|auth\.json|credentials\.json|private-packs|local-packs|backups|evidence|learning-records)(?:\/|$)|\.(?:pem|key|p12|sqlite|db|zip|tar|gz)$/i;
const credentialRules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['openai-key',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}/g],
  ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,})/g],
  ['cloud-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['bearer-token',/\bBearer\s+[A-Za-z0-9_-]{32,}(?:\.[A-Za-z0-9_-]+){0,2}/g],
  ['absolute-home-path',/\/(?:Users|home)\/[A-Za-z0-9._-]+\//g],
  ['personal-teaching-contract',/\bTEACHING_[A-Z][A-Z_]+\.md\b/g],
];
const sampleHost=host=>/(?:^|\.)(?:example\.(?:com|net|org)|localhost)$|\.test$/i.test(host);

export function inspectText(text){
  const findings=[];
  for(const [rule,pattern] of credentialRules){
    pattern.lastIndex=0;
    for(const match of text.matchAll(pattern))findings.push({rule,line:text.slice(0,match.index).split('\n').length});
  }
  for(const match of text.matchAll(/https?:\/\/[^\s<>"'`]+/g)){
    try{const url=new URL(match[0]);if((url.username||url.password)&&!sampleHost(url.hostname))findings.push({rule:'embedded-url-credentials',line:text.slice(0,match.index).split('\n').length});}catch{}
  }
  return findings;
}

export function inspectPath(file){return forbiddenPath.test(file)?[{rule:'private-or-unreviewed-file',line:0}]:[];}

async function main(){
  const findings=[],seen=new Set();let files=0,blobs=0,commits=0;
  const inspect=(file,buffer,revision)=>{
    files++;
    for(const item of inspectPath(file))findings.push({file,...item,...(revision?{revision}:{})});
    if(buffer.includes(0)){
      if(!file.endsWith('.webp'))findings.push({file,rule:'unreviewed-binary',line:0});
      else if(['EXIF','XMP ','ICCP'].some(tag=>buffer.includes(Buffer.from(tag))))findings.push({file,rule:'image-metadata-needs-review',line:0});
      return;
    }
    for(const item of inspectText(buffer.toString('utf8')))findings.push({file,...item,...(revision?{revision}:{})});
  };
  const paths=git('ls-files','--cached','--others','--exclude-standard','-z').toString().split('\0').filter(Boolean);
  for(const file of new Set(paths)){
    const full=path.join(root,file),stat=await lstat(full);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1){findings.push({file,rule:'linked-or-special-file',line:0});continue;}
    inspect(file,await readFile(full));
  }
  if(process.argv.includes('--history')){
    const revisions=git('rev-list','--all').toString().trim().split('\n').filter(Boolean);commits=revisions.length;
    for(const revision of revisions){
      const emails=git('show','-s','--format=%ae%n%ce',revision).toString().trim().split('\n');
      if(emails.some(email=>!/(?:@(?:users\.)?noreply\.github\.com$|^noreply@github\.com$)/i.test(email)))findings.push({file:'<commit metadata>',revision,rule:'non-noreply-author-email',line:0});
      for(const entry of git('ls-tree','-r','-z',revision).toString().split('\0').filter(Boolean)){
        const [header,file]=entry.split('\t');const [mode,type,oid]=header.split(' ');
        if(type!=='blob'||mode!=='100644'&&mode!=='100755'){findings.push({file,revision,rule:'linked-or-special-history-entry',line:0});continue;}
        if(seen.has(oid))continue;seen.add(oid);blobs++;
        inspect(file,git('cat-file','blob',oid),revision);
      }
    }
  }
  if(findings.length){console.error(JSON.stringify({status:'REVIEW_REQUIRED',files,historyCommits:commits,historyBlobs:blobs,findings},null,2));process.exitCode=1;}
  else console.log(JSON.stringify({status:'PASS',files,historyCommits:commits,historyBlobs:blobs,scope:'High-confidence patterns, paths, ordinary files and image metadata; manual content review is still required.'}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
