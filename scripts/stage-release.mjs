import {mkdir,writeFile,rename,rm,stat} from 'node:fs/promises';
import {join,dirname,resolve,relative,sep} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {validateSignedManifest,safeUpdatePath} from './update-validation.mjs';
const MAX_FILE_BYTES=25_000_000;
const MAX_TOTAL_BYTES=150_000_000;
const API='https://raw.githubusercontent.com/Aspksa/Amayune';
export async function stageSignedRelease({root,sha,manifest,publicKey,fetcher=fetch}){
 if(!/^[a-f0-9]{40}$/i.test(sha))throw Error('Invalid commit SHA');
 const files=validateSignedManifest(manifest,publicKey);
 const stagingRoot=join(root,'.runtime','updates');
 const temporary=join(stagingRoot,'incoming-'+randomUUID());
 const target=join(stagingRoot,'staged');
 const lock=join(stagingRoot,'stage.lock');
 let total=0;
 await mkdir(stagingRoot,{recursive:true});
 await mkdir(lock);
 try{
  await mkdir(temporary,{recursive:true});
  for(const entry of files){
   if(!safeUpdatePath(entry.path))throw Error('Unsafe path');
   const url=API+'/'+sha+'/'+entry.path.split('/').map(encodeURIComponent).join('/');
   const response=await fetcher(url,{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('GitHub file download failed: '+response.status);
   const declared=Number(response.headers?.get?.('content-length')||0);
   if(declared>MAX_FILE_BYTES)throw Error('File exceeds size limit');
   const chunks=[];let size=0;
   for await(const chunk of response.body){
    size+=chunk.byteLength;total+=chunk.byteLength;
    if(size>MAX_FILE_BYTES||total>MAX_TOTAL_BYTES)throw Error('Update exceeds size limit');
    chunks.push(Buffer.from(chunk));
   }
   const data=Buffer.concat(chunks);
   if(createHash('sha256').update(data).digest('hex').toLowerCase()!==entry.sha256.toLowerCase())throw Error('Hash mismatch: '+entry.path);
   const dest=resolve(temporary,entry.path);
   const rel=relative(temporary,dest);
   if(rel==='..'||rel.startsWith('..'+sep))throw Error('Path escape');
   await mkdir(dirname(dest),{recursive:true});await writeFile(dest,data,{flag:'wx'});
  }
  // Refuse replacing an existing prepared update, including on POSIX where rename can replace directories.
  try{await stat(target);throw Error('A staged update already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
  await writeFile(join(temporary,'manifest.json'),JSON.stringify(manifest),{flag:'wx'});
  await writeFile(join(temporary,'source.json'),JSON.stringify({sha}),{flag:'wx'});
  await rename(temporary,target);
  return {files:files.length,bytes:total,sha};
 }catch(error){await rm(temporary,{recursive:true,force:true});throw error;}
 finally{await rm(lock,{recursive:true,force:true});}
}
