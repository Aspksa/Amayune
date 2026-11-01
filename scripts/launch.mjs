import {existsSync,readFileSync,writeFileSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import net from 'node:net';
import {health,waitHealth} from './health-check.mjs';
import {prepare} from './dependencies.mjs';
import {logger,ensureWritable,getState} from './recovery.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const log=logger(root);
const statePath=join(root,'.runtime','server-state.json');
const lockPath=join(root,'.runtime','launch.lock');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function isProcessAlive(pid){try{process.kill(pid,0);return true;}catch(e){return e?.code==='EPERM';}}
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
  if(existing?.port>0&&existing.port<65536&&Number.isInteger(existing.pid)&&existing.pid>0&&isProcessAlive(existing.pid)&&await health('http://127.0.0.1:'+existing.port+healthPath)){
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
      if(s?.port&&await health('http://127.0.0.1:'+s.port+healthPath)){browser('http://127.0.0.1:'+s.port);return;}
    }
    throw Error('Параллельный запуск занят. Повторите позже.');
  }
  try{
    if(config.python?.required){
      const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',join(root,'scripts','bootstrap-python.ps1'),'-Root',root],{stdio:'inherit'});
      if(result.status!==0)throw Error('Python недоступен.');
    }
    prepare(root,config,log);
    const port=await availablePort();
    const env={...process.env,PORT:String(port),HOST:'127.0.0.1',AMAYUNE_DATA_DIR:join(root,'data')};
    const command=process.platform==='win32'?'npm.cmd':'npm';
    const child=spawn(command,['run',config.start.script],{cwd:root,env,detached:true,stdio:'ignore',shell:process.platform==='win32',windowsHide:true});
    child.unref();
    const url='http://127.0.0.1:'+port+healthPath;
    const ready=await waitHealth(url,config.health?.timeoutMs??30000);
    if(!ready){
      if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true});
      else {try{process.kill(-child.pid);}catch{}}
      throw Error('Сервер не ответил на HTTP health-check: '+url);
    }
    writeFileSync(statePath,JSON.stringify({port,pid:child.pid,at:new Date().toISOString()}));
    log('ready','HTTP готов: '+url);
    browser('http://127.0.0.1:'+port);
  }finally{
    closeSync(fd);unlinkSync(lockPath);
  }
}
launch().catch(e=>{log('error',e.stack??e.message,1);console.error('Ошибка: '+e.message);process.exitCode=1;});
