import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openMemory} from '../server/memory.mjs';
test('durable history: unlimited append, idempotent retry, search, reopen',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'amayune-history-'));let db;
 try{db=await openMemory(dir);db.upsertChat({id:'c',title:'Original'});for(let i=0;i<250;i++)db.appendMessage('c',{id:'m'+i,role:'user',text:'hello '+i});db.appendMessage('c',{id:'m249',role:'user',text:'recovered message'});assert.equal(db.history('c',null,200).length,200);assert.equal(db.searchChats('recovered').length,1);const first=db.history('c',null,100);const cursor={created:first[0].created,id:first[0].id};assert.ok(db.history('c',cursor,100).length>0);db.close();db=await openMemory(dir);assert.equal(db.searchChats('recovered').length,1);assert.equal(db.listAll().length,1)}
 finally{db?.close();rmSync(dir,{recursive:true,force:true})}
});
