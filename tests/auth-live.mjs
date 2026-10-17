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
 await v.goto(base+'index.html');await v.locator('#main .hero').waitFor();assert.ok(!v.url().includes('login'));checks.push('Anonymous catalogue opens without login');await v.locator('[data-action=trailer][data-id=sintel]').first().click();await v.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await v.locator('video').evaluate(video=>video.play());await v.waitForFunction(()=>document.querySelector('video')?.currentTime>.25);await v.locator('[data-sl=forward]').click();assert.ok(await v.locator('video').evaluate(video=>video.currentTime)>9);await v.locator('#dialog .dialog-close').click();checks.push('Public website own player actually plays and seeks its authorized MP4 trailer');
 async function login(page,who){await page.goto(base+'login.html');await page.locator('#email').fill(who.email);await page.locator('#password').fill(who.password);await page.locator('#submit').click();await page.waitForURL(/index.html(?:#.*)?$/,{timeout:30000});await page.locator('#main .hero,#catalog-grid,.personal-page').first().waitFor();}
 await v.locator('[data-action=details][data-id=sintel]').first().click();await v.locator('#dialog [data-action=save]').click();await v.getByRole('button',{name:'Já tenho conta',exact:true}).click();await v.waitForURL(/login.html/);
 await login(v,input.viewer);await v.waitForFunction(()=>document.querySelector('#toast')?.textContent==='Título salvo na sua lista.');checks.push('Guest save request is completed only after verified real login');assert.equal(await v.locator('a[href="admin.html"]').count(),0);checks.push('Real ordinary login displays catalogue without admin links');
 await v.goto(base+'admin.html');await v.waitForURL(/index.html(?:#.*)?$/);checks.push('Ordinary account redirected away from administration');
 await login(a,input.admin);assert.ok(await a.locator('a[href="admin.html"]').count()>0);await a.goto(base+'admin.html');await a.locator('#workspace:visible').waitFor({timeout:30000});checks.push('Real administrator login opens protected administration');
 // Obtain short-lived sessions only in memory for real RLS integration tests.
 const session=async page=>page.evaluate(async()=>{const {cloud}=await import('./cloud-client.mjs');return (await cloud.client.auth.getSession()).data.session.access_token;});
 process.env.CINEMA_TEST_SUPABASE_URL=project;process.env.CINEMA_TEST_PUBLISHABLE_KEY=publicKey;process.env.CINEMA_TEST_ADMIN_JWT=await session(a);process.env.CINEMA_TEST_VIEWER_JWT=await session(v);
 const {spawn}=await import('node:child_process');await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--use-env-proxy','--test','--test-isolation=none','tests/schema.test.mjs','tests/viewer-access.test.mjs'],{stdio:'inherit',env:process.env});child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error('Live RLS tests failed')));});
 await v.evaluate(async()=>{const {cloud}=await import('./cloud-client.mjs');await cloud.client.auth.signOut();});await v.locator('#profile-toggle').click();await v.getByText('VOCÊ ESTÁ COMO VISITANTE',{exact:true}).waitFor();checks.push('Session sign-out returns to guest catalogue without private account navigation');
 console.log(JSON.stringify({mode:'LIVE_SUPABASE',base,checks,emailDelivery:'not tested; SMTP pending'}));
}finally{await browser?.close();await transport?.dispose();if(server)await new Promise(r=>server.close(r));}
