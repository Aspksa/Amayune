import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {requestInstallation,updateStatus} from '../scripts/update-lifecycle.mjs';
import {restoreUpdate} from '../scripts/update.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const pem=publicKey.export({format:'pem',type:'spki'});
const sha='a'.repeat(40);
function fixture(root,contents='verified'){
 const files=[{path:'web/app.js',sha256:createHash('sha256').update('verified').digest('hex')}];
 const signature=sign(null,Buffer.from(JSON.stringify({files})),privateKey).toString('base64');
 const stage=join(root,'.runtime','updates','staged');
 mkdirSync(join(stage,'web'),{recursive:true});
 writeFileSync(join(stage,'web','app.js'),contents);
 writeFileSync(join(stage,'manifest.json'),JSON.stringify({signatureAlgorithm:'ed25519',files,signature}));
 writeFileSync(join(stage,'source.json'),JSON.stringify({sha}));
}
test('installation requires signed and verified staging, and queues only once',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-lifecycle-'));
 try{
  fixture(root);
  assert.deepEqual(updateStatus(root),{state:'idle'});
  assert.equal(requestInstallation(root,sha,pem).state,'ready');
  assert.equal(updateStatus(root).sha,sha);
  assert.throws(()=>requestInstallation(root,sha,pem),/already pending/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('tampered staged file cannot be queued for installation',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-lifecycle-'));
 try{
  fixture(root,'tampered');
  assert.throws(()=>requestInstallation(root,sha,pem),/Hash mismatch/);
  assert.deepEqual(updateStatus(root),{state:'idle'});
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('journal restores changed and newly created files after interrupted installation',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-rollback-'));
 try{
  const backup=join(root,'.runtime','backups','update-test');
  mkdirSync(join(backup,'files','web'),{recursive:true});
  mkdirSync(join(root,'web'),{recursive:true});
  writeFileSync(join(root,'web','app.js'),'updated');
  writeFileSync(join(root,'web','new.js'),'new');
  writeFileSync(join(backup,'files','web','app.js'),'original');
  writeFileSync(join(backup,'journal.json'),JSON.stringify({root,entries:[{path:'web/app.js',existed:true},{path:'web/new.js',existed:false}]}));
  assert.equal(restoreUpdate(root,backup),true);
  assert.equal(readFileSync(join(root,'web','app.js'),'utf8'),'original');
  assert.equal(requireFileMissing(join(root,'web','new.js')),true);
 }finally{rmSync(root,{recursive:true,force:true});}
});
function requireFileMissing(path){try{readFileSync(path);return false;}catch(e){if(e.code==='ENOENT')return true;throw e;}}
