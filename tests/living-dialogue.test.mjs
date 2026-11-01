import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createDialogueState,evolveAffect,dialogueGuidance} from '../server/living-dialogue.mjs';
test('emotional style changes gradually and remains bounded',()=>{const a=evolveAffect({warmth:0.6,energy:0.5},'ура отлично');assert.ok(a.energy>0.5&&a.energy<0.75);assert.ok(a.warmth>=0&&a.warmth<=1)});
test('dialogue state survives restart and resets',()=>{const dir=mkdtempSync(join(tmpdir(),'amayune-dialogue-'));try{let s=createDialogueState(dir);s.observe('ура отлично');s.close();s=createDialogueState(dir);assert.ok(s.state().energy>0.5);s.reset();assert.equal(s.state().energy,0.5);s.close()}finally{rmSync(dir,{recursive:true,force:true})}});
test('dialogue guidance avoids invented memories',()=>{assert.match(dialogueGuidance({affect:{warmth:0.6,energy:0.5}}),/Never invent/)});
