import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLivingSoulStore,eventCandidates,conversationHabits,consistencyWarnings,livingContext} from '../server/living-soul.mjs';
test('important events are suggestions, not automatically saved',()=>{assert.equal(eventCandidates('Запомни, мы создали новый проект').length,1);assert.equal(eventCandidates('привет').length,0)});
test('habits and consistency checks',()=>{assert.equal(conversationHabits('Отвечай кратко').conciseTechnical,true);assert.ok(consistencyWarnings('Я обладаю сознанием').includes('identity-contradiction'))});
test('approval, continuity, consolidation and forgetting persist',()=>{const root=mkdtempSync(join(tmpdir(),'living-soul-'));try{let s=createLivingSoulStore(root);const id=s.propose('memory','We built TypeScript module');assert.equal(s.memories().length,0);s.approve(id);s.approve(s.propose('memory','We built TypeScript module'));s.approve(s.propose('habit','Prefer concise technical replies'));const thread=s.propose('thread','Finish testing');s.approve(thread);assert.equal(s.memories('TypeScript').length,1);assert.equal(s.threads().length,1);s.close();s=createLivingSoulStore(root);assert.equal(s.habits().length,1);assert.equal(s.consolidate(),0);assert.match(livingContext({memories:s.memories(),habits:s.habits()}),/Eternal Kitsune/);s.forget('memories',s.memories()[0].id);assert.equal(s.memories().length,0);s.close()}finally{rmSync(root,{recursive:true,force:true})}});
