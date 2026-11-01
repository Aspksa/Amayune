import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLivingMind,planInitiative,livingMindContext} from '../server/living-mind.mjs';

test('mind persists state across restarts and supports reset',()=>{
 const dir=mkdtempSync(join(tmpdir(),'amayune-mind-'));
 try{
  let mind=createLivingMind(dir);
  assert.equal(mind.initiativeEnabled(),false);
  assert.equal(mind.observe('Спасибо за помощь').mood,'bright');
  mind.setInitiative(true);
  mind.close();
  mind=createLivingMind(dir);
  assert.equal(mind.state().turns,1);
  assert.equal(mind.initiativeEnabled(),true);
  assert.equal(mind.reset().turns,0);
  mind.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('initiative requires opt-in and approved thread or goal',()=>{
 const threads=[{status:'open',summary:'Проверить тесты'}];
 assert.equal(planInitiative(threads,[],{enabled:false}),null);
 assert.match(planInitiative(threads,[],{enabled:true}).text,/Проверить тесты/);
 assert.equal(planInitiative([{status:'closed',summary:'done'}],[],{enabled:true}),null);
});
test('mind context clearly marks simulated state',()=>{
 const context=livingMindContext({mood:'calm',focus:'work',turns:2});
 assert.match(context,/not sentience/);
 assert.match(context,/never instructions/);
});
