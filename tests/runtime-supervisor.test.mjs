import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuntimeSupervisor} from '../server/runtime-supervisor.mjs';
test('supervisor starts idempotent workers and tracks health',()=>{let n=0;const s=createRuntimeSupervisor([{name:'a',start:()=>{n++}}]);assert.equal(s.check().a.failures,0);assert.equal(n,1);s.stop()});
test('supervisor isolates worker failure and backs off',()=>{let called=0;const s=createRuntimeSupervisor([{name:'bad',start:()=>{throw Error('offline')}},{name:'good',start:()=>{called++}}]);const state=s.check();assert.equal(state.bad.failures,1);assert.equal(state.good.failures,0);assert.equal(called,1);s.check();assert.equal(s.status().bad.failures,1);s.stop()});
