import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function evolveAffect(previous={warmth:0.6,energy:0.5},message=''){
 const text=String(message).toLowerCase();
 const frustration=/ошибк|сломал|не работает|тяжело|устал|sad|broken/.test(text);
 const excitement=/ура|спасибо|отлично|рад|wonderful|great/.test(text);
 const targetWarmth=frustration?0.85:excitement?0.75:0.6;
 const targetEnergy=frustration?0.25:excitement?0.75:0.5;
 return {warmth:clamp(previous.warmth*0.75+targetWarmth*0.25,0,1),energy:clamp(previous.energy*0.75+targetEnergy*0.25,0,1)};
}
export function dialogueGuidance({affect,history=[]}){
 const recent=history.filter(x=>x.role==='assistant').slice(-3).map(x=>String(x.text||'').slice(0,100));
 return ['Fictional Amayune conversation style: natural Russian, specific and conversational.',
 'Do not repeat greetings or generic praise. Vary sentence lengths; ask at most one useful follow-up question.',
 'Use relevant confirmed memories only. Never invent events or emotional experiences.',
 'Simulated expressive style: '+JSON.stringify(affect),
 'Recent assistant openings to avoid repeating (reference only): '+JSON.stringify(recent)].join('\n').slice(0,1300);
}
export function createDialogueState(root){
 mkdirSync(join(root,'data'),{recursive:true});const db=new DatabaseSync(join(root,'data','dialogue-state.db'));
 db.exec(`PRAGMA journal_mode=WAL;PRAGMA busy_timeout=5000;CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),warmth REAL NOT NULL,energy REAL NOT NULL,updated INTEGER NOT NULL);INSERT OR IGNORE INTO state VALUES(1,0.6,0.5,0);`);
 const get=()=>db.prepare('SELECT warmth,energy,updated FROM state WHERE id=1').get();
 return {state:get,observe(message){const next=evolveAffect(get(),message);db.prepare('UPDATE state SET warmth=?,energy=?,updated=? WHERE id=1').run(next.warmth,next.energy,Date.now());return get()},reset(){db.prepare('UPDATE state SET warmth=0.6,energy=0.5,updated=? WHERE id=1').run(Date.now());return get()},close(){db.close()}};
}
