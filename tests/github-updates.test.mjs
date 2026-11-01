import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ciState,checkGitHubUpdate} from '../server/github-updates.mjs';
const sha='a'.repeat(40);
const required=['settings (ubuntu-latest)','settings (windows-2022)','chromium','launcher'].map(name=>({name,status:'completed',conclusion:'success'}));
test('CI gate rejects pending, failed and absent checks',()=>{
 assert.equal(ciState([]),'none');
 assert.equal(ciState([{status:'in_progress'}]),'pending');
 assert.equal(ciState([{status:'completed',conclusion:'failure'}]),'failure');
 assert.equal(ciState([{status:'completed',conclusion:'success'}]),'none');
 assert.equal(ciState(required),'success');
 assert.equal(ciState(required.filter(x=>x.name!=='launcher')),'none');
});
test('GitHub check uses pinned commit SHA and returns CI state',async()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-updates-'));const calls=[];
 try{
 const fetcher=async url=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('/branches/main')?{commit:{sha}}:{check_runs:required}};};
 const result=await checkGitHubUpdate(root,fetcher);
 assert.equal(result.sha,sha);assert.equal(result.ci,'success');
 assert.equal(result.installed,null);assert.equal(result.signatureRequired,true);
 assert.ok(calls[1].includes('/commits/'+sha+'/check-runs'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('GitHub check refuses malformed SHA',async()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-updates-'));
 try{await assert.rejects(checkGitHubUpdate(root,async()=>({ok:true,json:async()=>({commit:{sha:'unsafe'}})})),/неверную версию/);}
 finally{rmSync(root,{recursive:true,force:true});}
});

test('merged main commit inherits CI only from its own second parent',async()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-merge-ci-'));
 const head='b'.repeat(40),calls=[];
 try{
  const fetcher=async url=>{
   calls.push(url);
   const data=url.endsWith('/branches/main')?{commit:{sha}}:
    url.includes('/commits/'+sha+'/check-runs')?{check_runs:[]}:
    url.endsWith('/commits/'+sha)?{parents:[{sha:'c'.repeat(40)},{sha:head}]}:
    url.includes('/commits/'+head+'/check-runs')?{check_runs:required}:{};
   return {ok:true,json:async()=>data};
  };
  const result=await checkGitHubUpdate(root,fetcher);
  assert.equal(result.sha,sha);assert.equal(result.ci,'success');
  assert.ok(calls.some(url=>url.includes('/commits/'+head+'/check-runs')));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('main without checks or merge parent remains unverified',async()=>{
 const root=mkdtempSync(join(tmpdir(),'amayune-no-ci-'));
 try{
  const fetcher=async url=>({ok:true,json:async()=>url.endsWith('/branches/main')?{commit:{sha}}:url.endsWith('/commits/'+sha)?{parents:[]}:{check_runs:[]}});
  assert.equal((await checkGitHubUpdate(root,fetcher)).ci,'none');
 }finally{rmSync(root,{recursive:true,force:true});}
});
