export async function listCloudModels(key,fetcher=fetch){
 if(typeof key!=='string'||key.length<12||key.length>8192||key.trim()!==key||/[\x00-\x1f\x7f]/.test(key))throw Object.assign(Error('Некорректный формат API-ключа'),{status:400});
 let response;
 try{response=await fetcher('https://foundation-models.api.cloud.ru/v1/models',{headers:{authorization:'Bearer '+key},signal:AbortSignal.timeout(12000)});}
 catch(e){throw Object.assign(Error(e.name==='TimeoutError'?'Превышено время ожидания Cloud.ru':'Нет соединения с Cloud.ru'),{status:503});}
 if(!response.ok){const s=response.status;throw Object.assign(Error(s===401||s===403?'Авторизация отклонена':s===429?'Превышен лимит Cloud.ru':'Cloud.ru: HTTP '+s),{status:s===401||s===403?401:s===429?429:502});}
 let data;try{data=await response.json();}catch{throw Object.assign(Error('Некорректный JSON Cloud.ru'),{status:502});}
 if(!Array.isArray(data.data))throw Object.assign(Error('Некорректный ответ Cloud.ru'),{status:502});
 return data.data.filter(m=>typeof m.id==='string').map(m=>({id:m.id,name:m.metadata?.name||m.id,description:m.metadata?.readme||'',context:Number.isFinite(m.max_model_len)?m.max_model_len:null,inputCost:Number.isFinite(m.metadata?.prompt_tokens_cost)?m.metadata.prompt_tokens_cost:null,outputCost:Number.isFinite(m.metadata?.generated_tokens_cost)?m.metadata.generated_tokens_cost:null})).slice(0,500);
}
