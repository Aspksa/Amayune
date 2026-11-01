import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const inference=readFileSync(new URL('../server/inference.mjs',import.meta.url),'utf8');
test('simple Cloud.ru picker keeps existing settings IDs and hides request parameters',()=>{
 for(const id of ['apiKey','saveKey','checkAll','modelSearch','modelInfo','loadCloudModels','selectedCloudModel','verifySelection','models'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(!html.includes('<details><summary>Параметры запросов</summary>'));
 assert.ok(html.includes('data-cloud="primaryModel"'));
});
test('model picker saves exact selected catalog model ID via settings API',()=>{
 assert.match(js,/primaryModel:m\.id/);
 assert.match(js,/request\('settings','PUT'/);
 assert.match(js,/renderModelCatalogue\(\)/);
});
test('404 reports missing model with recovery instructions',()=>{
 assert.match(inference,/HTTP 404: модель/);
});
