import test from 'node:test';
import assert from 'node:assert/strict';
import {embeddingCandidates,createAutoIndexer} from '../server/auto-index.mjs';

test('auto-discovery only considers embedding model candidates',()=>{
 assert.deepEqual(embeddingCandidates([{id:'chat',name:'Chat'},{id:'embed-1',name:'Vectors'}]),['embed-1']);
});
test('automatic indexing selects a working model and indexes verified entries',async()=>{
 const indexed=[];const store={pendingVectors:()=>indexed.length?[]:[{id:'k1',content:'approved knowledge'}],setVector:(id,model,vector)=>indexed.push({id,model,vector}),semanticRecall:()=>[]};
 const manager=createAutoIndexer({memory:async()=>store,readKey:()=> 'key',fetchModels:async()=>[{id:'embedding-a',name:'Embedding'}],embed:async(text,key,model)=>[1,0],env:{}});
 const result=await manager.schedule();
 assert.equal(result.indexed,1);assert.equal(result.model,'embedding-a');assert.equal(indexed[0].id,'k1');
});
