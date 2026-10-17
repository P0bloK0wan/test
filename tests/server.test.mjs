import test from 'node:test';
import assert from 'node:assert/strict';
import {startServer} from '../server.mjs';
test('static site serves its root, modules, byte ranges and rejects outside paths',async()=>{
 const server=await startServer();const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const home=await fetch(base+'/');assert.equal(home.status,200);assert.match(await home.text(),/Cinema para descobrir/);
  const module=await fetch(base+'/app.mjs');assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/text\/javascript/);
  const range=await fetch(base+'/assets/media/sintel-trailer.mp4',{headers:{Range:'bytes=0-31'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,32);assert.match(range.headers.get('content-range'),/^bytes 0-31\//);
  const head=await fetch(base+'/assets/media/sintel-trailer.mp4',{method:'HEAD'});assert.equal(head.status,200);assert.ok(Number(head.headers.get('content-length'))>4000000);assert.equal((await head.arrayBuffer()).byteLength,0);
  const invalid=await fetch(base+'/assets/media/sintel-trailer.mp4',{headers:{Range:'bytes=999999999-'}});assert.equal(invalid.status,416);
  const traversal=await fetch(base+'/..%2fserver.mjs');assert.equal(traversal.status,403);
  const missing=await fetch(base+'/missing.txt');assert.equal(missing.status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
