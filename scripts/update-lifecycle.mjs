import {existsSync,readFileSync,writeFileSync,mkdirSync,rmSync,renameSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {applyUpdate,restoreUpdate} from './update.mjs';
import {validateSignedManifest,inspectStagedFiles} from './update-validation.mjs';
const directory=root=>join(root,'.runtime','updates');
const pending=root=>join(directory(root),'pending.json');
function atomicWrite(path,value){const tmp=path+'.'+randomUUID()+'.tmp';try{writeFileSync(tmp,JSON.stringify(value),{flag:'wx'});renameSync(tmp,path);}finally{rmSync(tmp,{force:true});}}
export function updateStatus(root){
 const p=pending(root);
 if(!existsSync(p))return {state:'idle'};
 try{const x=JSON.parse(readFileSync(p,'utf8'));return {state:x.state,sha:x.sha,at:x.at};}
 catch{return {state:'invalid'};}
}
export function requestInstallation(root,sha,publicKey){
 if(!/^[a-f0-9]{40}$/i.test(sha))throw Error('Invalid commit');
 if(existsSync(pending(root)))throw Error('Update already pending');
 const stage=join(directory(root),'staged');
 const source=JSON.parse(readFileSync(join(stage,'source.json'),'utf8'));
 if(source.sha!==sha)throw Error('Staged update does not match requested commit');
 const manifest=JSON.parse(readFileSync(join(stage,'manifest.json'),'utf8'));
 const files=validateSignedManifest(manifest,publicKey);
 inspectStagedFiles(stage,files);
 mkdirSync(directory(root),{recursive:true});
 writeFileSync(pending(root),JSON.stringify({state:'ready',sha,at:new Date().toISOString()}),{flag:'wx'});
 return {state:'ready',sha};
}
export function applyPendingUpdate(root){
 const file=pending(root);
 if(!existsSync(file))return null;
 const p=JSON.parse(readFileSync(file,'utf8'));
 if(p.state==='booting')throw Error('Previous update not confirmed; rollback required');
 if(p.state!=='ready')throw Error('Unknown update state');
 const stage=join(directory(root),'staged');
 const source=JSON.parse(readFileSync(join(stage,'source.json'),'utf8'));
 if(source.sha!==p.sha)throw Error('Staged commit changed since queueing');
 const manifest=join(stage,'manifest.json');
 const backup=applyUpdate(manifest,root,(prepared)=>{
  p.state='booting';p.backup=prepared;
  atomicWrite(file,p);
 });
 return p;
}
export function finishPendingUpdate(root,healthy){
 const file=pending(root);
 if(!existsSync(file))return false;
 const p=JSON.parse(readFileSync(file,'utf8'));
 if(p.state!=='booting')return false;
 if(!healthy){
  restoreUpdate(root,p.backup);
 }else{
  atomicWrite(join(directory(root),'installed.json'),{sha:p.sha,at:new Date().toISOString()});
  rmSync(join(directory(root),'staged'),{recursive:true,force:true});
 }
 rmSync(file,{force:true});
 return true;
}
