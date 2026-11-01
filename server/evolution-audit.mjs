import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const normalize=x=>String(x??'').trim().toLocaleLowerCase('ru').replace(/\s+/g,' ').slice(0,180);
export function memoryAudit(entries=[]){
 const active=entries.filter(x=>x.status==='active'&&['preference','interest','goal'].includes(x.kind));
 const seen=new Set(),duplicates=[];
 for(const item of active){const key=item.kind+':'+normalize(item.detail);if(seen.has(key))duplicates.push(item.id);else seen.add(key)}
 return {duplicates,activeCount:active.length};
}
export function measureProgress(turns=[]){
 const scores=turns.slice(0,12).map(t=>Number(t.score)).filter(Number.isFinite);
 if(scores.length<6)return {trend:'insufficient',delta:null};
 const n=Math.floor(scores.length/2);
 const recent=scores.slice(0,n).reduce((a,b)=>a+b,0)/n;
 const older=scores.slice(n,n*2).reduce((a,b)=>a+b,0)/n;
 const delta=Math.round(recent-older);
 return {trend:delta>=5?'improving':delta<=-5?'declining':'stable',delta};
}
export function initiativeTopic(entries=[],recent=[]){
 const approved=entries.filter(x=>x.status==='active'&&['goal','interest'].includes(x.kind));
 const used=new Set(recent.map(x=>normalize(x.topic)));
 return approved.find(x=>!used.has(normalize(x.detail)))?.detail?.slice(0,160)||approved[0]?.detail?.slice(0,160)||null;
}
export function createEvolutionAudit(root,{getEntries,getTurns,intervalMs=15*60*1000}={}){
 mkdirSync(join(root,'data'),{recursive:true});
 const db=new DatabaseSync(join(root,'data','evolution-audit.db'));
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS audits(id TEXT PRIMARY KEY,turn_id TEXT NOT NULL UNIQUE,trend TEXT NOT NULL,delta INTEGER,duplicates TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS topics(id TEXT PRIMARY KEY,topic TEXT NOT NULL,created INTEGER NOT NULL);`);
 let timer;
 const recentTopics=()=>db.prepare('SELECT topic FROM topics ORDER BY created DESC LIMIT 8').all();
 const context=()=>({memory:memoryAudit(getEntries?.()||[]),progress:measureProgress(getTurns?.()||[])});
 const tick=()=>{const turns=getTurns?.()||[];if(turns.length<6)return null;const turnId=String(turns[0]?.id||'');if(!turnId||db.prepare('SELECT 1 FROM audits WHERE turn_id=?').get(turnId))return null;const report=context();const id=randomUUID();db.prepare('INSERT INTO audits VALUES(?,?,?,?,?,?)').run(id,turnId,report.progress.trend,report.progress.delta,JSON.stringify(report.memory.duplicates),Date.now());return {id,...report}};
 const topic=()=>initiativeTopic(getEntries?.()||[],recentTopics());
 const recordTopic=value=>{const allowed=(getEntries?.()||[]).some(x=>x.status==='active'&&['goal','interest'].includes(x.kind)&&x.detail===value);if(!allowed)throw Error('Topic not approved');db.prepare('INSERT INTO topics VALUES(?,?,?)').run(randomUUID(),value,Date.now())};
 return {context,tick,topic,recordTopic,reports:()=>db.prepare('SELECT * FROM audits ORDER BY created DESC LIMIT 30').all(),start(){if(timer)return;timer=setInterval(()=>{try{tick()}catch{}},intervalMs);timer.unref?.()},stop(){if(timer)clearInterval(timer);timer=null},close(){this.stop();db.close()}};
}
