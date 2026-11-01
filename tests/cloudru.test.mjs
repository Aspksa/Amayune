import test from 'node:test';import assert from 'node:assert/strict';import {listCloudModels} from '../server/cloudru.mjs';
const key='test-key-123456789';
test('valid key uses Bearer and returns only provided metadata',async()=>{
 let calls=0;const result=await listCloudModels(key,async(url,options)=>{calls++;assert.equal(url,'https://foundation-models.api.cloud.ru/v1/models');assert.equal(options.headers.authorization,'Bearer '+key);return {ok:true,json:async()=>({data:[{id:'a',max_model_len:8192,metadata:{name:'Model A'}}]})};});
 assert.equal(calls,1);assert.equal(result[0].inputCost,null);assert.equal(result[0].context,8192);
});
test('rejects revoked and malformed keys without exposing secrets',async()=>{
 await assert.rejects(()=>listCloudModels('bad',async()=>{throw Error('Must not call');}),e=>e.status===400);
 await assert.rejects(()=>listCloudModels(key,async()=>({ok:false,status:401})),e=>e.status===401&&!e.message.includes(key));
 await assert.rejects(()=>listCloudModels(key,async()=>({ok:false,status:429})),e=>e.status===429);
 await assert.rejects(()=>listCloudModels(key,async()=>{throw Error('secret '+key)}),e=>e.status===503&&!e.message.includes(key));
});
test('validates malformed Cloud.ru response',async()=>{
 await assert.rejects(()=>listCloudModels(key,async()=>({ok:true,json:async()=>({error:'bad'})})),e=>e.status===502);
});
