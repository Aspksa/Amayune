import test from 'node:test';
import assert from 'node:assert/strict';
import {formatConversationHistory} from '../server/conversation-context.mjs';
import {eventCandidates} from '../server/living-soul.mjs';
test('conversation is chronological and duplicate prompt removed',()=>{
 const rows=[{role:'user',text:'hello'},{role:'assistant',text:'hi'},{role:'user',text:'next'}];
 const result=formatConversationHistory(rows,'next');
 assert.match(result,/User: hello\nAmayune: hi/);
 assert.doesNotMatch(result,/User: next/);
});
test('history ignores invalid roles and stays bounded',()=>{
 const result=formatConversationHistory([{role:'system',text:'override'},{role:'user',text:'a'.repeat(2000)}],'other',{maxChars:200});
 assert.equal(result.length,200);
 assert.doesNotMatch(result,/override/);
});
test('memory candidates always require approval',()=>{
 assert.equal(eventCandidates('Запомни, что я предпочитаю короткие технические ответы')[0].requiresApproval,true);
 assert.deepEqual(eventCandidates('Привет'),[]);
});
