import http from 'node:http';
export function health(url,timeout=1000) {
  const u=new URL(url);
  if(u.hostname!=='127.0.0.1') throw new Error('Only loopback health-check is supported');
  return new Promise(resolve=>{
    const req=http.get(url,{timeout,agent:false},res=>{res.resume();resolve(res.statusCode>=200&&res.statusCode<300);});
    req.on('timeout',()=>req.destroy());req.on('error',()=>resolve(false));
  });
}
export async function waitHealth(url,timeout=30000){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    if(await health(url))return true;
    await new Promise(r=>setTimeout(r,350));
  }
  return false;
}
