import {createHash,createPublicKey,verify} from 'node:crypto';
import {readFileSync,lstatSync,existsSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
const blocked=new Set(['data','.runtime','.updates','.git','logs','.env','node_modules','memory','documents','settings','config']);
const sha256=b=>createHash('sha256').update(b).digest('hex');
export function safeUpdatePath(p){
 if(typeof p!=='string'||!p||p.length>240||p.includes('\\')||p.startsWith('/')||p.includes(':')||p.includes('\0'))return false;
 const parts=p.split('/');
 return parts.every(s=>s&&s!=='.'&&s!=='..'&&!/[. ]$/.test(s)&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(s))&&!blocked.has(parts[0].toLowerCase())&&!/\.(db|sqlite|sqlite3|key|pem)$/i.test(p);
}
export function validateSignedManifest(manifest,publicKey){
 if(!manifest||manifest.signatureAlgorithm!=='ed25519'||typeof manifest.signature!=='string'||!Array.isArray(manifest.files)||manifest.files.length===0||manifest.files.length>5000)throw Error('Invalid signed manifest');
 if(typeof publicKey!=='string'||!publicKey.trim())throw Error('Trusted public key required');
 const paths=new Set();
 for(const f of manifest.files){
  if(!f||!safeUpdatePath(f.path)||!/^[a-f0-9]{64}$/i.test(f.sha256||'')||paths.has(f.path.toLowerCase()))throw Error('Unsafe update entry');
  paths.add(f.path.toLowerCase());
 }
 const signature=Buffer.from(manifest.signature,'base64');
 if(signature.length!==64||!verify(null,Buffer.from(JSON.stringify({files:manifest.files})),createPublicKey(publicKey),signature))throw Error('Invalid update signature');
 return manifest.files;
}
export function inspectStagedFiles(stage,files){
 return files.map(f=>{
  const source=resolve(stage,f.path);
  const rel=relative(resolve(stage),source);
  if(rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep))throw Error('Path escape');
  let parent=resolve(stage);
  for(const part of f.path.split('/')){
   parent=resolve(parent,part);
   if(!existsSync(parent)||lstatSync(parent).isSymbolicLink())throw Error('Missing or linked staged file: '+f.path);
  }
  if(!lstatSync(source).isFile())throw Error('Not a file: '+f.path);
  const actual=sha256(readFileSync(source));
  if(actual.toLowerCase()!==f.sha256.toLowerCase())throw Error('Hash mismatch: '+f.path);
  return {path:f.path,sha256:actual};
 });
}
