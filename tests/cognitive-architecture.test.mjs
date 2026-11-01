import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledgeGraph,personalityCore,executivePlan,conversationPolicy,agentPolicy,qualityGate,cognitiveContext} from '../server/cognitive-architecture.mjs';
test('knowledge graph links approved nodes and excludes unapproved entries',()=>{const g=knowledgeGraph([{summary:'Проект Amayune память развитие'}],[{kind:'goal',status:'active',detail:'Проект Amayune улучшить память'},{kind:'goal',status:'pending',detail:'секретный проект'}]);assert.equal(g.nodes.length,2);assert.equal(g.links.length,1);assert.ok(!JSON.stringify(g).includes('секретный'))});
test('personality uses approved preferences only',()=>{assert.deepEqual(personalityCore([{kind:'preference',status:'active',detail:'коротко'},{kind:'preference',status:'pending',detail:'длинно'}]).preferences,['коротко'])});
test('executive plan and conversation remain bounded',()=>{assert.ok(executivePlan('разработай архитектуру').length>2);assert.equal(conversationPolicy('привет',[]).askOnlyWhenNecessary,true)});
test('agent policy requires opt-in and action approval',()=>{assert.equal(agentPolicy({enabled:true,approved:false}).mayExecute,false);assert.equal(agentPolicy({enabled:true,approved:true,quiet:true}).mayExecute,false)});
test('quality gate rejects unverified claims and completions',()=>{assert.equal(qualityGate({claims:['done'],completed:[{verified:false}]}).pass,false);assert.equal(qualityGate({claims:['done'],evidence:['done'],completed:[{verified:true}]}).pass,true)});
test('context is bounded and excludes unapproved data',()=>{const c=cognitiveContext({prompt:'память',events:[],entries:[{kind:'goal',status:'pending',detail:'never expose'}]});assert.ok(c.text.length<=2400);assert.ok(!c.text.includes('never expose'))});
