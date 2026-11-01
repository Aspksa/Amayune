import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSoulStore,relevantMemories,assessSoulAnswer,buildSoulContext} from '../server/soul.mjs';
test('memory retrieval ranks topic relevance',()=>{const items=[{topic:'weather',detail:'rain'},{topic:'programming',detail:'TypeScript'}];assert.equal(relevantMemories('TypeScript programming',items)[0].topic,'programming');assert.match(buildSoulContext({message:'TypeScript',preferences:items}),/TypeScript/)});
test('preference corrections replace outdated values',()=>{const root=mkdtempSync(join(tmpdir(),'amayune-soul-quality-'));try{const s=createSoulStore(root);s.remember('Language','Python');s.remember('language','TypeScript');assert.equal(s.preferences().length,1);assert.equal(s.preferences()[0].detail,'TypeScript');s.close()}finally{rmSync(root,{recursive:true,force:true})}});
test('quality checks flag unverified actions and memories',()=>{assert.equal(assessSoulAnswer('Я исправил всё').ok,false);assert.ok(assessSoulAnswer('Я помню, что ты говорил').warnings.includes('unsupported-memory-claim'));assert.equal(assessSoulAnswer('Вот решение.').ok,true)});
