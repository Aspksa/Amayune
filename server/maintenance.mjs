import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {loadSettings,validate,saveSettings,hasKey} from './settings.mjs';
const MAX=100000;
const appearanceKeys=new Set(['version','theme','accent','customAccent','scale','customScale','radius','customRadius','sidebar','density','font','fontSize','lineHeight','shadow','glow','opacity','animation','reduceMotion']);
function validateAppearance(value){if(value===null)return null;if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>MAX||Object.keys(value).some(k=>!appearanceKeys.has(k)))throw Object.assign(Error('Некорректная тема'),{status:400});return value;}
export function createBackup(root,appearance){
 appearance=validateAppearance(appearance);
 const result={format:'amayune-backup',version:1,createdAt:new Date().toISOString(),cloud:loadSettings(root),appearance:appearance??null};
 return result;
}
export function restoreBackup(root,archive){
 if(!archive||typeof archive!=='object'||Array.isArray(archive)||archive.format!=='amayune-backup'||archive.version!==1)throw Object.assign(Error('Неподдерживаемая резервная копия'),{status:400});
 const cloud=validate(archive.cloud);
 const appearance=archive.appearance;
 validateAppearance(appearance);
 saveSettings(root,cloud);
 return {cloud,appearance};
}
export function diagnostics(root){
 let settingsFile='defaults';
 try{if(existsSync(join(root,'data','cloudru-settings.json'))){JSON.parse(readFileSync(join(root,'data','cloudru-settings.json'),'utf8'));settingsFile='saved';}}catch{settingsFile='invalid';}
 return {node:process.version,platform:process.platform,uptimeSeconds:Math.floor(process.uptime()),settingsFile,keyStored:hasKey(root),keyProtection:process.platform==='win32'?'DPAPI':'Windows DPAPI unavailable',checkedAt:new Date().toISOString()};
}
