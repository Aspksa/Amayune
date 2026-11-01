import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createGrowthStore,rankEpisodes,emotionalContext,communicationPlan,proposeGrowth,qualityReview,growthContext} from '../server/soul-growth.mjs';
test('episodic memory relevance and emotional dialogue',()=>{assert.equal(rankEpisodes('TypeScript',[{summary:'Weather',importance:2},{summary:'TypeScript project',importance:3}])[0].summary,'TypeScript project');assert.equal(emotionalContext('Срочно'),'urgent');assert.equal(communicationPlan('Срочно').length,'short')});
test('confirmed episodes and approval queue persist',()=>{const root=mkdtempSync(join(tmpdir(),'amayune-growth-'));try{let s=createGrowthStore(root);s.remember('TypeScript project',{importance:5});assert.throws(()=>s.remember('invented',{source:'inferred'}));const id=s.addGoal('Speak naturally');const proposal=s.propose('Больше нежности');s.close();s=createGrowthStore(root);assert.equal(s.episodes('TypeScript').length,1);assert.equal(s.goals().length,1);assert.equal(s.pending().length,1);assert.ok(s.approve(proposal.id).warmth>0);s.finishGoal(id);assert.equal(s.goals()[0].status,'done');s.close()}finally{rmSync(root,{recursive:true,force:true})}});
test('evaluation and context boundaries',()=>{assert.equal(qualityReview('Я удалил файл').ok,false);assert.match(growthContext({message:'Привет'}),/Eternal Kitsune/);assert.ok(proposeGrowth('Больше юмора').playfulness>0)});
