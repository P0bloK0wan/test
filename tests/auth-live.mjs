import assert from 'node:assert/strict';
import readline from 'node:readline';
import {chromium,request} from 'playwright-core';
import {startServer} from '../server.mjs';
console.log('READY: credentials on hidden stdin only');
const reader=readline.createInterface({input:process.stdin,terminal:false});
const input=JSON.parse(await new Promise(r=>reader.once('line',r)));reader.close();
const config=await import('../dist/cloud-config.mjs');
const project='https://uekfarmkhpeuiyfgxxio.supabase.co';
const publicKey=config.cloudConfig.publishableKey;
let browser,server,transport;const checks=[];
try{
 server=await startServer(0);const local=`http://127.0.0.1:${server.address().port}`;const base=input.base||local+'/';
 transport=await request.newContext({proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}});
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 async function context(){const c=await browser.newContext({reducedMotion:'reduce'});await c.route('**/*',async r=>{const origin=new URL(r.request().url()).origin;if(origin===local)return r.continue();if(![new URL(base).origin,project,project.replace('.supabase.co','.storage.supabase.co')].includes(origin))return r.abort();try{await r.fulfill({response:await transport.fetch(r.request())});}catch{await r.abort();}});await c.routeWebSocket(/.*/,w=>w.close());return c;}
 const ac=await context(),vc=await context();const a=await ac.newPage(),v=await vc.newPage();
 await v.goto(base+'index.html');await v.waitForURL(/login.html/);checks.push('Anonymous catalogue redirects to login');
 async function login(page,who){await page.goto(base+'login.html');await page.locator('#email').fill(who.email);await page.locator('#password').fill(who.password);await page.locator('#submit').click();await page.waitForURL(/index.html$/,{timeout:30000});await page.locator('#main .hero').waitFor();}
 await login(v,input.viewer);assert.equal(await v.locator('a[href="admin.html"]').count(),0);checks.push('Real ordinary login displays catalogue without admin links');
 await v.goto(base+'admin.html');await v.waitForURL(/index.html$/);checks.push('Ordinary account redirected away from administration');
 await login(a,input.admin);assert.ok(await a.locator('a[href="admin.html"]').count()>0);await a.goto(base+'admin.html');await a.locator('#workspace:visible').waitFor({timeout:30000});checks.push('Real administrator login opens protected administration');
 // Obtain short-lived sessions only in memory for real RLS integration tests.
 const session=async page=>page.evaluate(async()=>{const {cloud}=await import('./cloud-client.mjs');return (await cloud.client.auth.getSession()).data.session.access_token;});
 process.env.CINEMA_TEST_SUPABASE_URL=project;process.env.CINEMA_TEST_PUBLISHABLE_KEY=publicKey;process.env.CINEMA_TEST_ADMIN_JWT=await session(a);process.env.CINEMA_TEST_VIEWER_JWT=await session(v);
 await import('./schema.test.mjs');await import('./viewer-access.test.mjs');
 await v.evaluate(async()=>{const {cloud}=await import('./cloud-client.mjs');await cloud.client.auth.signOut();});await v.waitForURL(/login.html/);checks.push('Session sign-out returns catalogue to login');
 console.log(JSON.stringify({mode:'LIVE_SUPABASE',base,checks,emailDelivery:'not tested; SMTP pending'}));
}finally{await browser?.close();await transport?.dispose();if(server)await new Promise(r=>server.close(r));}
