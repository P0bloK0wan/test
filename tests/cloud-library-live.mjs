import assert from 'node:assert/strict';
import readline from 'node:readline';
import {chromium,request} from 'playwright-core';
import {startServer} from '../server.mjs';
import {cloudConfig} from '../dist/cloud-config.mjs';
console.log('READY: temporary QA credentials on hidden stdin only');
const reader=readline.createInterface({input:process.stdin,terminal:false});
const input=JSON.parse(await new Promise(r=>reader.once('line',r)));reader.close();
let server,browser,transport;const checks=[];
const state=(name='QA One')=>({version:1,activeProfileId:'default',profiles:[{id:'default',name,color:'red',kids:false,savedIds:['sintel'],ratings:{sintel:1},progress:{sintel:{seconds:5,duration:52,updatedAt:Date.now()}},preferences:{autoplay:false,muted:true},readNotices:[]}]});
try{
 server=await startServer(0);const base=`http://127.0.0.1:${server.address().port}/`;
 transport=await request.newContext({proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}});
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 async function make(who){const c=await browser.newContext();await c.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===new URL(base).origin){if(u.pathname==='/qa-sync.html')return r.fulfill({contentType:'text/html',body:'<!doctype html><title>Private sync QA</title>'});return r.continue();}if(u.origin!==cloudConfig.url)return r.abort();try{await r.fulfill({response:await transport.fetch(r.request())});}catch{await r.abort();}});const p=await c.newPage();await p.goto(base+'qa-sync.html');await p.evaluate(async creds=>{const {cloud}=await import('./cloud-client.mjs');const {data,error}=await cloud.client.auth.signInWithPassword(creds);if(error)throw Error('QA authentication failed');window.qaClient=cloud.client;window.qaUserId=data.user.id;},who);return p;}
 const a=await make(input.first),b=await make(input.first),other=await make(input.second);
 async function init(p){return p.evaluate(async()=>{const {createLibrarySync}=await import('./library-sync.mjs');const map=new Map();window.qaStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};window.qaStates=[];window.qaSync=await createLibrarySync({client:qaClient,userId:qaUserId,storage:qaStorage,onStatus:s=>qaStates.push(s)});return qaSync.storage.getItem('netflix-web.library.v1');});}
 const write=(p,s)=>p.evaluate(async data=>{qaSync.storage.setItem('netflix-web.library.v1',JSON.stringify(data));await qaSync.flush();return qaSync.status();},s);
 await init(a);const saved=await write(a,state());if(saved.state!=='synced'){console.log(JSON.stringify({stage:'first-write',status:saved,db:await a.evaluate(async data=>{const q=await qaClient.from('cinema_libraries').insert({user_id:qaUserId,state:data,revision:1}).select('revision');return {error:q.error,rows:q.data};},state())}));throw Error('Initial sync failed');}await init(b);
 const shared=await b.evaluate(()=>JSON.parse(qaSync.storage.getItem('netflix-web.library.v1')));assert.equal(shared.profiles[0].savedIds[0],'sintel');assert.equal(shared.profiles[0].progress.sintel.seconds,5);checks.push('Two real browser contexts share saved titles and playback progress');
 await write(a,state('Device A'));await write(b,state('Device B'));
 assert.equal((await b.evaluate(()=>qaSync.status())).state,'conflict');assert.equal(await b.evaluate(()=>JSON.parse(qaSync.storage.getItem('netflix-web.library.v1')).profiles[0].name),'Device B');checks.push('Concurrent edit keeps unsynced local data and reports conflict');
 await b.evaluate(async()=>qaSync.resolveConflict('remote'));assert.equal(await b.evaluate(()=>JSON.parse(qaSync.storage.getItem('netflix-web.library.v1')).profiles[0].name),'Device A');checks.push('Explicit remote conflict choice restores current server state');
 const cross=await other.evaluate(async owner=>{const read=await qaClient.from('cinema_libraries').select('*').eq('user_id',owner);const update=await qaClient.from('cinema_libraries').update({state:{}}).eq('user_id',owner).select();return {read:read.data,readError:!!read.error,update:update.data,updateError:!!update.error};},await a.evaluate(()=>qaUserId));assert.ok(cross.readError||cross.read.length===0);assert.ok(cross.updateError||cross.update.length===0);checks.push('Second account cannot read or mutate first account private library');
 const anon=await transport.get(cloudConfig.url+'/rest/v1/cinema_libraries?select=user_id',{headers:{apikey:cloudConfig.publishableKey}});assert.ok(anon.status()>=400||(await anon.json()).length===0);checks.push('Anonymous API client cannot read private libraries');
 await a.evaluate(()=>window.qaSync.dispose());await b.evaluate(()=>window.qaSync.dispose());
 await a.goto(base+'index.html#/me');await a.getByRole('heading',{name:'Device A',exact:true}).waitFor();
 await a.getByRole('button',{name:'Editar perfil e avatar',exact:true}).click();await a.getByRole('button',{name:'Raposa Aurora',exact:true}).click();await a.getByRole('button',{name:'Salvar perfil',exact:true}).click();await a.locator('#dialog .dialog-close').click();
 await a.waitForFunction(()=>document.querySelector('#library-sync-status')?.dataset.state==='synced');
 await b.goto(base+'index.html#/me');await b.getByRole('heading',{name:'Device A',exact:true}).waitFor();await b.getByRole('button',{name:'Editar perfil e avatar',exact:true}).click();assert.equal(await b.getByRole('button',{name:'Raposa Aurora',exact:true}).getAttribute('aria-pressed'),'true');checks.push('Actual authenticated personal UI saves avatar and another browser restores it');
 for(const p of[a,b,other])await p.evaluate(async()=>{await window.qaSync?.dispose?.();const {cloud}=await import('./cloud-client.mjs');await cloud.client.auth.signOut();});
 console.log(JSON.stringify({passed:true,mode:'LIVE_SUPABASE',checks,emailDelivery:'Not exercised; operator-created temporary QA identities'}));
}finally{await browser?.close();await transport?.dispose();if(server)await new Promise(r=>server.close(r));}
