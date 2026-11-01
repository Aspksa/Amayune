export function createRuntimeSupervisor(workers=[],{intervalMs=60000,onFailure=()=>{}}={}){
 let timer=null;const state=new Map();
 const check=()=>{for(const worker of workers){const name=worker.name;if(!name||typeof worker.start!=='function')continue;const old=state.get(name)||{failures:0,restarts:0,lastError:null,nextRetry:0};if(Date.now()<old.nextRetry)continue;try{worker.start();state.set(name,{...old,failures:0,lastError:null,nextRetry:0})}catch(error){const failures=old.failures+1;const nextRetry=Date.now()+Math.min(300000,1000*2**Math.min(8,failures));state.set(name,{failures,restarts:old.restarts+1,lastError:String(error?.message||error).slice(0,160),nextRetry});try{onFailure(name,error)}catch{}}}return Object.fromEntries(state)};
 return {check,status:()=>Object.fromEntries(state),start(){if(timer)return;check();timer=setInterval(check,intervalMs);timer.unref?.()},stop(){if(timer)clearInterval(timer);timer=null}};
}
