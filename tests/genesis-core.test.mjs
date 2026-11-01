import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {analyzeContinuity,assessChange,genesisPrompt,createGenesisCore} from '../server/genesis-core.mjs';
test('continuity uses only active entries and detects duplicates',()=>{const c=analyzeContinuity([{id:'a',kind:'interest',status:'active',detail:' Rust '},{id:'b',kind:'interest',status:'active',detail:'rust'},{id:'c',kind:'goal',status:'pending',detail:'secret'}]);assert.deepEqual(c.duplicates,['b']);assert.equal(c.approved.length,2)});
test('regression assessment requires evidence',()=>{assert.equal(assessChange([],70).status,'insufficient');assert.equal(assessChange(Array.from({length:6},()=>({score:40})),70).status,'regressed');assert.match(genesisPrompt({mode:'careful'}),/cautious/)});
test('genesis snapshots persist and quality mode rolls back',()=>{const root=mkdtempSync(join(tmpdir(),'amayune-genesis-'));try{let scores=[70,70,70,70,70,70];let turns=()=>scores.map((score,i)=>({id:String(i),score}));let g=createGenesisCore(root,{getTurns:turns});assert.ok(g.tick());g.close();scores=[40,40,40,40,40,40];turns=()=>scores.map((score,i)=>({id:'new'+i,score}));g=createGenesisCore(root,{getTurns:turns});assert.equal(g.tick().mode,'careful');assert.equal(g.snapshots().length,2);assert.equal(g.rollback().mode,'normal');g.close()}finally{rmSync(root,{recursive:true,force:true})}});
