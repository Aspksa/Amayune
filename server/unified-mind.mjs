import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

/** Non-destructive consolidated timeline across existing personality stores. */
export function collectMindTimeline({soul,evolution,growth,living,mind}){
 const rows=[];
 const append=(source,kind,items,label)=>{for(const item of items||[])rows.push({source,kind,description:String(item[label]??'').slice(0,500),created:Number(item.created)||0})};
 append('living','memory',living.memories(), 'summary');
 append('living','milestone',living.milestones(),'description');
 append('living','thread',living.threads(),'summary');
 append('growth','episode',growth.episodes(),'summary');
 append('growth','goal',growth.goals(),'description');
 append('evolution','experience',evolution.experiences(),'description');
 append('evolution','version',evolution.history(),'reason');
 append('mind','review',mind.events(),'detail');
 return rows.filter(r=>r.description).sort((a,b)=>b.created-a.created).slice(0,120);
}
export function createUnifiedMindStore(root){
 mkdirSync(join(root,'data'),{recursive:true});
 const db=new DatabaseSync(join(root,'data','unified-mind.db'));
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,created INTEGER NOT NULL,content TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,action TEXT NOT NULL,detail TEXT NOT NULL,created INTEGER NOT NULL);`);
 return {
  capture(sources){const timeline=collectMindTimeline(sources),id=randomUUID();db.prepare('INSERT INTO snapshots VALUES(?,?,?)').run(id,Date.now(),JSON.stringify(timeline));return {id,count:timeline.length}},
  latest(){const row=db.prepare('SELECT * FROM snapshots ORDER BY created DESC,rowid DESC LIMIT 1').get();return row?{id:row.id,created:row.created,timeline:JSON.parse(row.content)}:null},
  audit(action,detail){db.prepare('INSERT INTO audit VALUES(?,?,?,?)').run(randomUUID(),String(action).slice(0,80),String(detail).slice(0,500),Date.now())},
  history(){return db.prepare('SELECT * FROM audit ORDER BY created DESC LIMIT 50').all()},
  close(){db.close()}
 };
}
