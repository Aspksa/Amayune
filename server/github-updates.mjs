import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const API='https://api.github.com/repos/Aspksa/Amayune';
const HEADERS={'user-agent':'Amayune-Updater',accept:'application/vnd.github+json'};
const shaPattern=/^[a-f0-9]{40}$/i;
const timeout=10000;
async function github(path,fetcher=fetch){
 const response=await fetcher(API+path,{headers:HEADERS,signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw Object.assign(Error('GitHub HTTP '+response.status),{status:502});
 return response.json();
}
const REQUIRED_CHECKS=new Set(['settings (ubuntu-latest)','settings (windows-2022)','chromium','launcher']);
export function ciState(runs){
 if(!Array.isArray(runs)||!runs.length)return 'none';
 if(runs.some(r=>r.status==='completed'&&r.conclusion!=='success'&&r.conclusion!=='skipped'&&r.conclusion!=='neutral'))return 'failure';
 if(runs.some(r=>r.status!=='completed'))return 'pending';
 const byName=new Map(runs.map(r=>[r.name,r]));
 if([...REQUIRED_CHECKS].some(name=>!byName.has(name)))return 'none';
 return [...REQUIRED_CHECKS].every(name=>byName.get(name).conclusion==='success')?'success':'failure';
}
export function installedVersion(root){
 const marker=join(root,'.runtime','updates','installed.json');
 try{const data=JSON.parse(readFileSync(marker,'utf8'));return shaPattern.test(data.sha)?data.sha:null;}catch{return null;}
}
export async function checkGitHubUpdate(root,fetcher=fetch){
 const branch=await github('/branches/main',fetcher);
 const sha=branch?.commit?.sha;
 if(!shaPattern.test(sha||''))throw Object.assign(Error('GitHub вернул неверную версию'),{status:502});
 const result=await github('/commits/'+sha+'/check-runs?per_page=100',fetcher);
 let runs=(result.check_runs||[]).filter(x=>x.app?.slug!=='dependabot');
 let ci=ciState(runs);
 // PR-only workflows are attached to the merged PR head, not always the main merge commit.
 // Only trust the second parent of the exact main commit GitHub returned.
 if(ci==='none'){
  const commit=await github('/commits/'+sha,fetcher);
  const parent=commit?.parents?.[1]?.sha;
  if(shaPattern.test(parent||'')){
   const previous=await github('/commits/'+parent+'/check-runs?per_page=100',fetcher);
   runs=(previous.check_runs||[]).filter(x=>x.app?.slug!=='dependabot');
   ci=ciState(runs);
  }
 }
 const installed=installedVersion(root);
 return {repository:'Aspksa/Amayune',sha,installed,updateAvailable:installed!==sha,ci,canInstall:ci==='success'&&Boolean(process.env.AMAYUNE_UPDATE_PUBLIC_KEY),signatureRequired:true,checkedAt:new Date().toISOString()};
}

export async function updateHistory(root,fetcher=fetch){
 const result=await github('/commits?sha=main&per_page=15',fetcher);
 if(!Array.isArray(result))throw Error('Invalid GitHub history');
 return result.filter(item=>shaPattern.test(item.sha||'')).map(item=>({
  sha:item.sha,
  title:String(item.commit?.message||'').split('\n')[0].slice(0,180),
  date:item.commit?.committer?.date||null,
  url:'https://github.com/Aspksa/Amayune/commit/'+item.sha
 }));
}
export async function updateChanges(sha,fetcher=fetch){
 if(!shaPattern.test(sha))throw Error('Invalid commit SHA');
 const item=await github('/commits/'+sha,fetcher);
 return {
  sha,
  message:String(item.commit?.message||'').slice(0,6000),
  files:(item.files||[]).slice(0,200).map(file=>({
   path:String(file.filename||'').slice(0,260),
   status:file.status,
   additions:file.additions||0,
   deletions:file.deletions||0
  }))
 };
}
