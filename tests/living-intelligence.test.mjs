import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {connectMemories,goalContext,reasonPlan,progressSignal,createLivingIntelligence} from '../server/living-intelligence.mjs';
test('memory links and approved goals',()=>{const events=[{summary:'Люблю TypeScript'},{summary:'TypeScript проект'},{summary:'Книги'}];assert.equal(connectMemories(events,'TypeScript').length,2);assert.deepEqual(goalContext([{kind:'goal',status:'pending',detail:'hidden'},{kind:'goal',status:'active',detail:'ship'}]),['ship'])});
test('reasoning and quality evaluation',()=>{assert.match(reasonPlan('проанализируй архитектуру'),/verifiable/);assert.equal(progressSignal([40,40,40,40,80,80,80,80].map(score=>({score}))).status,'regression')});
test('runtime persists evaluations and failures',()=>{const root=mkdtempSync(join(tmpdir(),'amayune-intelligence-'));try{const turns=[40,40,40,40,80,80,80,80].map((score,i)=>({id:String(i),score}));let x=createLivingIntelligence(root,{getTurns:()=>turns});assert.equal(x.tick().status,'regression');assert.equal(x.tick(),null);x.recordFailure('test',Error('recoverable'));x.close();x=createLivingIntelligence(root,{getTurns:()=>turns});assert.equal(x.evaluations().length,1);assert.equal(x.failures().length,1);x.close()}finally{rmSync(root,{recursive:true,force:true})}});
