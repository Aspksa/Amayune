import {mkdirSync,appendFileSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
export function logger(root){
  mkdirSync(join(root,'logs'),{recursive:true});
  return (stage,message,code=0)=>{
    appendFileSync(join(root,'logs','launch.jsonl'),JSON.stringify({time:new Date().toISOString(),stage,message:String(message),code})+'\n');
    console.log('['+stage+'] '+message);
  };
}
export function ensureWritable(root){
  for(const dir of ['.runtime','logs','data']){
    mkdirSync(join(root,dir),{recursive:true});
    const file=join(root,dir,'.test-'+process.pid);
    writeFileSync(file,'ok',{flag:'wx'});unlinkSync(file);
  }
}
export function getState(root){try{return JSON.parse(readFileSync(join(root,'.runtime','server-state.json'),'utf8'));}catch{return null;}}
