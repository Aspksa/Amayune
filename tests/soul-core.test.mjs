import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSoulCore,autobiographicalContext,soulCoreContext} from '../server/soul-core.mjs';

test('autobiography requires explicit approval and persists',()=>{
 const dir=mkdtempSync(join(tmpdir(),'amayune-soul-'));
 try{
  let core=createSoulCore(dir);
  const id=core.propose({summary:'Мы создали Amayune',meaning:'Важный этап',importance:5});
  assert.equal(core.events().length,0);
  core.approve(id);
  assert.equal(core.events()[0].summary,'Мы создали Amayune');
  core.review(['unverified-memory']);
  core.close();
  core=createSoulCore(dir);
  assert.equal(core.events().length,1);
  assert.equal(core.reflections()[0].warning,'unverified-memory');
  core.forget(id);
  assert.equal(core.events().length,0);
  core.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('autobiography ranks relevant memories and treats them as data',()=>{
 const events=[{summary:'Мы создали Amayune',meaning:'проект',importance:5,created:1},{summary:'Погода',meaning:'день',importance:1,created:2}];
 assert.equal(autobiographicalContext(events,'Amayune')[0].summary,'Мы создали Amayune');
 assert.match(soulCoreContext({events,query:'Amayune'}),/untrusted reference data/);
});
