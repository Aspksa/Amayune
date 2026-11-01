import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const now=()=>Date.now();
const safe=(s,n=250)=>String(s??'').trim().slice(0,n);
export function scoreTurn({answer='',warnings=[]}={}){
 const text=safe(answer,12000);
 const issues=[...new Set(warnings.map(x=>safe(x,120)).filter(Boolean))].slice(0,10);
 return {score:Math.max(0,Math.min(100,70+(text.length>=40?10:0)-(issues.length*12))),issues};
}
export function evolutionGuidance(state){
 const guidance=[];
 if(state?.brevity==='concise')guidance.push('Prefer concise, concrete responses; expand when requested.');
 if(state?.quality==='careful')guidance.push('Verify claims against available context; acknowledge uncertainty and avoid invented memories.');
 return guidance.join(' ');
}
export function createLivingEvolution(root){
 mkdirSync(join(root,'data'),{recursive:true});
 const db=new DatabaseSync(join(root,'data','living-evolution.db'));
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS turns(id TEXT PRIMARY KEY,score INTEGER NOT NULL,issues TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,brevity TEXT NOT NULL,quality TEXT NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,kind TEXT NOT NULL,detail TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL);
 INSERT OR IGNORE INTO versions VALUES('base','normal','normal','Initial baseline',0);`);
 const list=(table,limit=50)=>db.prepare('SELECT * FROM '+table+' ORDER BY created DESC,rowid DESC LIMIT ?').all(limit);
 const current=()=>db.prepare('SELECT * FROM versions ORDER BY created DESC,rowid DESC LIMIT 1').get();
 const propose=(kind,detail)=>{if(!['memory','interest','identity','code'].includes(kind)||!safe(detail))throw Error('Invalid proposal');const id=randomUUID();db.prepare('INSERT INTO proposals VALUES(?,?,?,?,?)').run(id,kind,safe(detail),'pending',now());return id};
 return {
  current,turns:()=>list('turns'),versions:()=>list('versions'),proposals:()=>list('proposals'),
  observe(answer,warnings=[]){
   const result=scoreTurn({answer,warnings});const id=randomUUID();
   db.prepare('INSERT INTO turns VALUES(?,?,?,?)').run(id,result.score,JSON.stringify(result.issues),now());
   const recent=list('turns',8);
   if(recent.length>=4){
    const avg=recent.reduce((sum,x)=>sum+x.score,0)/recent.length;
    const state=current();const quality=avg<65?'careful':'normal';
    if(quality!==state.quality){db.prepare('INSERT INTO versions VALUES(?,?,?,?,?)').run(randomUUID(),state.brevity,quality,'Automatic bounded quality adaptation',now())}
   }
   return {result,state:current()};
  },
  propose,decide(id,approve){const status=approve?'approved':'rejected';const r=db.prepare("UPDATE proposals SET status=? WHERE id=? AND status='pending'").run(status,id);if(!r.changes)throw Error('Unknown pending proposal');return status},
  rollback(versionId){const target=db.prepare('SELECT * FROM versions WHERE id=?').get(versionId);if(!target)throw Error('Unknown version');db.prepare('INSERT INTO versions VALUES(?,?,?,?,?)').run(randomUUID(),target.brevity,target.quality,'Rollback to '+versionId,now());return current()},
  forgetTurn(id){db.prepare('DELETE FROM turns WHERE id=?').run(id)},
  close(){db.close()}
 };
}
