import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DEFAULTS,validate,saveSettings,loadSettings,hasKey} from '../server/settings.mjs';
test('loads defaults and preserves valid values across disk reload',()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-settings-'));
 try{
  assert.equal(loadSettings(root).temperature,DEFAULTS.temperature);
  saveSettings(root,{primaryModel:'my/model-v2',temperature:0.4,budgetTokens:5000});
  const saved=loadSettings(root);assert.equal(saved.primaryModel,'my/model-v2');assert.equal(saved.temperature,0.4);assert.equal(saved.budgetTokens,5000);assert.equal(hasKey(root),false);
  assert.equal(JSON.parse(readFileSync(join(root,'data','cloudru-settings.json'),'utf8')).version,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('rejects unknown fields and bad settings',()=>{
 assert.throws(()=>validate({apiKey:'DO_NOT_SAVE'}),/Неизвестное/);
 assert.throws(()=>validate({temperature:9}),/temperature/);
 assert.throws(()=>validate({maxTokens:-1}),/maxTokens/);
 assert.throws(()=>validate({primaryModel:'\n'}),/модели/);
});
