import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
export function digest(root,paths){
  const h=createHash('sha256');
  for(const p of paths){h.update(p);h.update(existsSync(join(root,p))?readFileSync(join(root,p)):'MISSING');}
  return h.digest('hex');
}
function npm(root,args) {
  const binary=process.platform==='win32'?'npm.cmd':'npm';
  const result=spawnSync(binary,args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
  if(result.status!==0)throw new Error('npm '+args.join(' ')+' failed ('+result.status+')');
}
export function prepare(root,config,log){
  if(!existsSync(join(root,'package.json')))throw new Error('Не найден package.json: приложение ещё не добавлено.');
  if(!existsSync(join(root,'package-lock.json')))throw new Error('Не найден package-lock.json.');
  const dep=digest(root,['package.json','package-lock.json']);
  const depState=join(root,'.runtime','deps.json');
  let prev;try{prev=JSON.parse(readFileSync(depState,'utf8'));}catch{}
  if(prev?.hash!==dep||!existsSync(join(root,'node_modules','.package-lock.json'))){
    log('dependencies','npm ci');npm(root,['ci','--no-audit','--no-fund']);
    writeFileSync(depState,JSON.stringify({hash:dep}));
  }
  if(!config.build?.script)return;
  const hash=digest(root,['package.json','package-lock.json',...(config.build.inputs??[])]);
  const stamp=join(root,'.runtime','build.json');
  try{prev=JSON.parse(readFileSync(stamp,'utf8'));}catch{prev=null;}
  const outputs=config.build.outputs??[];
  if(prev?.hash===hash&&outputs.length&&outputs.every(p=>existsSync(join(root,p))))return;
  log('build',config.build.script);
  npm(root,['run',config.build.script]);
  if(outputs.some(p=>!existsSync(join(root,p))))throw new Error('Не найден результат сборки.');
  writeFileSync(stamp,JSON.stringify({hash}));
}
