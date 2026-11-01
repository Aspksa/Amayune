import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
test('chat stream parses optional chatId before validation and history access',()=>{
 const source=readFileSync(resolve(root,'server/index.mjs'),'utf8');
 const start=source.indexOf("url.pathname==='/api/chat/stream'");
 assert.ok(start>=0);
 const route=source.slice(start,source.indexOf("url.pathname==='/api/usage'",start));
 assert.match(route,/const \{prompt,chatId\}=await body\(req,18000\)/);
 assert.match(route,/chatId!==undefined/);
});
