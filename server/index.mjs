import http from 'node:http';
import {analyzeTask,buildContext,extractCandidates,summarizeHistory,checkAnswer,evaluateSamples,createScheduler,routeModel} from './intelligence.mjs';
import {openMemory} from './memory.mjs';
import {embedCloud} from './embeddings.mjs';
import {createAutoIndexer} from './auto-index.mjs';
import {generate,getUsage,streamGenerate} from './inference.mjs';
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
let memoryPromise;const memory=()=>memoryPromise??=(openMemory(root).catch(e=>{memoryPromise=null;throw e}));
const autoIndex=createAutoIndexer({memory,readKey});
const scheduler=createScheduler();scheduler.enqueue('semantic-index',()=>autoIndex.schedule());
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
  if(req.method==='GET'&&(url.pathname==='/chat'||url.pathname==='/chat.html')){const html=readFileSync(join(root,'web','chat.html'),'utf8').replace('__CSRF_TOKEN__',token);res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});return res.end(html);}
  if(req.method==='GET'&&(url.pathname==='/chat.js'||url.pathname==='/chat-extras.js'||url.pathname==='/chat.css')){const ext=url.pathname.endsWith('.js')?'text/javascript':'text/css';res.writeHead(200,{'content-type':ext+'; charset=utf-8','cache-control':'no-store'});return res.end(readFileSync(join(root,'web',url.pathname.slice(1))));}
  if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html')){
   const html=readFileSync(join(root,'web','index.html'),'utf8').replace('__CSRF_TOKEN__',token);
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});return res.end(html);
  }
  if(req.method==='GET'&&url.pathname==='/app.js'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});return res.end(readFileSync(join(root,'web','app.js')));}
  if(req.method==='GET'&&url.pathname==='/style.css'){res.writeHead(200,{'content-type':'text/css; charset=utf-8'});return res.end(readFileSync(join(root,'web','style.css')));}
  if(!url.pathname.startsWith('/api/'))return reply(res,404,{error:'Не найдено'});
  if(!auth(req))return reply(res,403,{error:'Доступ запрещён'});
  if(req.method==='POST'&&url.pathname==='/api/intelligence/analyze'){const {prompt}=await body(req,18000);if(typeof prompt!=='string'||prompt.length>16000)return reply(res,400,{error:'Некорректный запрос'});const task=analyzeTask(prompt);return reply(res,200,{task,route:routeModel(task,loadSettings(root))});}
  if(req.method==='POST'&&url.pathname==='/api/intelligence/candidates'){const {messages}=await body(req,150000);if(!Array.isArray(messages)||messages.length>200)return reply(res,400,{error:'Некорректные сообщения'});return reply(res,200,{candidates:extractCandidates(messages)});}
  if(req.method==='POST'&&url.pathname==='/api/intelligence/summary'){const {messages}=await body(req,150000);if(!Array.isArray(messages)||messages.length>200)return reply(res,400,{error:'Некорректные сообщения'});return reply(res,200,{summary:summarizeHistory(messages)});}
  if(req.method==='POST'&&url.pathname==='/api/intelligence/review'){const {answer}=await body(req,20000);return reply(res,200,{review:checkAnswer(answer)});}
  if(req.method==='POST'&&url.pathname==='/api/intelligence/evaluate'){const {samples}=await body(req,150000);if(!Array.isArray(samples)||samples.length>100)return reply(res,400,{error:'Некорректные образцы'});return reply(res,200,{evaluation:evaluateSamples(samples)});}
  if(req.method==='POST'&&url.pathname==='/api/intelligence/tick')return reply(res,200,{results:await scheduler.tick()});
  if(req.method==='POST'&&url.pathname==='/api/knowledge/index')return reply(res,200,await autoIndex.schedule()||{indexed:0,status:'already-running'});
  if(req.method==='GET'&&url.pathname==='/api/knowledge')return reply(res,200,{knowledge:(await memory()).knowledge()});
  if(req.method==='POST'&&url.pathname==='/api/knowledge'){const {content,source}=await body(req,22000);return reply(res,201,{knowledge:(await memory()).addKnowledge(content,source)});}
  if(req.method==='PUT'&&url.pathname==='/api/knowledge/verify'){const {id,verified}=await body(req);const result=(await memory()).verifyKnowledge(id,verified);if(verified)void autoIndex.schedule();return reply(res,200,{knowledge:result});}
  if(req.method==='DELETE'&&url.pathname==='/api/knowledge'){const {id}=await body(req);return reply(res,200,(await memory()).removeKnowledge(id));}
  if(req.method==='POST'&&url.pathname==='/api/knowledge/search'){const {query}=await body(req);return reply(res,200,{matches:(await memory()).recall(query)});}
  if(req.method==='GET'&&url.pathname==='/api/chats/all')return reply(res,200,{chats:(await memory()).listAll()});
  if(req.method==='GET'&&url.pathname==='/api/chats/search')return reply(res,200,{matches:(await memory()).searchChats(url.searchParams.get('q')||'')});
  if(req.method==='GET'&&url.pathname==='/api/chats/messages'){const id=url.searchParams.get('id');const cursor=url.searchParams.get('before');let before=null;if(cursor){try{before=JSON.parse(cursor)}catch{return reply(res,400,{error:'Некорректный курсор'})}if(!Number.isSafeInteger(before?.created)||typeof before.id!=='string')return reply(res,400,{error:'Некорректный курсор'})}return reply(res,200,{messages:(await memory()).history(id,before,url.searchParams.get('limit'))});}
  if(req.method==='POST'&&url.pathname==='/api/chats/upsert')return reply(res,200,(await memory()).upsertChat(await body(req)));
  if(req.method==='POST'&&url.pathname==='/api/chats/message'){const {chatId,message}=await body(req,120000);return reply(res,200,(await memory()).appendMessage(chatId,message));}
  if(req.method==='POST'&&url.pathname==='/api/chats/import')return reply(res,200,(await memory()).importLegacy((await body(req,10000000)).chats));
  if(req.method==='DELETE'&&url.pathname==='/api/chats/item')return reply(res,200,(await memory()).deleteChat((await body(req)).id));
  if(req.method==='GET'&&url.pathname==='/api/chats')return reply(res,200,{chats:(await memory()).list()});
  if(req.method==='PUT'&&url.pathname==='/api/chats'){const {chats}=await body(req,2_000_000);(await memory()).save(chats);return reply(res,200,{saved:true});}
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
  if(req.method==='POST'&&url.pathname==='/api/chat/stream'){
   const key=readKey(root);if(!key)return reply(res,409,{error:'Ключ Cloud.ru не сохранён'});
   const {prompt}=await body(req,18000);
   if(typeof prompt!=='string'||!prompt.trim()||prompt.length>16000)return reply(res,400,{error:'Некорректный запрос'});
   res.writeHead(200,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
   try{let facts=(await memory()).recall(prompt);void autoIndex.schedule();try{const semantic=await autoIndex.recall(prompt,key);facts=[...semantic,...facts.filter(f=>!semantic.some(v=>v.id===f.id))].slice(0,5)}catch{/* keyword fallback */}const enriched=buildContext({prompt,facts});await streamGenerate(root,key,enriched.slice(0,16000),chunk=>{if(!res.destroyed)res.write(chunk)});}catch(e){if(!res.destroyed)res.write('\n[Ошибка потока: '+(e.status?'Cloud.ru HTTP '+e.status:'соединение прервано')+']');}
   if(!res.destroyed)res.end();return;
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

const backupTimer=setInterval(()=>{try{tickBackup(root);}catch{console.error('Scheduled backup failed (no secrets logged)');}scheduler.enqueue('semantic-index',()=>autoIndex.schedule());void scheduler.tick().catch(()=>{});},60000);
backupTimer.unref();
