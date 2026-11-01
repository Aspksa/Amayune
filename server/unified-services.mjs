import {cognitiveContext,agentPolicy,qualityGate} from './cognitive-architecture.mjs';
import {deduplicateMemory,safeContext} from './unified-core.mjs';
// Read-only adapters preserve existing SQLite schemas and approval boundaries.
export function createUnifiedServices({getEvents=()=>[],getEntries=()=>[],getTurns=()=>[],getAutonomy=()=>({}),getWorkers=()=>({})}={}){
 const read=fn=>{try{const value=fn();return Array.isArray(value)?value:[]}catch{return []}};
 const snapshot=()=>({events:read(getEvents),entries:read(getEntries),turns:read(getTurns)});
 function memory(prompt=''){const s=snapshot();const entries=deduplicateMemory(s.entries.filter(x=>x?.status==='active'));const events=deduplicateMemory(s.events.filter(x=>x?.approved===true||x?.status==='active'));return {entries,events,context:cognitiveContext({prompt,events,entries,turns:s.turns})}}
 function personality(){return memory().context.profile}
 function evolution(){const turns=read(getTurns);return {observedTurns:turns.length,latest:turns.at(-1)??null}}
 function autonomy(){const config=getAutonomy()||{};return agentPolicy({enabled:config.enabled===true||config.enabled===1,approved:config.approved===true,quiet:config.quiet===true})}
 function system(){return {workers:getWorkers(),memoryEntries:memory().entries.length}}
 function compose(prompt,extra=[]){const m=memory(prompt);return safeContext([m.context.text,...extra])}
 return {snapshot,memory,personality,evolution,autonomy,system,compose,verify:qualityGate};
}
