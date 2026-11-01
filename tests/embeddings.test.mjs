import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cosine,embedCloud} from '../server/embeddings.mjs';
import {openMemory} from '../server/memory.mjs';

test('cosine similarity checks dimensions and ranks vectors',()=>{
 assert.equal(cosine([1,0],[0,1]),0);
 assert.equal(cosine([1,0],[1,0]),1);
 assert.equal(cosine([1],[1,2]),0);
});
test('embedding provider validates response',async()=>{
 const vector=await embedCloud('test','key','model',async()=>({ok:true,json:async()=>({data:[{embedding:[0.5,0.25]}]})}));
 assert.deepEqual(vector,[0.5,0.25]);
});
test('semantic search only returns verified knowledge',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'amayune-vectors-'));let db;
 try{db=await openMemory(dir);const item=db.addKnowledge('Portable SSD memory');db.setVector(item.id,'model',[1,0]);assert.equal(db.semanticRecall([1,0],'model').length,0);db.verifyKnowledge(item.id,true);assert.equal(db.semanticRecall([1,0],'model')[0].id,item.id);assert.equal(db.semanticRecall([1,0],'other').length,0);db.removeKnowledge(item.id);assert.equal(db.semanticRecall([1,0],'model').length,0)}
 finally{db?.close();rmSync(dir,{recursive:true,force:true})}
});
