// Genesis 12: compatibility-preserving orchestration of existing persistent stores.
export function createUnifiedCore({getEvents,getEntries,getTurns,workers=[],onFailure=()=>{}}){
 const metrics={cycles:0,failures:0,lastCycle:null};
 function snapshot(){const [events,entries,turns]=[getEvents(),getEntries(),getTurns()];return {events:Array.isArray(events)?events:[],entries:Array.isArray(entries)?entries:[],turns:Array.isArray(turns)?turns:[]}}
 function runCycle(){const result={completed:[],failed:[]};for(const worker of workers){try{worker.tick();result.completed.push(worker.name)}catch(error){metrics.failures++;result.failed.push(worker.name);try{onFailure(worker.name,error)}catch{}}}metrics.cycles++;metrics.lastCycle=Date.now();return result}
 return {snapshot,runCycle,status:()=>({...metrics,workers:workers.map(x=>x.name)})};
}
export function deduplicateMemory(items=[]){const seen=new Set();return items.filter(x=>{const text=String(x?.summary??x?.detail??'').trim().toLocaleLowerCase('ru');if(!text||seen.has(text))return false;seen.add(text);return true})}
export function safeContext(parts=[],max=16000){return parts.filter(x=>typeof x==='string'&&x.trim()).join('\n\n').slice(0,max)}
