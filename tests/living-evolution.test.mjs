import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLivingEvolution,scoreTurn,evolutionGuidance} from '../server/living-evolution.mjs';
test('quality scores penalize warnings',()=>{assert.ok(scoreTurn({answer:'Long enough response with relevant content.'}).score>scoreTurn({answer:'Long enough response with relevant content.',warnings:['wrong']}).score)});
test('automatically adapts, persists and rolls back without changing identity',()=>{const dir=mkdtempSync(join(tmpdir(),'amayune-evolve-'));try{let e=createLivingEvolution(dir);for(let i=0;i<5;i++)e.observe('short',['warning','repeated']);assert.equal(e.current().quality,'careful');assert.match(evolutionGuidance(e.current()),/Verify claims/);const base=e.versions().find(x=>x.id==='base');e.rollback(base.id);assert.equal(e.current().quality,'normal');e.close();e=createLivingEvolution(dir);assert.equal(e.current().quality,'normal');assert.equal(e.turns().length,5);e.close()}finally{rmSync(dir,{recursive:true,force:true})}});
test('identity changes require proposal',()=>{const dir=mkdtempSync(join(tmpdir(),'amayune-evolve-'));try{const e=createLivingEvolution(dir);const id=e.propose('identity','test');assert.equal(e.proposals()[0].status,'pending');e.decide(id,false);assert.equal(e.proposals()[0].status,'rejected');e.close()}finally{rmSync(dir,{recursive:true,force:true})}});
