import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEFAULTS,loadSettings,saveSettings,saveKey,readKey,hasKey,deleteKey} from './settings.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const host='127.0.0.1',port=Number(process.env.PORT||3000);
const token=randomBytes(32).toString('hex');
const api='https://foundation-models.api.cloud.ru/v1/models';
function reply(res,code,obj){res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(JSON.stringify(obj));}
function body(req){return new Promise((resolve,reject)=>{let value='';req.on('data',chunk=>{value+=chunk;if(value.length>12000){reject(Error('Слишком большой запрос'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(value||'{}'));}catch{reject(Error('Некорректный JSON'));}});req.on('error',reject);});}
function safeHost(req){return req.headers.host===host+':'+port||req.headers.host==='localhost:'+port;}
function sameOrigin(req){const origin=req.headers.origin;return !origin||origin==='http://'+host+':'+port||origin==='http://localhost:'+port;}
function auth(req){const provided=req.headers['x-amayune-token'];return typeof provided==='string'&&provided.length===token.length&&timingSafeEqual(Buffer.from(provided),Buffer.from(token));}
async function models(key){
 let r;
 try{r=await fetch(api,{headers:{authorization:'Bearer '+key},signal:AbortSignal.timeout(12000)});}
 catch(e){throw Object.assign(Error(e.name==='TimeoutError'?'Превышено время ожидания Cloud.ru':'Нет соединения с Cloud.ru'),{status:503});}
 if(!r.ok){const status=r.status;throw Object.assign(Error(status===401||status===403?'Авторизация отклонена':status===429?'Превышен лимит Cloud.ru':'Cloud.ru: HTTP '+status),{status:status===401||status===403?401:status===429?429:502});}
 const data=await r.json();
 if(!Array.isArray(data.data))throw Object.assign(Error('Некорректный ответ Cloud.ru'),{status:502});
 return data.data.filter(m=>typeof m.id==='string').map(m=>({id:m.id,name:m.metadata?.name||m.id,description:m.metadata?.readme||'',context:Number.isFinite(m.max_model_len)?m.max_model_len:null,inputCost:Number.isFinite(m.metadata?.prompt_tokens_cost)?m.metadata.prompt_tokens_cost:null,outputCost:Number.isFinite(m.metadata?.generated_tokens_cost)?m.metadata.generated_tokens_cost:null})).slice(0,500);
}
const server=http.createServer(async(req,res)=>{
 try{
  if(!safeHost(req)||!sameOrigin(req))return reply(res,403,{error:'Недопустимый источник запроса'});
  const url=new URL(req.url,'http://'+host+':'+port);
  if(req.method==='GET'&&url.pathname==='/health')return reply(res,200,{status:'ok'});
  if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html')){
   const html=readFileSync(join(root,'web','index.html'),'utf8').replace('__CSRF_TOKEN__',token);
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});return res.end(html);
  }
  if(req.method==='GET'&&url.pathname==='/app.js'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'});return res.end(readFileSync(join(root,'web','app.js')));}
  if(req.method==='GET'&&url.pathname==='/style.css'){res.writeHead(200,{'content-type':'text/css; charset=utf-8'});return res.end(readFileSync(join(root,'web','style.css')));}
  if(!url.pathname.startsWith('/api/'))return reply(res,404,{error:'Не найдено'});
  if(!auth(req))return reply(res,403,{error:'Доступ запрещён'});
  if(req.method==='GET'&&url.pathname==='/api/settings')return reply(res,200,{settings:loadSettings(root),hasKey:hasKey(root)});
  if(req.method==='PUT'&&url.pathname==='/api/settings')return reply(res,200,{settings:saveSettings(root,await body(req))});
  if(req.method==='PUT'&&url.pathname==='/api/key'){
   const {key}=await body(req);
   if(typeof key!=='string'||key.length<12||key.length>8192||key.trim()!==key||/[\x00-\x1f\x7f]/.test(key))return reply(res,400,{error:'Некорректный формат API-ключа'});
   const verified=await models(key);
   saveKey(root,key);
   return reply(res,200,{saved:true,verified:true,modelCount:verified.length,checkedAt:new Date().toISOString()});
  }
  if(req.method==='DELETE'&&url.pathname==='/api/key'){deleteKey(root);return reply(res,200,{saved:false});}
  if(req.method==='GET'&&url.pathname==='/api/models'){
   const key=readKey(root);if(!key)return reply(res,409,{error:'Ключ Cloud.ru не сохранён'});
   const result=await models(key);return reply(res,200,{models:result,checkedAt:new Date().toISOString()});
  }
  return reply(res,404,{error:'Метод не поддерживается'});
 }catch(e){const code=e.status||(/Некоррект|Недопустим|Слишком большой|Неизвестн/.test(e.message)?400:503);return reply(res,code,{error:e.status?e.message:code===400?e.message:'Ошибка локального сервера или сети'});}
});
server.listen(port,host,()=>console.log('Amayune ready at http://'+host+':'+port));
