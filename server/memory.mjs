import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {cosine} from './embeddings.mjs';

export async function openMemory(root){
 let DatabaseSync;
 try{({DatabaseSync}=await import('node:sqlite'))}catch{throw Object.assign(new Error('SQLite requires Node.js 22.13 or newer'),{status:503})}
 const dir=join(root,'data');mkdirSync(dir,{recursive:true});
 const db=new DatabaseSync(join(dir,'amayune.db'));
 db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE; PRAGMA foreign_keys=ON;');
 db.exec(`CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,title TEXT NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ('user','assistant')),text TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS messages_by_chat ON messages(conversation_id,created);
 CREATE TABLE IF NOT EXISTS knowledge(id TEXT PRIMARY KEY,content TEXT NOT NULL,source TEXT NOT NULL,created INTEGER NOT NULL,verified INTEGER NOT NULL DEFAULT 0);`);
 db.exec('CREATE TABLE IF NOT EXISTS knowledge_vectors(knowledge_id TEXT PRIMARY KEY REFERENCES knowledge(id) ON DELETE CASCADE,model TEXT NOT NULL,embedding TEXT NOT NULL)');
 return {
  list(){return db.prepare('SELECT id,title,updated FROM conversations ORDER BY updated DESC LIMIT 100').all().map(c=>({...c,messages:db.prepare('SELECT role,text FROM messages WHERE conversation_id=? ORDER BY created,id LIMIT 200').all(c.id)}))},
  save(chats){if(!Array.isArray(chats)||chats.length>100)throw Object.assign(Error('Некорректные диалоги'),{status:400});
   const insertChat=db.prepare('INSERT INTO conversations(id,title,updated) VALUES(?,?,?)');
   const insertMessage=db.prepare('INSERT INTO messages(id,conversation_id,role,text,created) VALUES(?,?,?,?,?)');
   db.exec('BEGIN IMMEDIATE');
   try{db.exec('DELETE FROM conversations');for(const c of chats){if(typeof c.id!=='string'||c.id.length>128||!c.id||typeof c.title!=='string'||c.title.length>200||!Array.isArray(c.messages)||c.messages.length>200)throw Error('Некорректный чат');insertChat.run(c.id,c.title,Number.isSafeInteger(c.updated)?c.updated:Date.now());for(const m of c.messages){if(!['user','assistant'].includes(m.role)||typeof m.text!=='string'||m.text.length>100000)throw Error('Некорректное сообщение');insertMessage.run(randomUUID(),c.id,m.role,m.text,Date.now())}}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw Object.assign(e,{status:400})}
  },
  addKnowledge(content,source='user'){if(typeof content!=='string'||!content.trim()||content.length>20000||typeof source!=='string'||source.length>200)throw Object.assign(Error('Некорректные знания'),{status:400});const id=randomUUID();db.prepare('INSERT INTO knowledge(id,content,source,created,verified) VALUES(?,?,?,?,0)').run(id,content.trim(),source,Date.now());return {id,verified:false}},
  knowledge(){return db.prepare('SELECT id,content,source,created,verified FROM knowledge ORDER BY created DESC LIMIT 200').all()},
  verifyKnowledge(id,verified){if(typeof id!=='string'||typeof verified!=='boolean')throw Object.assign(Error('Некорректный запрос'),{status:400});const result=db.prepare('UPDATE knowledge SET verified=? WHERE id=?').run(verified?1:0,id);if(!result.changes)throw Object.assign(Error('Запись не найдена'),{status:404});return {id,verified}},
  removeKnowledge(id){const result=db.prepare('DELETE FROM knowledge WHERE id=?').run(id);return {deleted:result.changes>0}},
  recall(query){if(typeof query!=='string')return [];const words=[...new Set((query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[]).slice(-40))];if(!words.length)return [];const rows=db.prepare('SELECT id,content,source FROM knowledge WHERE verified=1 ORDER BY created DESC LIMIT 1000').all();return rows.map(r=>({...r,score:words.reduce((n,w)=>n+(r.content.toLowerCase().includes(w)?1:0),0)})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(({id,content,source})=>({id,content:content.slice(0,2500),source}))},
  setVector(id,model,vector){if(typeof id!=='string'||typeof model!=='string'||!Array.isArray(vector)||vector.length<2||vector.length>8192||!vector.every(Number.isFinite))throw Object.assign(Error('Invalid vector'),{status:400});if(!db.prepare('SELECT 1 FROM knowledge WHERE id=?').get(id))throw Object.assign(Error('Knowledge not found'),{status:404});db.prepare('INSERT INTO knowledge_vectors(knowledge_id,model,embedding) VALUES(?,?,?) ON CONFLICT(knowledge_id) DO UPDATE SET model=excluded.model,embedding=excluded.embedding').run(id,model,JSON.stringify(vector));return {id,model,dimensions:vector.length}},
  pendingVectors(model){return db.prepare('SELECT k.id,k.content FROM knowledge k LEFT JOIN knowledge_vectors v ON k.id=v.knowledge_id AND v.model=? WHERE k.verified=1 AND v.knowledge_id IS NULL ORDER BY k.created DESC LIMIT 20').all(model)},
  semanticRecall(vector,model){if(!Array.isArray(vector)||!vector.length||!vector.every(Number.isFinite))return [];const rows=db.prepare('SELECT k.id,k.content,k.source,v.embedding FROM knowledge k JOIN knowledge_vectors v ON v.knowledge_id=k.id WHERE k.verified=1 AND v.model=? ORDER BY k.created DESC LIMIT 1000').all(model);return rows.map(r=>({id:r.id,content:r.content.slice(0,2500),source:r.source,score:cosine(vector,JSON.parse(r.embedding))})).filter(r=>r.score>=0.25).sort((a,b)=>b.score-a.score).slice(0,5).map(({id,content,source})=>({id,content,source}))},
  close(){db.close()}
 };
}
