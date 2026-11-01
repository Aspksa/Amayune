import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {atomicJson} from './settings.mjs';
import {listBackups,makeBackup} from './backups.mjs';
export const DEFAULT_BACKUP_POLICY=Object.freeze({enabled:false,intervalHours:24,retention:10,lastRunAt:null});
export function validateBackupPolicy(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Некорректная политика копирования');
 if(typeof value.enabled!=='boolean'||!Number.isInteger(value.intervalHours)||![6,12,24,48,168].includes(value.intervalHours)||!Number.isInteger(value.retention)||value.retention<1||value.retention>30)throw Error('Недопустимые параметры резервирования');
 if(value.lastRunAt!==null&&!(typeof value.lastRunAt==='string'&&/^\d{4}-\d\d-\d\dT/.test(value.lastRunAt)&&Number.isFinite(Date.parse(value.lastRunAt))))throw Error('Неверная дата резервирования');
 return {enabled:value.enabled,intervalHours:value.intervalHours,retention:value.retention,lastRunAt:value.lastRunAt};
}
export function getBackupPolicy(root){
 try{return validateBackupPolicy(JSON.parse(readFileSync(join(root,'data','backup-policy.json'),'utf8')));}catch{return {...DEFAULT_BACKUP_POLICY};}
}
export function saveBackupPolicy(root,input){
 const old=getBackupPolicy(root);
 const next=validateBackupPolicy({...old,...input,lastRunAt:old.lastRunAt});
 atomicJson(join(root,'data','backup-policy.json'),next);return next;
}
export function tickBackup(root,now=Date.now()){
 const policy=getBackupPolicy(root);
 if(!policy.enabled)return {created:false,reason:'disabled'};
 const elapsed=policy.lastRunAt?now-Date.parse(policy.lastRunAt):Infinity;
 if(elapsed>=0&&elapsed<policy.intervalHours*3600000)return {created:false,reason:'not-due'};
 const result=makeBackup(root,policy.retention);
 atomicJson(join(root,'data','backup-policy.json'),{...policy,lastRunAt:new Date(now).toISOString()});
 return {created:true,...result};
}
