import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAutonomousEvolution,chooseOpening,reflectionHints} from '../server/autonomous-evolution.mjs';
test('initiative is opt-in and rate limited',()=>{assert.equal(chooseOpening({enabled:false,now:100000000}),null);assert.equal(chooseOpening({enabled:true,now:100000000,last:99999999}),null);assert.match(chooseOpening({enabled:true,now:100000000}),/Привет/)});
test('persistent settings, proposals and versions',()=>{const dir=mkdtempSync(join(tmpdir(),'amayune-evolution-'));try{let s=createAutonomousEvolution(dir);assert.equal(s.opening([],100000000,12),null);s.configure({enabled:true,voice:true});assert.equal(s.opening([],100000000,12).voice,true);assert.equal(s.opening([],100000001,12),null);const id=s.propose('style','говорить короче');s.decide(id,true);s.close();s=createAutonomousEvolution(dir);assert.equal(s.versions().length,1);assert.equal(s.settings().enabled,1);s.close()}finally{rmSync(dir,{recursive:true,force:true})}});
test('reflection hints are bounded',()=>{assert.equal(reflectionHints(['x','x']).length,1)});
