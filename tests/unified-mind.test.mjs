import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {collectMindTimeline,createUnifiedMindStore} from '../server/unified-mind.mjs';
test('timeline combines approved sources in newest-first order',()=>{
 const sources={living:{memories:()=>[{summary:'remember',created:10}],milestones:()=>[],threads:()=>[]},growth:{episodes:()=>[],goals:()=>[{description:'goal',created:20}]},evolution:{experiences:()=>[],history:()=>[]},mind:{events:()=>[]}};
 assert.deepEqual(collectMindTimeline(sources).map(x=>x.description),['goal','remember']);
});
test('snapshots persist and do not mutate source databases',()=>{
 const dir=mkdtempSync(join(tmpdir(),'amayune-unified-'));
 try{let db=createUnifiedMindStore(dir);const sources={living:{memories:()=>[],milestones:()=>[],threads:()=>[]},growth:{episodes:()=>[],goals:()=>[]},evolution:{experiences:()=>[],history:()=>[]},mind:{events:()=>[]}};assert.equal(db.capture(sources).count,0);db.close();db=createUnifiedMindStore(dir);assert.deepEqual(db.latest().timeline,[]);db.close()}finally{rmSync(dir,{recursive:true,force:true})}
});
