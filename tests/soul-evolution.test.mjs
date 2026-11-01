import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEvolutionStore,dialogueStyle,evolveTraits,evaluateDialogue,evolutionContext} from '../server/soul-evolution.mjs';
test('natural dialogue varies with context',()=>{assert.equal(dialogueStyle('Срочно').tone,'concise');assert.equal(dialogueStyle('Не работает').tone,'supportive');assert.equal(dialogueStyle('Привет').tone,'warm')});
test('growth is bounded and reversible',()=>{const root=mkdtempSync(join(tmpdir(),'soul-evolution-'));try{let s=createEvolutionStore(root);const original=s.profile().traits.warmth;const v=s.evolve({warmth:5},'explicit feedback');assert.ok(v.traits.warmth<=original+0.05+1e-8);s.remember('Worked on a project');assert.throws(()=>s.remember('unconfirmed','inferred'));s.close();s=createEvolutionStore(root);assert.equal(s.experiences().length,1);assert.equal(s.history().length,1);s.rollback(v.id);assert.equal(s.history().length,2);s.close()}finally{rmSync(root,{recursive:true,force:true})}});
test('quality signals and stable context',()=>{assert.ok(evaluateDialogue('Я помню').warnings.includes('unverified-memory'));assert.equal(evaluateDialogue('Я исправил файл').ok,false);assert.match(evolutionContext({message:'Привет'}),/Eternal Kitsune/)});
