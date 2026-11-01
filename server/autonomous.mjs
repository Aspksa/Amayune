import {resolve,relative,isAbsolute,join} from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';

export function safePath(root,path){
 if(typeof path!=='string'||!path||path.includes('\\0'))throw Error('Invalid path');
 const base=resolve(root),target=resolve(base,path),rel=relative(base,target);
 if(rel==='..'||rel.startsWith('..\\')||rel.startsWith('../')||isAbsolute(rel))throw Error('Path outside workspace');
 return target;
}
export function createToolEngine(root,{allowWrite=false}={}){
 return {async run(name,args={}){
  if(name==='read_file'){const p=safePath(root,args.path);return (await readFile(p,'utf8')).slice(0,65536)}
  if(name==='write_file'){if(!allowWrite)throw Error('Write requires approval');const p=safePath(root,args.path);if(typeof args.content!=='string'||args.content.length>65536)throw Error('Invalid content');await writeFile(p,args.content,{flag:'wx'});return 'created'}
  throw Error('Tool not allowed');
 }};
}
export function plan(goal){if(typeof goal!=='string'||!goal.trim()||goal.length>8000)throw Error('Invalid goal');return {goal,steps:[{kind:'reason',input:goal},{kind:'review'}],maxSteps:8}};
export function createAgent({reason,review=async()=>({ok:true}),maxSteps=8}){
 return {async execute(task,{signal}={}){const p=plan(task),trace=[];for(const step of p.steps.slice(0,Math.min(16,maxSteps))){if(signal?.aborted)throw Error('Cancelled');const result=step.kind==='reason'?await reason(step.input):await review(trace.at(-1)?.result);trace.push({kind:step.kind,result});if(step.kind==='review'&&result?.ok===false)break;}return {status:trace.at(-1)?.result?.ok===false?'needs-review':'completed',trace}}};
}
export function createAutonomousStore(root){
 const db=new DatabaseSync(join(root,'data','autonomous.db'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,goal TEXT NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,job_id TEXT NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL,created INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS facts(id TEXT PRIMARY KEY,subject TEXT NOT NULL,predicate TEXT NOT NULL,object TEXT NOT NULL,source TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0);CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,question TEXT NOT NULL,correction TEXT NOT NULL,created INTEGER NOT NULL)');
 return {
  submit(goal){plan(goal);const id=randomUUID();db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?)').run(id,goal,'pending',0,Date.now());return id},
  pending(){return db.prepare("SELECT * FROM jobs WHERE state IN ('pending','running') ORDER BY updated LIMIT 20").all()},
  setState(id,state){if(!['pending','running','done','failed'].includes(state))throw Error('Invalid state');db.prepare('UPDATE jobs SET state=?,updated=? WHERE id=?').run(state,Date.now(),id)},
  log(jobId,kind,detail){db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(randomUUID(),jobId,kind,JSON.stringify(detail).slice(0,20000),Date.now())},
  events(jobId){return db.prepare('SELECT kind,detail,created FROM events WHERE job_id=? ORDER BY created').all(jobId)},
  fact(subject,predicate,object,source){const id=createHash('sha256').update(JSON.stringify([subject,predicate,object,source])).digest('hex');db.prepare('INSERT OR IGNORE INTO facts VALUES(?,?,?,?,?,0)').run(id,subject,predicate,object,source);return id},
  verifyFact(id){db.prepare('UPDATE facts SET verified=1 WHERE id=?').run(id)},
  related(subject){return db.prepare('SELECT * FROM facts WHERE subject=? AND verified=1 LIMIT 100').all(subject)},
  feedback(question,correction){db.prepare('INSERT INTO feedback VALUES(?,?,?,?)').run(randomUUID(),question,correction,Date.now())},
  corrections(){return db.prepare('SELECT question,correction FROM feedback ORDER BY created DESC LIMIT 30').all()},
  close(){db.close()}
 };
}
export function selectModel(models,{complex=false}={}){
 const available=(models||[]).filter(m=>m&&m.available!==false&&typeof m.id==='string');
 if(!available.length)return null;
 return [...available].sort((a,b)=>(complex?(b.quality||0)-(a.quality||0):(a.cost||0)-(b.cost||0)))[0].id;
}
export async function research(query,sources){
 if(typeof query!=='string'||query.length>4000)throw Error('Invalid query');
 // Sources are caller-provided trusted adapters; never fetch arbitrary URLs.
 const found=[];for(const source of sources.slice(0,5)){const items=await source.search(query);for(const item of items.slice(0,10))found.push({title:String(item.title).slice(0,200),snippet:String(item.snippet).slice(0,2000),source:source.name})}
 return found;
}
export function assess(output){const text=String(output||'');return {ok:!!text.trim(),warnings:[...(/гарантирую|100%|guaranteed/i.test(text)?['overconfidence']:[]),...(/я удалил|я установил|i deleted/i.test(text)?['unverified-action']:[])]}}
export function retryDelay(attempt){return Math.min(3600000,1000*2**Math.min(12,Math.max(0,attempt)))}
