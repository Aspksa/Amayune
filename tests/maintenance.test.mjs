import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createBackup,restoreBackup,diagnostics} from '../server/maintenance.mjs';
test('exports settings but not API key or encrypted secret',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-backup-'));
 try{const backup=createBackup(root,{theme:'dark'});assert.equal(backup.format,'amayune-backup');assert.equal(backup.appearance.theme,'dark');assert.ok(!JSON.stringify(backup).includes('cloudru-secret'));assert.ok(!Object.hasOwn(backup,'key'));assert.equal(diagnostics(root).keyStored,false);}
 finally{rmSync(root,{recursive:true,force:true});}
});
test('rejects malformed backups without changing settings',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-backup-'));
 try{assert.throws(()=>restoreBackup(root,{format:'other',version:1,cloud:{}}));assert.throws(()=>restoreBackup(root,{format:'amayune-backup',version:1,cloud:{temperature:900},appearance:null}));const restored=restoreBackup(root,createBackup(root,{theme:'gold'}));assert.equal(restored.cloud.version,1);}
 finally{rmSync(root,{recursive:true,force:true});}
});
