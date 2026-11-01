import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openMemory} from '../server/memory.mjs';

test('knowledge requires review before retrieval',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'amayune-knowledge-'));
 let db;
 try{
  db=await openMemory(dir);
  const item=db.addKnowledge('Amayune stores memory on portable SSD','test');
  assert.equal(db.recall('portable SSD').length,0);
  db.verifyKnowledge(item.id,true);
  assert.equal(db.recall('portable SSD')[0].id,item.id);
  db.verifyKnowledge(item.id,false);
  assert.equal(db.recall('portable SSD').length,0);
  assert.equal(db.removeKnowledge(item.id).deleted,true);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true})}
});
