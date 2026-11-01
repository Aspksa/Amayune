import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchReleaseManifest} from '../server/github-updates.mjs';
test('release manifest is downloaded from SHA-pinned release, not from user input',async()=>{
 const sha='a'.repeat(40),calls=[];
 const fetcher=async url=>{calls.push(url);return url.includes('/releases/tags/')?{ok:true,json:async()=>({assets:[{name:'manifest.json',browser_download_url:'https://github.com/Aspksa/Amayune/releases/download/'+sha+'/manifest.json'}]})}:{ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({version:1})}};
 assert.deepEqual(await fetchReleaseManifest(sha,fetcher),{version:1});
 assert.equal(calls.length,2);
});
test('missing signed release fails closed with clear explanation',async()=>{
 await assert.rejects(fetchReleaseManifest('b'.repeat(40),async()=>({status:404,ok:false})),/нет подписанного пакета/);
});
test('update UI no longer asks user to select a manifest file',()=>{
 const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
 assert.ok(!html.includes('id="updateManifest"'));
 assert.ok(html.includes('id="stageUpdate"'));
 assert.ok(!js.includes("getElementById('updateManifest')"));
});
