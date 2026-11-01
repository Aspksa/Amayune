import {existsSync,readFileSync,writeFileSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import net from 'node:net';
import {randomBytes} from 'node:crypto';
import {health,waitHealth} from './health-check.mjs';
import {updateStatus,applyPendingUpdate,finishPendingUpdate} from './update-lifecycle.mjs';
import {prepare} from './dependencies.mjs';
import {logger,ensureWritable,getState} from './recovery.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const log=logger(root);
const statePath=join(root,'.runtime','server-state.json');
const lockPath=join(root,'.runtime','launch.lock');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function isProcessAlive(pid){try{process.kill(pid,0);return true;}catch(e){return e?.code==='EPERM';}}
async function identityMatches(port,path,id){if(typeof id!=='string'||!id)return false;try{const r=await fetch('http://127.0.0.1:'+port+path,{signal:AbortSignal.timeout(2000)});return r.ok&&(await r.json()).instanceId===id;}catch{return false;}}
function browser(url){
  if(process.argv.includes('--no-browser'))return;
  if(process.platform==='win32')spawn('cmd.exe',['/d','/s','/c','start','""',url],{detached:true,windowsHide:true,stdio:'ignore'}).unref();
  else log('browser',url);
}
function availablePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});
  });
}
async function launch(){
  ensureWritable(root);
  const file=join(root,'launcher.config.json');
  if(!existsSync(file))throw Error('Не найден launcher.config.json. См. launcher.config.example.json.');
  const config=JSON.parse(readFileSync(file,'utf8'));
  if(!/^[A-Za-z0-9:_-]+$/.test(config.start?.script??''))throw Error('Некорректный start.script');
  const healthPath=config.health?.path??'/health';
  if(!/^\/[A-Za-z0-9/_?.=-]*$/.test(healthPath))throw Error('Некорректный health.path');
  const existing=getState(root);
  if(updateStatus(root).state==='idle'&&existing?.port>0&&existing.port<65536&&Number.isInteger(existing.pid)&&existing.pid>0&&isProcessAlive(existing.pid)&&await identityMatches(existing.port,healthPath,existing.instanceId)){
    log('reuse','Сервер уже работает на '+existing.port);
    browser('http://127.0.0.1:'+existing.port);return;
  }
  let fd;
  try{fd=openSync(lockPath,'wx');writeFileSync(fd,JSON.stringify({pid:process.pid,at:Date.now()}));}
  catch(e){
    if(e.code!=='EEXIST')throw e;
    let old;try{old=JSON.parse(readFileSync(lockPath,'utf8'));}catch{}
    if(old?.at&&Date.now()-old.at>120000){
      try{process.kill(old.pid,0);}catch{unlinkSync(lockPath);return launch();}
    }
    for(let i=0;i<40;i++){
      await sleep(300);
      const s=getState(root);
      if(s?.port&&await identityMatches(s.port,healthPath,s.instanceId)){browser('http://127.0.0.1:'+s.port);return;}
    }
    throw Error('Параллельный запуск занят. Повторите позже.');
  }
  let installing=false;
  try{
    const update=updateStatus(root);
    if(update.state==='invalid')throw Error('Повреждён статус обновления; требуется ручная проверка');
    if(update.state==='booting'){
      log('update','Предыдущий запуск не подтвердил обновление; выполняю откат');
      finishPendingUpdate(root,false);
    }
    installing=update.state==='ready';
    if(installing&&existing?.pid&&isProcessAlive(existing.pid))throw Error('Закройте работающий Amayune перед установкой обновления');
    if(config.python?.required){
      const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(root,'scripts','bootstrap-python.ps1'),'-Root',root],{stdio:'inherit'});
      if(result.status!==0)throw Error('Python недоступен.');
    }
    if(installing){applyPendingUpdate(root);log('update','Обновление применено, проверяю запуск');}
    prepare(root,config,log);
    const port=await availablePort();
    const instanceId=randomBytes(24).toString('hex');
    const env={...process.env,AMAYUNE_INSTANCE_ID:instanceId,PORT:String(port),HOST:'127.0.0.1',AMAYUNE_DATA_DIR:join(root,'data')};
    const command=process.platform==='win32'?'npm.cmd':'npm';
    const child=spawn(command,['run',config.start.script],{cwd:root,env,detached:true,stdio:'ignore',shell:process.platform==='win32',windowsHide:true});
    child.unref();
    const url='http://127.0.0.1:'+port+healthPath;
    const ready=await waitHealth(url,config.health?.timeoutMs??30000);
    if(!ready||!await identityMatches(port,healthPath,instanceId)){
      if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true});
      else {try{process.kill(-child.pid);}catch{}}
      throw Error('Сервер не ответил на HTTP health-check: '+url);
    }
    if(installing){finishPendingUpdate(root,true);log('update','Обновление подтверждено');}
    writeFileSync(statePath,JSON.stringify({port,pid:child.pid,instanceId,at:new Date().toISOString()}));
    log('ready','HTTP готов: '+url);
    browser('http://127.0.0.1:'+port);
  }catch(e){
    if(installing&&updateStatus(root).state==='booting'){
      try{finishPendingUpdate(root,false);log('update','Откат выполнен');}
      catch(rollbackError){log('error','Ошибка отката: '+rollbackError.message,1);}
    }
    throw e;
  }finally{
    closeSync(fd);unlinkSync(lockPath);
  }
}
launch().catch(e=>{log('error',e.stack??e.message,1);console.error('Ошибка: '+e.message);process.exitCode=1;});
