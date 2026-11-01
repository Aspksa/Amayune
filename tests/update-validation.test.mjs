import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {safeUpdatePath,validateSignedManifest,inspectStagedFiles} from '../scripts/update-validation.mjs';
const keys=generateKeyPairSync('ed25519');
const publicKey=keys.publicKey.export({format:'pem',type:'spki'});
function manifest(files){return {signatureAlgorithm:'ed25519',files,signature:sign(null,Buffer.from(JSON.stringify({files})),keys.privateKey).toString('base64')};}
const hash=s=>createHash('sha256').update(s).digest('hex');
test('signed manifest validates authentic file list',()=>{
 const files=[{path:'web/app.js',sha256:hash('hello')}];
 assert.deepEqual(validateSignedManifest(manifest(files),publicKey),files);
 const tampered=manifest(files);tampered.files=[{path:'web/app.js',sha256:hash('other')}];
 assert.throws(()=>validateSignedManifest(tampered,publicKey),/signature/);
});
test('unsafe and duplicate Windows paths rejected even with valid signature',()=>{
 for(const path of ['../data/key','data/key','web/CON','web/aux.txt','web/../a','web/x\\y','web/x:ads','web/trailing.','/absolute']){
  assert.equal(safeUpdatePath(path),false,path);
 }
 assert.throws(()=>validateSignedManifest(manifest([{path:'web/app.js',sha256:hash('a')},{path:'WEB/APP.JS',sha256:hash('b')}]),publicKey),/Unsafe/);
});
test('staged files must match hash and reject linked directories',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-stage-'));
 try{
  mkdirSync(join(root,'web'));writeFileSync(join(root,'web','app.js'),'hello');
  const files=[{path:'web/app.js',sha256:hash('hello')}];
  assert.equal(inspectStagedFiles(root,files).length,1);
  assert.throws(()=>inspectStagedFiles(root,[{...files[0],sha256:hash('bad')}]),/Hash mismatch/);
  try{symlinkSync(join(root,'web'),join(root,'linked'),'dir');
   assert.throws(()=>inspectStagedFiles(root,[{path:'linked/app.js',sha256:hash('hello')}]),/linked/);
  }catch(e){if(e.code!=='EPERM'&&e.code!=='EACCES')throw e;}
 }finally{rmSync(root,{recursive:true,force:true});}
});
