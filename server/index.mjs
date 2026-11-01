import http from 'node:http';
import {generate,getUsage} from './inference.mjs';
import {checkGitHubUpdate,updateHistory,updateChanges} from './github-updates.mjs';
import {stageSignedRelease} from '../scripts/stage-release.mjs';
import {requestInstallation,updateStatus} from '../scripts/update-lifecycle.mjs';
import {getBackupPolicy,saveBackupPolicy,tickBackup} from './backup-policy.mjs';
import {listBackups,makeBackup,recoverBackup} from './backups.mjs';
import {createBackup,restoreBackup,diagnostics} from './maintenance.mjs';
import {listCloudModels} from './cloudru.mjs';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEFAULTS,loadSettings,saveSettings,saveKey,readKey,hasKey,deleteKey} from './settings.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const host='127.0.0.1',port=Number(process.env.PORT||3000);
const token=randomBytes(32).toString('hex');
const api='https://foundation-models.api.cloud.ru/v1/models';
function reply(res,code,obj){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(JSON.stringify(obj));}
function body(req,limit=12000){return new Promise((resolve,reject)=>{let value='';req.on('data',chunk=>{value+=chunk;if(value.length>limit){reject(Object.assign(Error('Слишком большой запрос'),{status:413}));req.resume();}});req.on('end',()=>{try{resolve(JSON.parse(value||'{}'));}catch{reject(Error('Некорректный JSON'));}});req.on('error',reject);});}
function safeHost(req){return req.headers.host===host+':'+port||req.headers.host==='localhost:'+port;}
function sameOrigin(req){const origin=req.headers.origin;return !origin||origin==='http://'+host+':'+port||origin==='http://localhost:'+port;}
function auth(req){const provided=req.headers['x-amayune-token'];return typeof provided==='string'&&provided.length===token.length&&timingSafeEqual(Buffer.from(provided),Buffer.from(token));}
const server=http.createServer(async(req,res)=>{
 try{
  if(!safeHost(req)||!sameOrigin(req))return reply(res,403,{error:'Недопустимый источник запроса'});
  const url=new URL(req.url,'http://'+host+':'+port);
  if(req.method==='GET'&&url.pathname==='/health')return reply(res,200,{status:'ok',instanceId:process.env.AMAYUNE_INSTANCE_ID||null});
  if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html')){
   const html=readFileSync(join(root,'web','index.html'),'utf8').replace('__CSRF_TOKEN__',token);
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});return res.end(html);
  }
  if(req.method==='GET'&&url.pathname==='/app.js'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});return res.end(readFileSync(join(root,'web','app.js')));}
  if(req.method==='GET'&&url.pathname==='/style.css'){res.writeHead(200,{'content-type':'text/css; charset=utf-8'});return res.end(readFileSync(join(root,'web','style.css')));}
  if(!url.pathname.startsWith('/api/'))return reply(res,404,{error:'Не найдено'});
  if(!auth(req))return reply(res,403,{error:'Доступ запрещён'});
  if(req.method==='GET'&&url.pathname==='/api/update/history')return reply(res,200,{history:await updateHistory(root)});
  if(req.method==='GET'&&url.pathname==='/api/update/changes')return reply(res,200,{changes:await updateChanges(url.searchParams.get('sha'))});
  if(req.method==='GET'&&url.pathname==='/api/update/check')return reply(res,200,{update:await checkGitHubUpdate(root),installation:updateStatus(root)});
  if(req.method==='POST'&&url.pathname==='/api/update/install'){
   const {sha}=await body(req);
   const current=await checkGitHubUpdate(root);
   if(current.sha!==sha||current.ci!=='success')return reply(res,409,{error:'Версия или статус CI изменились'});
   if(!process.env.AMAYUNE_UPDATE_PUBLIC_KEY)return reply(res,409,{error:'Не настроен доверенный ключ подписи'});
   return reply(res,200,{installation:requestInstallation(root,sha,process.env.AMAYUNE_UPDATE_PUBLIC_KEY)});
  }
  if(req.method==='POST'&&url.pathname==='/api/update/stage'){
   const {sha,manifest}=await body(req,1_000_000);
   const update=await checkGitHubUpdate(root);
   if(update.sha!==sha||update.ci!=='success')return reply(res,409,{error:'Версия GitHub изменилась или CI не пройден'});
   if(!process.env.AMAYUNE_UPDATE_PUBLIC_KEY)return reply(res,409,{error:'Ключ проверки подписи обновлений не настроен'});
   return reply(res,200,{staged:await stageSignedRelease({root,sha,manifest,publicKey:process.env.AMAYUNE_UPDATE_PUBLIC_KEY})});
  }
  if(req.method==='GET'&&url.pathname==='/api/usage')return reply(res,200,{usage:getUsage(root),budgetTokens:loadSettings(root).budgetTokens});
  if(req.method==='POST'&&url.pathname==='/api/generate'){
   const key=readKey(root);if(!key)return reply(res,409,{error:'Ключ Cloud.ru не сохранён'});
   return reply(res,200,await generate(root,key,(await body(req)).prompt));
  }
  if(req.method==='GET'&&url.pathname==='/api/backup-policy')return reply(res,200,{policy:getBackupPolicy(root)});
  if(req.method==='PUT'&&url.pathname==='/api/backup-policy')return reply(res,200,{policy:saveBackupPolicy(root,await body(req))});
  if(req.method==='GET'&&url.pathname==='/api/backups')return reply(res,200,{backups:listBackups(root)});
  if(req.method==='POST'&&url.pathname==='/api/backups')return reply(res,200,{backup:makeBackup(root)});
  if(req.method==='POST'&&url.pathname==='/api/backups/restore'){const {name}=await body(req);return reply(res,200,{restored:recoverBackup(root,name)});}
  if(req.method==='GET'&&url.pathname==='/api/diagnostics')return reply(res,200,{diagnostics:diagnostics(root)});
  if(req.method==='POST'&&url.pathname==='/api/backup')return reply(res,200,{backup:createBackup(root,(await body(req)).appearance??null)});
  if(req.method==='POST'&&url.pathname==='/api/restore')return reply(res,200,{restored:restoreBackup(root,await body(req))});
  if(req.method==='GET'&&url.pathname==='/api/settings')return reply(res,200,{settings:loadSettings(root),hasKey:hasKey(root)});
  if(req.method==='PUT'&&url.pathname==='/api/settings')return reply(res,200,{settings:saveSettings(root,await body(req))});
  if(req.method==='PUT'&&url.pathname==='/api/key'){
   const {key}=await body(req);
   if(typeof key!=='string'||key.length<12||key.length>8192||key.trim()!==key||/[\x00-\x1f\x7f]/.test(key))return reply(res,400,{error:'Некорректный формат API-ключа'});
   const verified=await listCloudModels(key);
   saveKey(root,key);
   return reply(res,200,{saved:true,verified:true,modelCount:verified.length,checkedAt:new Date().toISOString()});
  }
  if(req.method==='DELETE'&&url.pathname==='/api/key'){deleteKey(root);return reply(res,200,{saved:false});}
  if(req.method==='GET'&&url.pathname==='/api/models'){
   const key=readKey(root);if(!key)return reply(res,409,{error:'Ключ Cloud.ru не сохранён'});
   const result=await listCloudModels(key);return reply(res,200,{models:result,checkedAt:new Date().toISOString()});
  }
  return reply(res,404,{error:'Метод не поддерживается'});
 }catch(e){const code=e.status||(/Некоррект|Недопустим|Слишком большой|Неизвестн/.test(e.message)?400:503);return reply(res,code,{error:e.status?e.message:code===400?e.message:'Ошибка локального сервера или сети'});}
});
server.listen(port,host,()=>console.log('Amayune ready at http://'+host+':'+port));

const backupTimer=setInterval(()=>{try{tickBackup(root);}catch{console.error('Scheduled backup failed (no secrets logged)');}},60000);
backupTimer.unref();
