import http from 'node:http';
import {analyzeTask,buildContext,extractCandidates,summarizeHistory,checkAnswer,evaluateSamples,createScheduler,routeModel} from './intelligence.mjs';
import {openMemory} from './memory.mjs';
import {createSoulStore,buildSoulContext} from './soul.mjs';
import {createEvolutionStore,evolutionContext} from './soul-evolution.mjs';
import {createGrowthStore,growthContext} from './soul-growth.mjs';
import {createLivingSoulStore,livingContext,eventCandidates} from './living-soul.mjs';
import {formatConversationHistory} from './conversation-context.mjs';
import {createLivingMind,livingMindContext,planInitiative} from './living-mind.mjs';
import {createUnifiedMindStore,collectMindTimeline} from './unified-mind.mjs';
import {createSoulCore,soulCoreContext} from './soul-core.mjs';
import {createSoulLearning,learningContext} from './soul-learning.mjs';
import {createDialogueState,dialogueGuidance} from './living-dialogue.mjs';
import {createAutonomousEvolution,reflectionHints} from './autonomous-evolution.mjs';
import {createLivingEvolution,evolutionGuidance} from './living-evolution.mjs';
import {createEvolutionWorker} from './evolution-worker.mjs';
import {createGrowthCycle} from './growth-cycle.mjs';
import {createEvolutionAudit} from './evolution-audit.mjs';
import {createGenesisCore} from './genesis-core.mjs';
import {episodeGuidance} from './genesis-presence.mjs';
import {createLivingIntelligence} from './living-intelligence.mjs';
import {createRuntimeSupervisor} from './runtime-supervisor.mjs';
import {cognitiveContext} from './cognitive-architecture.mjs';
import {createUnifiedCore} from './unified-core.mjs';
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
let soulInstance;
const soul=()=>soulInstance??=(createSoulStore(root));
let evolutionInstance;
const evolution=()=>evolutionInstance??=(createEvolutionStore(root));
let growthInstance;
const growth=()=>growthInstance??=(createGrowthStore(root));
let livingInstance;
const living=()=>livingInstance??=(createLivingSoulStore(root));
let mindInstance;const mind=()=>mindInstance??=(createLivingMind(root));
let unifiedInstance;const unified=()=>unifiedInstance??=(createUnifiedMindStore(root));
let coreInstance;const core=()=>coreInstance??=(createSoulCore(root));
let learningInstance;const learning=()=>learningInstance??=(createSoulLearning(root));
let dialogueInstance;const dialogue=()=>dialogueInstance??=(createDialogueState(root));
let autonomousInstance;const autonomous=()=>autonomousInstance??=(createAutonomousEvolution(root));
let livingEvolutionInstance;const livingEvolution=()=>livingEvolutionInstance??=(createLivingEvolution(root));
const evolutionWorker=createEvolutionWorker(root,{getTurns:()=>livingEvolution().turns(),getEntries:()=>learning().entries()});evolutionWorker.start();
const growthCycle=createGrowthCycle(root,{getTurns:()=>livingEvolution().turns(),getEntries:()=>learning().entries(),getReflections:()=>evolutionWorker.reflections()});growthCycle.start();
const evolutionAudit=createEvolutionAudit(root,{getEntries:()=>learning().entries(),getTurns:()=>livingEvolution().turns()});evolutionAudit.start();
const genesis=createGenesisCore(root,{getEntries:()=>learning().entries(),getTurns:()=>livingEvolution().turns()});genesis.start();
const intelligence=createLivingIntelligence(root,{getTurns:()=>livingEvolution().turns(),getEntries:()=>learning().entries(),getEvents:()=>core().events()});intelligence.start();
const runtimeSupervisor=createRuntimeSupervisor([{name:'evolution-worker',start:()=>evolutionWorker.start()},{name:'growth-cycle',start:()=>growthCycle.start()},{name:'evolution-audit',start:()=>evolutionAudit.start()},{name:'genesis',start:()=>genesis.start()},{name:'living-intelligence',start:()=>intelligence.start()}],{onFailure:(name,error)=>intelligence.recordFailure(name,error)});runtimeSupervisor.start();
const unifiedCore=createUnifiedCore({getEvents:()=>core().events(),getEntries:()=>learning().entries(),getTurns:()=>livingEvolution().turns(),workers:[{name:'evolution-worker',tick:()=>evolutionWorker.tick()},{name:'growth-cycle',tick:()=>growthCycle.tick()},{name:'evolution-audit',tick:()=>evolutionAudit.tick()},{name:'genesis',tick:()=>genesis.tick()},{name:'living-intelligence',tick:()=>intelligence.tick()}],onFailure:(name,error)=>intelligence.recordFailure(name,error)});
const mindSources=()=>({soul:soul(),evolution:evolution(),growth:growth(),living:living(),mind:mind()});
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
  if(req.method==='POST'&&url.pathname==='/api/intelligence/feedback'){const {request,correction}=await body(req,12000);return reply(res,201,{feedback:(await memory()).recordFeedback(request,correction)});}
  if(req.method==='GET'&&url.pathname==='/api/intelligence/context'){const query=url.searchParams.get('q')||'';return reply(res,200,{matches:(await memory()).recentContext(query)});}
  if(req.method==='POST'&&url.pathname==='/api/intelligence/analyze'){const {prompt,chatId}=await body(req,18000);if(typeof prompt!=='string'||prompt.length>16000)return reply(res,400,{error:'Некорректный запрос'});const task=analyzeTask(prompt);return reply(res,200,{task,route:routeModel(task,loadSettings(root))});}
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
  if(req.method==='GET'&&url.pathname==='/api/evolution/status')return reply(res,200,{current:livingEvolution().current(),versions:livingEvolution().versions(),turns:livingEvolution().turns()});
  if(req.method==='POST'&&url.pathname==='/api/evolution/rollback'){const {id}=await body(req);if(typeof id!=='string')return reply(res,400,{error:'Invalid version'});return reply(res,200,{current:livingEvolution().rollback(id)});}
  if(req.method==='GET'&&url.pathname==='/api/autonomous/state')return reply(res,200,{settings:autonomous().settings(),experiences:autonomous().experiences(),proposals:autonomous().proposals(),versions:autonomous().versions()});
  if(req.method==='POST'&&url.pathname==='/api/autonomous/configure')return reply(res,200,{settings:autonomous().configure(await body(req))});
  if(req.method==='POST'&&url.pathname==='/api/autonomous/opening'){const topics=learning().entries();const selected=evolutionAudit.topic();const ordered=selected?[...topics.filter(x=>x.detail===selected),...topics.filter(x=>x.detail!==selected)]:topics;const opening=autonomous().opening(ordered);if(opening&&selected)evolutionAudit.recordTopic(selected);return reply(res,200,{opening});}
  if(req.method==='POST'&&url.pathname==='/api/autonomous/propose'){const {kind,detail}=await body(req);if(typeof detail!=='string'||detail.length>400||!['style','interest','memory','voice'].includes(kind))return reply(res,400,{error:'Invalid proposal'});return reply(res,201,{id:autonomous().propose(kind,detail)});}
  if(req.method==='POST'&&url.pathname==='/api/autonomous/decide'){const {id,approve}=await body(req);if(typeof id!=='string'||typeof approve!=='boolean')return reply(res,400,{error:'Invalid decision'});return reply(res,200,{status:autonomous().decide(id,approve)});}
  if(req.method==='POST'&&url.pathname==='/api/autonomous/forget'){const {id}=await body(req);if(typeof id!=='string')return reply(res,400,{error:'Invalid id'});autonomous().forget(id);return reply(res,200,{ok:true});}
  if(req.method==='GET'&&url.pathname==='/api/dialogue/state')return reply(res,200,{state:dialogue().state()});
  if(req.method==='POST'&&url.pathname==='/api/dialogue/reset')return reply(res,200,{state:dialogue().reset()});
  if(req.method==='GET'&&url.pathname==='/api/soul-learning')return reply(res,200,{entries:learning().entries(),reviews:learning().reviews(),audit:learning().auditLog()});
  if(req.method==='POST'&&url.pathname==='/api/soul-learning/propose'){const {kind,detail}=await body(req);if(!['preference','goal','interest'].includes(kind)||typeof detail!=='string'||!detail.trim()||detail.length>600)return reply(res,400,{error:'Некорректное предложение'});return reply(res,201,{id:learning().propose(kind,detail)});}
  if(req.method==='POST'&&url.pathname==='/api/soul-learning/action'){const {action,id}=await body(req);if(!['approve','reject','complete','forget'].includes(action)||typeof id!=='string'||!id)return reply(res,400,{error:'Некорректное действие'});learning()[action](id);return reply(res,200,{ok:true});}
  if(req.method==='GET'&&url.pathname==='/api/soul-core')return reply(res,200,{events:core().events(),proposals:core().pending(),reflections:core().reflections(),audit:core().auditLog()});
  if(req.method==='POST'&&url.pathname==='/api/soul-core/propose'){const data=await body(req);if(typeof data.summary!=='string'||!data.summary.trim()||data.summary.length>800||typeof (data.meaning??'')!=='string')return reply(res,400,{error:'Некорректное событие'});return reply(res,201,{id:core().propose(data)});}
  if(req.method==='POST'&&url.pathname==='/api/soul-core/approve'){const {id}=await body(req);if(typeof id!=='string'||!id)return reply(res,400,{error:'Некорректный идентификатор'});return reply(res,200,{id:core().approve(id)});}
  if(req.method==='POST'&&url.pathname==='/api/soul-core/reject'){const {id}=await body(req);if(typeof id!=='string'||!id)return reply(res,400,{error:'Некорректный идентификатор'});core().reject(id);return reply(res,200,{rejected:true});}
  if(req.method==='POST'&&url.pathname==='/api/soul-core/forget'){const {id}=await body(req);if(typeof id!=='string'||!id)return reply(res,400,{error:'Некорректный идентификатор'});core().forget(id);return reply(res,200,{forgotten:true});}
  if(req.method==='GET'&&url.pathname==='/api/mind/timeline')return reply(res,200,{timeline:collectMindTimeline(mindSources())});
  if(req.method==='POST'&&url.pathname==='/api/mind/snapshot')return reply(res,201,{snapshot:unified().capture(mindSources())});
  if(req.method==='GET'&&url.pathname==='/api/mind/snapshot')return reply(res,200,{snapshot:unified().latest()});
  if(req.method==='GET'&&url.pathname==='/api/mind/evolution')return reply(res,200,{profile:evolution().profile(),history:evolution().history(),pending:growth().pending()});
  if(req.method==='POST'&&url.pathname==='/api/mind/evolution/propose'){const {feedback}=await body(req);if(typeof feedback!=='string'||!feedback.trim()||feedback.length>1000)return reply(res,400,{error:'Некорректный отзыв'});return reply(res,201,{proposal:growth().propose(feedback)});}
  if(req.method==='POST'&&url.pathname==='/api/mind/evolution/approve'){const {id}=await body(req);if(typeof id!=='string'||!id)return reply(res,400,{error:'Некорректный идентификатор'});const delta=growth().approve(id);const result=evolution().evolve(delta,'approved feedback '+id);unified().audit('evolve',id);return reply(res,200,{result});}
  if(req.method==='POST'&&url.pathname==='/api/mind/evolution/rollback'){const {id}=await body(req);if(typeof id!=='string'||!id)return reply(res,400,{error:'Некорректный идентификатор'});const version=evolution().rollback(id);unified().audit('rollback',id);return reply(res,200,{version});}
  if(req.method==='GET'&&url.pathname==='/api/mind')return reply(res,200,{state:mind().state(),initiativeEnabled:mind().initiativeEnabled(),events:mind().events()});
  if(req.method==='PUT'&&url.pathname==='/api/mind/initiative'){const {enabled}=await body(req);if(typeof enabled!=='boolean')return reply(res,400,{error:'Некорректный запрос'});return reply(res,200,{enabled:mind().setInitiative(enabled)});}
  if(req.method==='POST'&&url.pathname==='/api/mind/reset')return reply(res,200,{state:mind().reset()});
  if(req.method==='GET'&&url.pathname==='/api/mind/suggestion')return reply(res,200,{suggestion:planInitiative(living().threads(),growth().goals(),{enabled:mind().initiativeEnabled()})});
  if(req.method==='GET'&&url.pathname==='/api/living/proposals')return reply(res,200,{proposals:living().pending()});
  if(req.method==='POST'&&url.pathname==='/api/living/proposals/approve'){const {id}=await body(req);if(typeof id!=='string'||!id)return reply(res,400,{error:'Некорректный идентификатор'});return reply(res,200,{approved:living().approve(id)});}
  if(req.method==='POST'&&url.pathname==='/api/living/proposals/reject'){const {id}=await body(req);if(typeof id!=='string'||!id)return reply(res,400,{error:'Некорректный идентификатор'});living().reject(id);return reply(res,200,{rejected:true});}
  if(req.method==='POST'&&url.pathname==='/api/chat/stream'){
   const key=readKey(root);if(!key)return reply(res,409,{error:'Ключ Cloud.ru не сохранён'});
   const {prompt}=await body(req,18000);
   if(typeof prompt!=='string'||!prompt.trim()||prompt.length>16000||chatId!==undefined&&(typeof chatId!=='string'||chatId.length>128))return reply(res,400,{error:'Некорректный запрос'});
   res.writeHead(200,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
   try{let facts=(await memory()).recall(prompt);void autoIndex.schedule();try{const semantic=await autoIndex.recall(prompt,key);facts=[...semantic,...facts.filter(f=>!semantic.some(v=>v.id===f.id))].slice(0,5)}catch{/* keyword fallback */}const store=await memory();const history=store.recentContext(prompt);const corrections=store.feedback(prompt);const summary=history.map(h=>h.title+': '+h.text).join(' | ')+'\n'+corrections.map(f=>'Исправление пользователя: '+f.correction).join(' | ');const enriched=buildContext({prompt,facts,summary});const soulContext=buildSoulContext({message:prompt,preferences:soul().preferences(),corrections:soul().corrections(),reflections:soul().reflections()});const evolving=evolution();const evolvingContext=evolutionContext({message:prompt,profile:evolving.profile(),experiences:evolving.experiences()});const growing=growth();const growingContext=growthContext({message:prompt,episodes:growing.episodes(prompt),goals:growing.goals()});const lived=living();const livedContext=livingContext({message:prompt,memories:lived.memories(prompt),habits:lived.habits(),interests:lived.interests(),openThreads:lived.threads(),milestones:lived.milestones()});const mindState=mind().observe(prompt);const initiative=planInitiative(lived.threads(),growing.goals(),{enabled:mind().initiativeEnabled()});const mindContext=livingMindContext(mindState,{initiative});const autobiography=soulCoreContext({events:core().events(),query:prompt,reflections:core().reflections()});const livingStyle=dialogueGuidance({affect:dialogue().observe(prompt),history:chatId?store.history(chatId,null,16):[]});const learningNotes=learningContext({preferences:learning().entries().filter(x=>x.kind==='preference'&&x.status==='active'),goals:learning().entries().filter(x=>x.kind==='goal'),mood:mindState.mood});const dialogue=chatId?formatConversationHistory(store.history(chatId,null,16),prompt):'';const reflectionNote=evolutionWorker.reflections()[0]?.summary||'';const combined=(cognitiveContext({prompt,events:core().events(),entries:learning().entries(),turns:livingEvolution().turns()}).text+'\n\n'+intelligence.context(prompt).text+'\n\n'+episodeGuidance(core().events(),prompt)+'\n\n'+genesis.context().guidance+'\n\n'+growthCycle.context().guidance+'\nQuality trend: '+evolutionAudit.context().progress.trend+'. Avoid repeating unverified memories.\n\n'+evolutionGuidance(livingEvolution().current())+'\n'+reflectionNote.slice(0,500)+'\n\n'+livingStyle+'\n\n'+learningNotes+'\n\n'+autobiography+'\n\n'+mindContext+'\n\n'+soulContext+'\n\n'+evolvingContext+'\n\n'+growingContext+'\n\n'+livedContext+'\n\n'+enriched+'\n\n'+dialogue).slice(0,16000);let responseText='';await streamGenerate(root,key,combined,chunk=>{responseText+=chunk.slice(0,Math.max(0,16000-responseText.length));if(!res.destroyed)res.write(chunk)});const review=mind().review(responseText,{memories:lived.memories(prompt)});core().review(review.warnings);learning().review(responseText,review.warnings);livingEvolution().observe(responseText,review.warnings);unifiedCore.runCycle();for(const hint of reflectionHints(review.warnings)){if(autonomous().proposals().filter(x=>x.status==='pending').length>=20)break;if(!autonomous().proposals().some(x=>x.status==='pending'&&x.detail===hint))autonomous().propose('style',hint)}}catch(e){if(!res.destroyed)res.write('\n[Ошибка потока: '+(e.status?'Cloud.ru HTTP '+e.status:'соединение прервано')+']');}
   if(!res.destroyed)res.end();if(chatId){for(const item of eventCandidates(prompt)){try{living().propose('memory',item.summary)}catch{}}}return;
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

const backupTimer=setInterval(()=>{try{tickBackup(root);}catch{console.error('Scheduled backup failed (no secrets logged)');}void (async()=>{try{const store=await memory();store.enqueueJob('semantic-index','semantic-index');for(const job of store.pendingJobs()){try{const result=await autoIndex.schedule();store.finishJob(job.id,!result?.error)}catch{store.finishJob(job.id,false)}}}catch{}})();},60000);
backupTimer.unref();
