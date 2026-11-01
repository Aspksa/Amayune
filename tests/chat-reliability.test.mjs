import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const chat=readFileSync(new URL('../web/chat.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
test('chat matches server stream error marker using actual newline',()=>{
 const marker=/\n?\[Ошибка потока: ([^\]]+)\]\s*$/;
 assert.equal('partial\n[Ошибка потока: Cloud.ru HTTP 502]'.match(marker)?.[1],'Cloud.ru HTTP 502');
 assert.ok(chat.includes('const streamError=msg.text.match('+marker.toString()+')'));
});
test('server validates selected model before opening streaming response',()=>{
 const begin=server.indexOf("url.pathname==='/api/chat/stream'");
 const header=server.indexOf('res.writeHead(200',begin);
 const validation=server.indexOf('cloudSettings.primaryModel',begin);
 assert.ok(validation>begin&&validation<header);
});
test('current prompt is retained after context truncation',()=>{
 assert.ok(server.includes("+'\\n\\nЗапрос пользователя: '+prompt"));
});
