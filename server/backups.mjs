import {mkdirSync,readdirSync,readFileSync,writeFileSync,renameSync,rmSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createBackup,restoreBackup} from './maintenance.mjs';
const directory=root=>join(root,'data','backups');
const pattern=/^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/;
export function listBackups(root){try{return readdirSync(directory(root)).filter(x=>pattern.test(x)).sort().reverse().map(name=>({name,size:statSync(join(directory(root),name)).size}));}catch{return [];}}
export function makeBackup(root,retention=10){
 if(!Number.isInteger(retention)||retention<1||retention>30)throw Error('Недопустимое число копий');
 const dir=directory(root);mkdirSync(dir,{recursive:true});
 const name='backup-'+new Date().toISOString().replace(/:/g,'-').replace('.','-')+'.json';
 const destination=join(dir,name),temp=destination+'.tmp';
 // Never include credentials: only validated model settings. Browser appearance is exported separately.
 const payload=createBackup(root,null);
 try{writeFileSync(temp,JSON.stringify(payload,null,2),{flag:'wx',mode:0o600});renameSync(temp,destination);}
 finally{rmSync(temp,{force:true});}
 for(const old of listBackups(root).slice(retention))rmSync(join(dir,old.name),{force:true});
 return {name};
}
export function recoverBackup(root,name){if(typeof name!=='string'||!pattern.test(name))throw Error('Неверное имя резервной копии');const raw=readFileSync(join(directory(root),name),'utf8');return restoreBackup(root,JSON.parse(raw));}
