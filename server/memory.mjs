import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

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
 return {
  list(){return db.prepare('SELECT id,title,updated FROM conversations ORDER BY updated DESC LIMIT 100').all().map(c=>({...c,messages:db.prepare('SELECT role,text FROM messages WHERE conversation_id=? ORDER BY created,id LIMIT 200').all(c.id)}))},
  save(chats){if(!Array.isArray(chats)||chats.length>100)throw Object.assign(Error('Некорректные диалоги'),{status:400});
   const insertChat=db.prepare('INSERT INTO conversations(id,title,updated) VALUES(?,?,?)');
   const insertMessage=db.prepare('INSERT INTO messages(id,conversation_id,role,text,created) VALUES(?,?,?,?,?)');
   db.exec('BEGIN IMMEDIATE');
   try{db.exec('DELETE FROM conversations');for(const c of chats){if(typeof c.id!=='string'||c.id.length>128||!c.id||typeof c.title!=='string'||c.title.length>200||!Array.isArray(c.messages)||c.messages.length>200)throw Error('Некорректный чат');insertChat.run(c.id,c.title,Number.isSafeInteger(c.updated)?c.updated:Date.now());for(const m of c.messages){if(!['user','assistant'].includes(m.role)||typeof m.text!=='string'||m.text.length>100000)throw Error('Некорректное сообщение');insertMessage.run(randomUUID(),c.id,m.role,m.text,Date.now())}}db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw Object.assign(e,{status:400})}
  },
  close(){db.close()}
 };
}
