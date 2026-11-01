import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnifiedCore,deduplicateMemory,safeContext} from '../server/unified-core.mjs';
test('snapshot reads existing stores without migration or mutation',()=>{const entries=[{detail:'goal'}];const c=createUnifiedCore({getEvents:()=>[],getEntries:()=>entries,getTurns:()=>[]});assert.equal(c.snapshot().entries,entries)});
test('cycle isolates failure and keeps subsequent workers running',()=>{let ran=false;const errors=[];const c=createUnifiedCore({getEvents:()=>[],getEntries:()=>[],getTurns:()=>[],workers:[{name:'broken',tick:()=>{throw Error('broken')}},{name:'ok',tick:()=>{ran=true}}],onFailure:(name)=>errors.push(name)});assert.deepEqual(c.runCycle(),{completed:['ok'],failed:['broken']});assert.equal(ran,true);assert.deepEqual(errors,['broken']);assert.equal(c.status().failures,1)});
test('memory dedup preserves first original and context has hard bound',()=>{assert.equal(deduplicateMemory([{summary:'A'},{summary:'a'},{detail:'B'}]).length,2);assert.equal(safeContext(['abc','def'],4),'abc'+String.fromCharCode(10))});
