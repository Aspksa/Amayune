import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('floating avatar is present in chat and settings, left opens chat and right opens avatar settings',()=>{
 for(const file of ['web/index.html','web/chat.html']){assert.match(read(file),/avatar\.js/);assert.match(read(file),/avatar\.css/)}
 const avatar=read('web/avatar.js');
 assert.match(avatar,/avatar\.onclick=/);
 assert.match(avatar,/avatar\.oncontextmenu=/);
 assert.match(avatar,/location\.assign\('\/chat'\)/);
});
test('stream error markers are recognized instead of treated as successful answers',()=>{
 assert.match(read('web/chat.js'),/streamError=msg\.text\.match/);
 assert.match(read('server/inference.mjs'),/Math\.max\(cfg\.timeoutMs,120000\)/);
});
test('colored vector tab icons exist for all settings categories',()=>{
 const css=read('web/settings-workspace.css');
 for(const name of ['appearance','interface','connection','security','performance','notifications','maintenance','updates','about'])assert.ok(css.includes('[data-page="'+name+'"]'),name);
});
