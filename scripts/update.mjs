import {validateSignedManifest,inspectStagedFiles} from './update-validation.mjs';
import {readFileSync,existsSync,mkdirSync,copyFileSync,rmSync,writeFileSync,lstatSync,renameSync} from 'node:fs';
import {join,dirname,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
const defaultRoot=dirname(dirname(fileURLToPath(import.meta.url)));
const within=(base,path)=>{const rel=relative(base,path);return rel!==''&&rel!=='..'&&!rel.startsWith('..'+sep)&&!rel.startsWith(sep);};
const atomicJson=(path,data)=>{const temp=path+'.'+randomUUID()+'.tmp';writeFileSync(temp,JSON.stringify(data),{flag:'wx'});renameSync(temp,path);};
function noLinks(root,path){
 let current=root;
 if(existsSync(current)&&lstatSync(current).isSymbolicLink())throw Error('Linked root refused');
 for(const segment of path.split('/')){current=join(current,segment);if(existsSync(current)&&lstatSync(current).isSymbolicLink())throw Error('Linked target refused');}
}
export function restoreUpdate(root,backup){
 const journal=JSON.parse(readFileSync(join(backup,'journal.json'),'utf8'));
 if(journal.root!==root||!Array.isArray(journal.entries))throw Error('Invalid rollback journal');
 for(const entry of [...journal.entries].reverse()){
  const dst=resolve(root,entry.path),old=resolve(backup,'files',entry.path);
  if(!within(root,dst)||!within(join(backup,'files'),old))throw Error('Unsafe rollback path');
  noLinks(root,entry.path);
  if(entry.existed){
   if(!existsSync(old))throw Error('Missing backup: '+entry.path);
   if(createHash('sha256').update(readFileSync(old)).digest('hex')!==entry.backupSha256)throw Error('Backup integrity mismatch: '+entry.path);
   mkdirSync(dirname(dst),{recursive:true});copyFileSync(old,dst);
  }else rmSync(dst,{force:true});
 }
 return true;
}
export function applyUpdate(manifestFile,root=defaultRoot,onPrepared=()=>{}){
 const stage=join(root,'.runtime','updates','staged');
 const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
 const files=validateSignedManifest(manifest,process.env.AMAYUNE_UPDATE_PUBLIC_KEY);
 inspectStagedFiles(stage,files);
 const changes=files.map(entry=>{
  const src=resolve(stage,entry.path),dst=resolve(root,entry.path);
  if(!within(stage,src)||!within(root,dst))throw Error('Path escape');
  noLinks(root,entry.path);
  if(existsSync(dst)&&!lstatSync(dst).isFile())throw Error('Target is not a file');
  if(createHash('sha256').update(readFileSync(src)).digest('hex').toLowerCase()!==entry.sha256.toLowerCase())throw Error('Hash mismatch');
  return {path:entry.path,src,dst,existed:existsSync(dst)};
 });
 const backup=join(root,'.runtime','backups','update-'+randomUUID());
 mkdirSync(join(backup,'files'),{recursive:true});
 for(const c of changes){if(c.existed){const old=join(backup,'files',c.path);mkdirSync(dirname(old),{recursive:true});copyFileSync(c.dst,old);c.backupSha256=createHash('sha256').update(readFileSync(old)).digest('hex');}}
 atomicJson(join(backup,'journal.json'),{root,entries:changes.map(({path,existed,backupSha256})=>({path,existed,backupSha256}))});
 // Persist the recovery pointer before the first replacement.
 onPrepared(backup);
 try{for(const c of changes){mkdirSync(dirname(c.dst),{recursive:true});const temp=c.dst+'.amayune-'+randomUUID()+'.tmp';try{copyFileSync(c.src,temp);renameSync(temp,c.dst);}finally{rmSync(temp,{force:true});}}}
 catch(error){try{restoreUpdate(root,backup);}catch(rollback){throw new AggregateError([error,rollback],'Update and rollback failed');}throw error;}
 return backup;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{console.log('Backup: '+applyUpdate(process.argv[2]??join(defaultRoot,'.runtime','updates','staged','manifest.json')));}
 catch(e){console.error('Update aborted: '+e.message);process.exitCode=1;}
}
