import {mkdirSync,readFileSync,writeFileSync,renameSync,chmodSync,existsSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
export const DEFAULTS=Object.freeze({version:1,primaryModel:'',fallbackModel:'',embeddingModel:'',temperature:0.7,maxTokens:2048,timeoutMs:30000,concurrency:2,retries:2,retryDelayMs:800,budgetTokens:100000,reasoning:false});
const id=v=>typeof v==='string'&&v.length<=160&&/^[a-zA-Z0-9_.:/-]*$/.test(v);
const int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
export function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Неверные настройки');
 const next={...DEFAULTS};
 for(const [k,v] of Object.entries(input)){
  if(k==='version'){if(v!==1)throw Error('Неподдерживаемая версия настроек');continue;}
  if(!Object.hasOwn(DEFAULTS,k))throw Error('Неизвестное поле настроек: '+k);
  if(['primaryModel','fallbackModel','embeddingModel'].includes(k)){if(!id(v))throw Error('Некорректный ID модели');next[k]=v;}
  else if(k==='reasoning'){if(typeof v!=='boolean')throw Error('reasoning: ожидается boolean');next[k]=v;}
  else if(k==='temperature'){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>2)throw Error('temperature вне диапазона');next[k]=v;}
  else if(!int(v,...({maxTokens:[1,131072],timeoutMs:[1000,120000],concurrency:[1,8],retries:[0,5],retryDelayMs:[100,30000],budgetTokens:[0,100000000]}[k]??[0,0])))throw Error('Недопустимое значение '+k);
  else next[k]=v;
 }
 return next;
}
export function atomicJson(file,data){
 mkdirSync(dirname(file),{recursive:true});
 const tmp=file+'.tmp-'+process.pid+'-'+Date.now();
 try{writeFileSync(tmp,JSON.stringify(data,null,2),{mode:0o600,flag:'wx'});renameSync(tmp,file);if(process.platform!=='win32')chmodSync(file,0o600);}
 finally{if(existsSync(tmp))rmSync(tmp,{force:true});}
}
export function loadSettings(root){
 const file=join(root,'data','cloudru-settings.json');
 try{return validate(JSON.parse(readFileSync(file,'utf8')));}catch{return {...DEFAULTS};}
}
export function saveSettings(root,input){const settings=validate(input);atomicJson(join(root,'data','cloudru-settings.json'),settings);return settings;}
const dpapi=String.raw`$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$mode=$args[0]
$payload=[Console]::In.ReadToEnd()
if($mode -eq 'encrypt') {
 $bytes=[Text.Encoding]::UTF8.GetBytes($payload)
 $sealed=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
 [Console]::Out.Write([Convert]::ToBase64String($sealed))
} else {
 $bytes=[Convert]::FromBase64String($payload)
 $unsealed=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
 [Console]::Out.Write([Text.Encoding]::UTF8.GetString($unsealed))
}`;
function protect(mode,content){
 if(process.platform!=='win32')throw Error('Хранение секретов доступно только на Windows с DPAPI');
 const p=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',dpapi,mode],{input:content,encoding:'utf8',maxBuffer:65536,windowsHide:true});
 if(p.status!==0||!p.stdout)throw Error('Ошибка Windows DPAPI');
 return p.stdout;
}
export function saveKey(root,key){
 if(typeof key!=='string'||key.length<12||key.length>8192||/[\x00-\x1f\x7f]/.test(key))throw Error('Некорректный формат API-ключа');
 const sealed=protect('encrypt',key.trim());
 atomicJson(join(root,'data','cloudru-secret.dpapi.json'),{version:1,protected:sealed});
}
export function readKey(root){
 try{const data=JSON.parse(readFileSync(join(root,'data','cloudru-secret.dpapi.json'),'utf8'));return protect('decrypt',data.protected);}
 catch{return null;}
}
export function deleteKey(root){rmSync(join(root,'data','cloudru-secret.dpapi.json'),{force:true});}
export function hasKey(root){return existsSync(join(root,'data','cloudru-secret.dpapi.json'));}
