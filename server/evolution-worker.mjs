import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
export function summarizeQuality(turns=[]){
 const recent=turns.slice(0,20);
 if(!recent.length)return null;
 const average=Math.round(recent.reduce((sum,t)=>sum+Number(t.score||0),0)/recent.length);
 const issues=new Map();
 for(const t of recent){let items=[];try{items=JSON.parse(t.issues||'[]')}catch{}for(const item of items){const key=String(item).slice(0,120);issues.set(key,(issues.get(key)||0)+1)}}
 const recurring=[...issues].filter(([,count])=>count>=2).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([issue,count])=>({issue,count}));
 return {average,count:recent.length,recurring};
}
export function chooseTopic(entries=[]){
 const approved=entries.filter(x=>x.status==='active'&&['goal','interest'].includes(x.kind));
 return approved[0]?.detail?.slice(0,160)||null;
}
export function createEvolutionWorker(root,{getTurns,getEntries,onReflection,intervalMs=15*60*1000}={}){
 mkdirSync(join(root,'data'),{recursive:true});
 const db=new DatabaseSync(join(root,'data','evolution-worker.db'));
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS reflections(id TEXT PRIMARY KEY,summary TEXT NOT NULL,average INTEGER NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
 const meta=(key)=>db.prepare('SELECT value FROM meta WHERE key=?').get(key)?.value;
 const setMeta=(key,value)=>db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,String(value));
 let timer=null,busy=false;
 const tick=()=>{if(busy)return null;busy=true;try{
  const turns=getTurns?.()||[];const summary=summarizeQuality(turns);if(!summary||summary.count<3)return null;
  const latest=turns[0]?.id||'';if(meta('last_turn')===latest)return null;
  const topic=chooseTopic(getEntries?.()||[]);
  const message='Последние '+summary.count+' ответов: средняя оценка '+summary.average+'.'+(summary.recurring.length?' Повторяющиеся замечания: '+summary.recurring.map(x=>x.issue).join('; ')+'.':'')+(topic?' Подтверждённый интерес: '+topic+'.':'');
  const id=randomUUID();db.prepare('INSERT INTO reflections VALUES(?,?,?,?)').run(id,message,summary.average,Date.now());setMeta('last_turn',latest);
  onReflection?.({id,message,summary,topic});
  return {id,message,summary,topic};
 }finally{busy=false}};
 return {tick,start(){if(timer)return;timer=setInterval(()=>{try{tick()}catch{ /* background failure must not affect chat */ }},intervalMs);timer.unref?.()},stop(){if(timer)clearInterval(timer);timer=null},reflections(){return db.prepare('SELECT * FROM reflections ORDER BY created DESC LIMIT 30').all()},close(){this.stop();db.close()}};
}
