import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGrowthCycle,planGrowth} from '../server/growth-cycle.mjs';
test('only approved interests affect guidance',()=>{const p=planGrowth({entries:[{kind:'interest',status:'pending',detail:'private'},{kind:'interest',status:'active',detail:'TypeScript'}]});assert.deepEqual(p.approved,['TypeScript']);assert.equal(p.pending,1)});
test('growth cycle is persistent and deduplicated',()=>{const root=mkdtempSync(join(tmpdir(),'amayune-growth-'));try{const turns=[{id:'a',score:60},{id:'b',score:70},{id:'c',score:80}];let cycle=createGrowthCycle(root,{getTurns:()=>turns,getEntries:()=>[],getReflections:()=>[]});assert.ok(cycle.tick());assert.equal(cycle.tick(),null);cycle.close();cycle=createGrowthCycle(root,{getTurns:()=>turns});assert.equal(cycle.tick(),null);assert.equal(cycle.history().length,1);cycle.close()}finally{rmSync(root,{recursive:true,force:true})}});
