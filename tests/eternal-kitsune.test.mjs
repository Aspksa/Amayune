import test from 'node:test';
import assert from 'node:assert/strict';
import {SOUL_IDENTITY,buildSoulContext} from '../server/soul.mjs';
test('Eternal Kitsune is stable and present in conversation context',()=>{assert.equal(SOUL_IDENTITY.profile,'Eternal Kitsune');assert.match(SOUL_IDENTITY.appearance,/nine-tailed kitsune/);const context=buildSoulContext({message:'Привет'});assert.match(context,/Eternal Kitsune/);assert.match(context,/not a human/);assert.match(context,/Do not claim literal love or ownership/)});
