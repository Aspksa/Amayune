import {loadSettings,atomicJson} from './settings.mjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const endpoint='https://foundation-models.api.cloud.ru/v1/chat/completions';
const usagePath=root=>join(root,'data','cloudru-usage.json');
export function getUsage(root){try{const s=JSON.parse(readFileSync(usagePath(root),'utf8'));if(Number.isSafeInteger(s.totalTokens)&&s.totalTokens>=0)return s;}catch{}return {requests:0,promptTokens:0,completionTokens:0,totalTokens:0,unknownUsageRequests:0};}
export function addUsage(root,u){const current=getUsage(root);const p=Number.isSafeInteger(u?.prompt_tokens)&&u.prompt_tokens>=0?u.prompt_tokens:0;const c=Number.isSafeInteger(u?.completion_tokens)&&u.completion_tokens>=0?u.completion_tokens:0;const total=Number.isSafeInteger(u?.total_tokens)&&u.total_tokens>=0?u.total_tokens:p+c;const next={requests:current.requests+1,promptTokens:current.promptTokens+p,completionTokens:current.completionTokens+c,totalTokens:current.totalTokens+total,unknownUsageRequests:current.unknownUsageRequests+(u?0:1)};atomicJson(usagePath(root),next);return next;}
export async function generate(root,key,prompt,fetcher=fetch){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>16000)throw Object.assign(Error('Текст запроса должен быть от 1 до 16000 символов'),{status:400});
 const cfg=loadSettings(root),primary=cfg.primaryModel;
 if(!primary)throw Object.assign(Error('Выберите основную модель'),{status:409});
 const used=getUsage(root);
 if(cfg.budgetTokens===0||used.totalTokens>=cfg.budgetTokens)throw Object.assign(Error('Лимит токенов исчерпан'),{status:409});
 const ids=[primary,...(cfg.fallbackModel&&cfg.fallbackModel!==primary?[cfg.fallbackModel]:[])];
 let last;
 for(const model of ids){
  let response;
  try{response=await fetcher(endpoint,{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],temperature:cfg.temperature,max_completion_tokens:Math.min(cfg.maxTokens,Math.max(1,cfg.budgetTokens-used.totalTokens)),stream:false}),signal:AbortSignal.timeout(cfg.timeoutMs)});}
  catch(e){last=Object.assign(Error(e?.name==='TimeoutError'?'Cloud.ru: тайм-аут':'Cloud.ru: ошибка соединения'),{status:503});continue;}
  if(!response.ok){
   const code=response.status;
   last=Object.assign(Error(code===401||code===403?'Cloud.ru: ошибка авторизации':code===429?'Cloud.ru: ограничение запросов':'Cloud.ru: HTTP '+code),{status:code===401||code===403?401:code===429?429:502});
   if([400,401,403,404,422].includes(code))break;
   continue;
  }
  let data;try{data=await response.json();}catch{throw Object.assign(Error('Cloud.ru: некорректный JSON'),{status:502});}
  const answer=data?.choices?.[0]?.message?.content;
  if(typeof answer!=='string')throw Object.assign(Error('Cloud.ru: ответ не содержит текста'),{status:502});
  const totals=addUsage(root,data.usage);
  return {model:data.model||model,requestedModel:model,fallbackUsed:model!==primary,text:answer,usage:data.usage??null,totals,budgetTokens:cfg.budgetTokens};
 }
 throw last??Object.assign(Error('Не удалось получить ответ Cloud.ru'),{status:502});
}
