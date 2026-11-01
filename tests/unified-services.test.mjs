import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnifiedServices} from '../server/unified-services.mjs';
test('approved memory is deduplicated and unapproved data is excluded',()=>{const s=createUnifiedServices({getEvents:()=>[{summary:'private',status:'pending'},{summary:'approved',approved:true}],getEntries:()=>[{kind:'preference',status:'active',detail:'short'},{kind:'preference',status:'active',detail:'SHORT'},{kind:'goal',status:'pending',detail:'secret'}]});assert.equal(s.memory().entries.length,1);assert.equal(s.memory().events.length,1);assert.ok(!s.compose('short').includes('secret'))});
test('autonomy defaults to denied without explicit action approval',()=>{const s=createUnifiedServices({getAutonomy:()=>({enabled:1})});assert.equal(s.autonomy().mayInitiate,true);assert.equal(s.autonomy().mayExecute,false)});
test('system and quality readouts remain available without store migration',()=>{const s=createUnifiedServices({getWorkers:()=>({worker:{failures:0}}),getTurns:()=>[{id:1}]});assert.equal(s.evolution().observedTurns,1);assert.equal(s.system().workers.worker.failures,0);assert.equal(s.verify({claims:['done']}).pass,false)});
