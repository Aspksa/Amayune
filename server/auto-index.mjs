import {listCloudModels} from './cloudru.mjs';
import {embedCloud} from './embeddings.mjs';

export function embeddingCandidates(models){
 return models.filter(m=>/embed|embedding|эмбеддинг/i.test(m.id+' '+m.name)).sort((a,b)=>Number(/embed/i.test(b.id))-Number(/embed/i.test(a.id))).map(m=>m.id);
}
export function createAutoIndexer({memory,readKey,fetchModels=listCloudModels,embed=embedCloud,env=process.env}){
 let selected=null,selectionKey=null,inFlight=null,lastFailure=0,lastDiscovery=0;
 async function choose(key){
  if(env.AMAYUNE_EMBEDDING_MODEL)return env.AMAYUNE_EMBEDDING_MODEL;
  if(selected&&selectionKey===key)return selected;
  if(Date.now()-lastDiscovery<300000)return null;
  lastDiscovery=Date.now();
  const models=embeddingCandidates(await fetchModels(key));
  for(const model of models.slice(0,10)){
   try{await embed('Amayune model compatibility check',key,model);selected=model;selectionKey=key;return model}catch{/* try next candidate */}
  }
  return null;
 }
 async function index(){
  const key=readKey();if(!key)return {indexed:0,reason:'missing-key'};
  const model=await choose(key);if(!model)return {indexed:0,reason:'no-compatible-model'};
  const store=await memory();let indexed=0;
  for(const item of store.pendingVectors(model)){
   const vector=await embed(item.content,key,model);
   store.setVector(item.id,model,vector);indexed++;
  }
  return {indexed,model,remaining:store.pendingVectors(model).length};
 }
 function schedule(){
  if(inFlight||Date.now()-lastFailure<60000)return inFlight;
  inFlight=index().catch(e=>{lastFailure=Date.now();return {indexed:0,error:e.message}}).finally(()=>{inFlight=null});
  return inFlight;
 }
 async function recall(prompt,key){
  const model=await choose(key);if(!model)return [];
  const vector=await embed(prompt,key,model);
  return (await memory()).semanticRecall(vector,model);
 }
 return {schedule,recall,choose};
}
