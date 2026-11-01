import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('web/chat.html');
const js=read('web/chat.js');
const css=read('web/amayune-ui.css');

test('redesigned interface is shared by chat and settings and served locally',()=>{
 assert.match(html,/href="\/amayune-ui\.css"/);
 assert.match(read('web/index.html'),/href="\/amayune-ui\.css"/);
 assert.match(read('server/index.mjs'),/url\.pathname==='\/amayune-ui\.css'/);
 assert.match(css,/@media\s*\(max-width:\s*760px\)/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
});

test('chat actions have accessible names and mobile navigation can be dismissed',()=>{
 for(const id of ['sidebar-backdrop','sidebar-close','connection-settings','character-count'])assert.match(html,new RegExp('id="'+id+'"'),id);
 for(const id of ['rename','export','delete'])assert.match(html,new RegExp('id="'+id+'"[^>]+aria-label='));
 assert.match(js,/setSidebarOpen/);
 assert.match(js,/refreshConnectionStatus/);
});

test('welcome suggestions and draft character count are functional',()=>{
 assert.match(js,/data-prompt/);
 assert.match(js,/suggestion-card/);
 assert.match(js,/character-count/);
 assert.match(js,/input\.dispatchEvent|saveDraft\(\)/);
});
