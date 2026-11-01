import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SOUL_IDENTITY,detectTone,reflect,createSoulStore,buildSoulContext} from '../server/soul.mjs';
test('stable identity and tone',()=>{assert.equal(SOUL_IDENTITY.name,'Amayune');assert.equal(detectTone('Срочно'), 'concise');assert.equal(detectTone('Не работает'), 'supportive')});
test('memory persists and supports user deletion',()=>{const root=mkdtempSync(join(tmpdir(),'soul-'));try{let s=createSoulStore(root);const id=s.remember('language','TypeScript');s.correct('Python','TypeScript');s.addReflection('Avoid unsupported claims');assert.throws(()=>s.remember('topic','value','inferred'));s.close();s=createSoulStore(root);assert.equal(s.preferences().length,1);assert.equal(s.corrections().length,1);assert.equal(s.reflections().length,1);s.forgetPreference(id);assert.equal(s.preferences().length,0);s.reset();assert.equal(s.corrections().length,0);s.close()}finally{rmSync(root,{recursive:true,force:true})}});
test('context and reflection',()=>{const context=buildSoulContext({message:'Привет',preferences:[{topic:'language',detail:'TypeScript'}]});assert.match(context,/TypeScript/);assert.match(context,/not a human/);assert.equal(reflect({answer:'Я исправил'}).requiresReview,true)});
