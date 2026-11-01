import {readFileSync,existsSync,mkdirSync,copyFileSync,rmSync,writeFileSync,lstatSync,realpathSync} from 'node:fs';
import {join,dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,verify,createPublicKey} from 'node:crypto';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const blocked=new Set(['data','.runtime','logs','.env','node_modules','memory','documents','settings','config']);
function valid(p){
  return typeof p==='string'&&p.length>0&&!p.includes('\\')&&!p.startsWith('/')&&!p.split('/').some(s=>s==='.'||s==='..'||!s)&&!blocked.has(p.split('/')[0])&&!/\.(db|sqlite|sqlite3|key|pem)$/i.test(p);
}
export function applyUpdate(manifestFile){
  const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
  // A checksum is not an authenticity proof. Refuse unsigned updates.
  if(manifest.signatureAlgorithm!=='ed25519'||typeof manifest.signature!=='string'||!process.env.AMAYUNE_UPDATE_PUBLIC_KEY)throw Error('Update rejected: signed manifest and trusted public key required');
  const canonical=JSON.stringify({files:manifest.files});
  if(!verify(null,Buffer.from(canonical),createPublicKey(process.env.AMAYUNE_UPDATE_PUBLIC_KEY),Buffer.from(manifest.signature,'base64')))throw Error('Invalid update signature');
  if(!Array.isArray(manifest.files)||manifest.files.length===0)throw Error('Empty update manifest');
  const stage=join(root,'.runtime','updates','staged');
  const seen=new Set();
  const changes=manifest.files.map(x=>{
    if(!valid(x.path)||seen.has(x.path)||!/^[a-f0-9]{64}$/i.test(x.sha256))throw Error('Unsafe update entry');
    seen.add(x.path);
    const src=resolve(stage,x.path),dst=resolve(root,x.path);
    if(relative(stage,src).startsWith('..')||relative(root,dst).startsWith('..'))throw Error('Path escape');
    if(!existsSync(src)||lstatSync(src).isSymbolicLink())throw Error('Missing or linked source');
    if(existsSync(dst)&&lstatSync(dst).isSymbolicLink())throw Error('Linked target refused');
    const hash=createHash('sha256').update(readFileSync(src)).digest('hex');
    if(hash.toLowerCase()!==x.sha256.toLowerCase())throw Error('Hash mismatch: '+x.path);
    return{src,dst,path:x.path,exists:existsSync(dst)};
  });
  const backup=join(root,'.runtime','backups',new Date().toISOString().replace(/[:.]/g,'-'));
  const completed=[];
  mkdirSync(backup,{recursive:true});
  try{
    for(const c of changes){
      const old=join(backup,c.path);
      if(c.exists){mkdirSync(dirname(old),{recursive:true});copyFileSync(c.dst,old);}
      mkdirSync(dirname(c.dst),{recursive:true});
      copyFileSync(c.src,c.dst);
      completed.push({...c,old});
    }
    writeFileSync(join(backup,'manifest.json'),JSON.stringify(manifest));
    return backup;
  }catch(e){
    for(const c of completed.reverse()){if(c.exists)copyFileSync(c.old,c.dst);else rmSync(c.dst,{force:true});}
    throw e;
  }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{console.log('Backup: '+applyUpdate(process.argv[2]??join(root,'.runtime','updates','manifest.json')));}
  catch(e){console.error('Update aborted: '+e.message);process.exitCode=1;}
}
