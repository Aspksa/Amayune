import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSoulLearning,learningContext} from '../server/soul-learning.mjs';
test('learning requires approval, persists and can be forgotten',()=>{
 const dir=mkdtempSync(join(tmpdir(),'amayune-learn-'));
 try{let s=createSoulLearning(dir);const id=s.propose('preference','короткие ответы');assert.equal(s.entries()[0].status,'pending');s.approve(id);s.review('Ответ',['warning']);s.close();s=createSoulLearning(dir);assert.equal(s.entries()[0].status,'active');assert.equal(s.reviews().length,1);assert.match(learningContext({preferences:s.entries()}),/короткие ответы/);s.forget(id);assert.equal(s.entries().length,0);s.close()}finally{rmSync(dir,{recursive:true,force:true})}
});
test('invalid proposals are rejected',()=>{const dir=mkdtempSync(join(tmpdir(),'amayune-learn-'));try{const s=createSoulLearning(dir);assert.throws(()=>s.propose('unsafe','anything'));s.close()}finally{rmSync(dir,{recursive:true,force:true})}});
