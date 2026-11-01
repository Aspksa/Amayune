import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openMemory} from '../server/memory.mjs';
test('context, corrections and background jobs survive restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'amayune-core-'));let db;
 try{
  db=await openMemory(dir);db.upsertChat({id:'c1',title:'Project'});db.appendMessage('c1',{id:'m1',role:'user',text:'TypeScript automation pipeline'});assert.equal(db.recentContext('TypeScript').length,1);
  db.recordFeedback('TypeScript automation','Use TypeScript rather than Python');assert.equal(db.feedback('TypeScript automation').length,1);
  db.enqueueJob('semantic-index','semantic-index');db.close();db=null;
  db=await openMemory(dir);assert.equal(db.pendingJobs().length,1);assert.equal(db.feedback('TypeScript automation').length,1);db.finishJob('semantic-index',true);assert.equal(db.pendingJobs().length,0);
 }finally{db?.close();rmSync(dir,{recursive:true,force:true})}
});
