import {existsSync,readFileSync,writeFileSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {applyUpdate} from './update.mjs';
import {validateSignedManifest,inspectStagedFiles} from './update-validation.mjs';
const directory=root=>join(root,'.runtime','updates');
const pending=root=>join(directory(root),'pending.json');
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
 const manifest=join(directory(root),'staged','manifest.json');
 const backup=applyUpdate(manifest);
 p.state='booting';p.backup=backup;
 writeFileSync(file,JSON.stringify(p));
 return p;
}
export function finishPendingUpdate(root,healthy){
 const file=pending(root);
 if(!existsSync(file))return false;
 const p=JSON.parse(readFileSync(file,'utf8'));
 if(p.state!=='booting')return false;
 if(!healthy){
  const manifest=JSON.parse(readFileSync(join(p.backup,'manifest.json'),'utf8'));
  const files=validateSignedManifest(manifest,process.env.AMAYUNE_UPDATE_PUBLIC_KEY);
  for(const entry of files){
   const original=join(p.backup,entry.path),destination=join(root,entry.path);
   if(existsSync(original))copyFileSync(original,destination);
   else rmSync(destination,{force:true});
  }
 }else{
  writeFileSync(join(directory(root),'installed.json'),JSON.stringify({sha:p.sha,at:new Date().toISOString()}));
  rmSync(join(directory(root),'staged'),{recursive:true,force:true});
 }
 rmSync(file,{force:true});
 return true;
}
