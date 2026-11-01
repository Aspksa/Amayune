import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {health,waitHealth} from './health-check.mjs';
test('2xx ready, 503 not ready',async()=>{
  const server=http.createServer((req,res)=>{res.statusCode=req.url==='/health'?200:503;res.end('ok');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const port=server.address().port;
    assert.equal(await health('http://127.0.0.1:'+port+'/health'),true);
    assert.equal(await health('http://127.0.0.1:'+port+'/unhealthy'),false);
    assert.equal(await waitHealth('http://127.0.0.1:'+port+'/health',1000),true);
  }finally{await new Promise(r=>server.close(r));}
});
test('refuses non-loopback health checks',async()=>{
  assert.throws(()=>health('http://example.com/health'),/loopback/);
});
