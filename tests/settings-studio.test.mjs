import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/studio.css',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
test('redesigned settings assets are linked and served by allowlisted route',()=>{
 assert.match(html,/href="\/studio\.css"/);
 assert.match(server,/url\.pathname==='\/studio\.css'/);
 assert.ok(css.includes('#app>aside #settingsSubnav'));
});
test('all settings destinations remain available after redesign',()=>{
 for(const page of ['appearance','interface','connection','security','performance','notifications','maintenance','updates','about']){
  assert.ok(html.includes('data-page="'+page+'"'));
  assert.ok(html.includes('id="'+page+'"'));
 }
 assert.match(html,/id="saveKey"/);
 assert.match(html,/id="checkUpdates"/);
});
test('responsive navigation and accessible current page',()=>{
 const js=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:820px\)/);
 assert.match(js,/aria-current/);
});
