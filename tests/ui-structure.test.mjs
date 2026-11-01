import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/style.css',import.meta.url),'utf8');
test('one settings menu and no removed preview or duplicate quick actions',()=>{
 assert.equal((html.match(/id="settingsNav"/g)||[]).length,1);
 assert.equal((html.match(/data-page="connection"/g)||[]).length,1);
 assert.doesNotMatch(html,/ЖИВОЙ ПРЕДПРОСМОТР|id="quickCloud"|id="quickReset"/);
 assert.match(html,/class="sidebar-bottom"/);
});
test('settings interactions are wired without dead sidebar controls',()=>{
 const ids=[...js.matchAll(/getElementById\('([^']+)'\)/g)].map(m=>m[1]);
 for(const id of ids)assert.ok(html.includes('id="'+id+'"'),'Missing DOM element '+id);
 assert.match(js,/localStorage\.setItem\('amayune\.appearance\.v1'/);
 assert.match(js,/function searchSettings/);
 assert.match(js,/pending=pending\.catch/);
});
test('reduced motion and responsive layout are present',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:820px\)/);
});

test('final polish offers skip navigation and search feedback',()=>{assert.match(html,/class="skip-link"/);assert.match(html,/id="mainContent"/);assert.match(html,/id="searchEmpty"/);assert.match(js,/searchEmpty/);assert.match(css,/\.skip-link:focus/);assert.match(css,/#status\[data-state=error\]/);});
