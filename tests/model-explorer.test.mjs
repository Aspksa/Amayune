import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
test('model explorer includes searchable and validated controls',()=>{for(const id of ['modelSearch','verifySelection','selectionStatus','modelInfo'])assert.match(html,new RegExp('id="'+id+'"'));assert.match(js,/renderModelCatalogue/);assert.match(js,/models\.some\(m=>m\.id===id\)/);});
