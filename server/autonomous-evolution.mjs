import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const short=(x,n=400)=>String(x??'').trim().slice(0,n);
export function chooseOpening({topics=[],last=0,now=Date.now(),enabled=false,quiet=false}={}){
 if(!enabled||quiet||now-last<6*60*60*1000)return null;
 const topic=topics.find(x=>x.status==='active'&&['goal','interest'].includes(x.kind));
 return topic? 'Хочешь вернуться к теме: '+short(topic.detail,160)+'?':'Привет! Хочешь немного пообщаться?';
}
export function reflectionHints(warnings=[]){
 const unique=[...new Set(warnings.map(x=>short(x,120)).filter(Boolean))].slice(0,5);
 return unique.map(x=>'Проверить качество ответа: '+x);
}
export function createAutonomousEvolution(root){
 mkdirSync(join(root,'data'),{recursive:true});
 const db=new DatabaseSync(join(root,'data','autonomous-evolution.db'));
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL,voice INTEGER NOT NULL,quiet_start INTEGER NOT NULL,quiet_end INTEGER NOT NULL,last_opening INTEGER NOT NULL);
 INSERT OR IGNORE INTO settings VALUES(1,0,0,22,8,0);
 CREATE TABLE IF NOT EXISTS experiences(id TEXT PRIMARY KEY,summary TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,kind TEXT NOT NULL,detail TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,description TEXT NOT NULL,created INTEGER NOT NULL);`);
 const settings=()=>db.prepare('SELECT * FROM settings WHERE id=1').get();
 const list=(name,limit=50)=>db.prepare('SELECT * FROM '+name+' ORDER BY created DESC,rowid DESC LIMIT ?').all(limit);
 return {
  settings,
  configure({enabled,voice,quiet_start,quiet_end}={}){const s=settings();const start=quiet_start??s.quiet_start,end=quiet_end??s.quiet_end;if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||start>23||end<0||end>23)throw Error('Invalid quiet hours');db.prepare('UPDATE settings SET enabled=?,voice=?,quiet_start=?,quiet_end=? WHERE id=1').run(enabled===undefined?s.enabled:Number(enabled===true),voice===undefined?s.voice:Number(voice===true),start,end);return settings()},
  opening(topics=[],now=Date.now(),hour=new Date(now).getHours()){const s=settings();const quiet=s.quiet_start>s.quiet_end?(hour>=s.quiet_start||hour<s.quiet_end):(hour>=s.quiet_start&&hour<s.quiet_end);const message=chooseOpening({topics,last:s.last_opening,now,enabled:!!s.enabled,quiet});if(message)db.prepare('UPDATE settings SET last_opening=? WHERE id=1').run(now);return message?{message,voice:!!s.voice}:null},
  remember(summary){if(!short(summary))throw Error('Empty experience');const id=randomUUID();db.prepare('INSERT INTO experiences VALUES(?,?,?)').run(id,short(summary),Date.now());return id},
  experiences:()=>list('experiences'),
  propose(kind,detail){if(!['style','interest','memory','voice'].includes(kind)||!short(detail))throw Error('Invalid proposal');const id=randomUUID();db.prepare('INSERT INTO proposals VALUES(?,?,?,?,?)').run(id,kind,short(detail),'pending',Date.now());return id},
  decide(id,approve){const status=approve?'approved':'rejected';const r=db.prepare("UPDATE proposals SET status=? WHERE id=? AND status='pending'").run(status,id);if(!r.changes)throw Error('Unknown pending proposal');if(approve)db.prepare('INSERT INTO versions VALUES(?,?,?)').run(randomUUID(),'Approved proposal '+id,Date.now());return status},
  proposals:()=>list('proposals'),
  versions:()=>list('versions'),
  forget(id){db.prepare('DELETE FROM experiences WHERE id=?').run(id);db.prepare('DELETE FROM proposals WHERE id=?').run(id)},
  close(){db.close()}
 };
}
