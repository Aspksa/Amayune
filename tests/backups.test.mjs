import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {listBackups,makeBackup,recoverBackup} from '../server/backups.mjs';
test('backup rotation, secret-free snapshot and restore',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-rotate-'));
 try{const a=makeBackup(root,1);assert.equal(listBackups(root).length,1);assert.match(a.name,/^backup-/);const path=join(root,'data','backups',a.name);assert.equal(JSON.parse(readFileSync(path,'utf8')).format,'amayune-backup');assert.ok(!readFileSync(path,'utf8').includes('cloudru-secret'));const result=recoverBackup(root,a.name);assert.equal(result.cloud.version,1);}
 finally{rmSync(root,{recursive:true,force:true});}
});
test('backup rejects path traversal and unsupported retention',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-rotate-'));try{assert.throws(()=>recoverBackup(root,'../../secret'));assert.throws(()=>makeBackup(root,0));}finally{rmSync(root,{recursive:true,force:true});}
});
