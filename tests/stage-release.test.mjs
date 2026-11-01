import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stageSignedRelease} from '../scripts/stage-release.mjs';
const {privateKey,publicKey:key}=generateKeyPairSync('ed25519');
const publicKey=key.export({format:'pem',type:'spki'});
const sha='a'.repeat(40);
const hash=x=>createHash('sha256').update(x).digest('hex');
const signed=files=>({files,signatureAlgorithm:'ed25519',signature:sign(null,Buffer.from(JSON.stringify({files})),privateKey).toString('base64')});
const response=(data)=>({ok:true,headers:{get:()=>String(data.length)},body:(async function*(){yield Buffer.from(data)})()});
test('stage authenticated files from pinned GitHub commit',async()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-download-'));
 try{
  const manifest=signed([{path:'web/new.js',sha256:hash('safe')}]);
  const urls=[];
  const result=await stageSignedRelease({root,sha,manifest,publicKey,fetcher:async url=>{urls.push(url);return response('safe');}});
  assert.equal(result.files,1);
  assert.equal(readFileSync(join(root,'.runtime','updates','staged','web','new.js'),'utf8'),'safe');
  assert.ok(urls[0].includes('/'+sha+'/web/new.js'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('rejects tampered bytes without leaving staged files',async()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-download-'));
 try{
  const manifest=signed([{path:'web/new.js',sha256:hash('safe')}]);
  await assert.rejects(stageSignedRelease({root,sha,manifest,publicKey,fetcher:async()=>response('evil')}),/Hash mismatch/);
  assert.equal(existsSync(join(root,'.runtime','updates','staged')),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
