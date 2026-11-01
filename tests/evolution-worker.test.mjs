import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEvolutionWorker,summarizeQuality,chooseTopic} from '../server/evolution-worker.mjs';
test('quality summary detects recurring issues',()=>{const s=summarizeQuality([{score:60,issues:'["repeat"]'},{score:80,issues:'["repeat"]'}]);assert.equal(s.average,70);assert.equal(s.recurring[0].count,2)});
test('only approved topics influence reflection',()=>{assert.equal(chooseTopic([{kind:'interest',status:'pending',detail:'private'}]),null);assert.equal(chooseTopic([{kind:'interest',status:'active',detail:'typescript'}]),'typescript')});
test('worker persists reflections and deduplicates unchanged turns',()=>{const dir=mkdtempSync(join(tmpdir(),'amayune-worker-'));try{const turns=[{id:'3',score:70,issues:'[]'},{id:'2',score:70,issues:'[]'},{id:'1',score:70,issues:'[]'}];let w=createEvolutionWorker(dir,{getTurns:()=>turns,getEntries:()=>[]});assert.ok(w.tick());assert.equal(w.tick(),null);w.close();w=createEvolutionWorker(dir,{getTurns:()=>turns,getEntries:()=>[]});assert.equal(w.tick(),null);assert.equal(w.reflections().length,1);w.close()}finally{rmSync(dir,{recursive:true,force:true})}});
