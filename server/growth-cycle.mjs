import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const clean=(x,n=180)=>String(x??'').trim().slice(0,n);
export function planGrowth({turns=[],entries=[],reflections=[]}={}){
 const approved=entries.filter(x=>x.status==='active'&&['interest','goal'].includes(x.kind)).slice(0,4);
 const pending=entries.filter(x=>x.status==='pending'&&x.kind==='interest');
 const recent=turns.slice(0,12);
 const avg=recent.length?recent.reduce((s,x)=>s+Number(x.score||0),0)/recent.length:null;
 const latest=reflections[0]?.summary||'';
 const guidance=[];
 if(avg!==null&&avg<65)guidance.push('Prioritize accuracy, context and corrections over conversational flourish.');
 if(approved.length)guidance.push('If relevant to the current user message, naturally connect to an approved topic; do not force it.');
 if(latest)guidance.push('Use past quality feedback to avoid repeated issues; never describe internal scores unless asked.');
 guidance.push('Maintain a consistent, respectful personality; do not invent feelings, memories, or completed actions.');
 return {guidance:guidance.join(' '),approved:approved.map(x=>clean(x.detail)),pending:pending.length,average:avg===null?null:Math.round(avg)};
}
export function createGrowthCycle(root,{getTurns,getEntries,getReflections,intervalMs=15*60*1000}={}){
 mkdirSync(join(root,'data'),{recursive:true});
 const db=new DatabaseSync(join(root,'data','growth-cycle.db'));
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS cycles(id TEXT PRIMARY KEY,turn_id TEXT NOT NULL UNIQUE,average INTEGER,approved TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS suggestions(id TEXT PRIMARY KEY,topic TEXT NOT NULL UNIQUE,status TEXT NOT NULL,created INTEGER NOT NULL);`);
 let timer,busy=false;
 const context=()=>planGrowth({turns:getTurns?.()||[],entries:getEntries?.()||[],reflections:getReflections?.()||[]});
 const tick=()=>{if(busy)return null;busy=true;try{
  const turns=getTurns?.()||[];if(turns.length<3)return null;
  const turnId=clean(turns[0]?.id,100);if(!turnId||db.prepare('SELECT 1 FROM cycles WHERE turn_id=?').get(turnId))return null;
  const plan=context();const id=randomUUID();
  db.prepare('INSERT INTO cycles VALUES(?,?,?,?,?)').run(id,turnId,plan.average,JSON.stringify(plan.approved),Date.now());
  return {id,...plan};
 }finally{busy=false}};
 return {tick,context,start(){if(timer)return;timer=setInterval(()=>{try{tick()}catch{}},intervalMs);timer.unref?.()},stop(){if(timer)clearInterval(timer);timer=null},history(){return db.prepare('SELECT * FROM cycles ORDER BY created DESC LIMIT 30').all()},close(){this.stop();db.close()}};
}
