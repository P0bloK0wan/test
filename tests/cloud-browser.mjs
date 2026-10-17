import assert from 'node:assert/strict';
import readline from 'node:readline';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium,request} from 'playwright-core';
import {startServer} from '../server.mjs';
// Temporary credentials are supplied only on stdin by the operator, never stored.
console.log('READY: temporary live browser QA input on hidden stdin');
const reader=readline.createInterface({input:process.stdin,terminal:false});
const input=JSON.parse(await new Promise(resolve=>reader.once('line',resolve)));reader.close();
let browser,server,transportClient,qaAdmin,stage='launch';const checks=[],errors=[],transport=[];let testId;
try{
 server=await startServer(0);const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 transportClient=await request.newContext({proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}});
 const makeContext=async()=>{
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
   const origin=new URL(route.request().url()).origin;
   if(origin===base)return route.continue();
   if(![input.url,new URL(input.url).origin.replace('.supabase.co','.storage.supabase.co')].includes(origin))return route.abort();
   try{const response=await transportClient.fetch(route.request());transport.push({path:new URL(route.request().url()).pathname,status:response.status()});return await route.fulfill({response});}catch(e){transport.push({path:new URL(route.request().url()).pathname,error:e.name});return await route.abort();}
  });
  await context.routeWebSocket(/.*/,ws=>ws.close()); // Verify the 10-second HTTP fallback deterministically.
  return context;
 };
 const ac=await makeContext(),vc=await makeContext();
 const admin=await ac.newPage(),viewer=await vc.newPage();qaAdmin=admin;
 for(const page of [admin,viewer])page.on('pageerror',e=>errors.push(e.name));
 admin.on('dialog',dialog=>dialog.accept());
 stage='admin login';await admin.goto(base+'/admin.html');console.log('Live QA: login form loaded');
 await admin.locator('#email').fill(input.admin.email);await admin.locator('#password').fill(input.admin.password);await admin.locator('#auth-submit').click();
 await admin.locator('#workspace').waitFor({state:'visible',timeout:20000});checks.push('Real email/password admin login and server permission');console.log('Live QA: admin authenticated');
 stage='upload';const title='QA publicação '+Date.now();
 await admin.locator('[name=title]').fill(title);await admin.locator('[name=synopsis]').fill('Temporary authorized live QA trailer');await admin.locator('[name=minutes]').fill('1');await admin.locator('[name=credit]').fill('Blender Foundation trailer CC BY 3.0; temporary QA');
 await admin.locator('#video-file').setInputFiles(fileURLToPath(new URL('../dist/assets/media/sintel-trailer.mp4',import.meta.url)));
 await admin.locator('#save-button').click();
 await admin.getByText('Rascunho salvo.',{exact:false}).waitFor({timeout:60000});
 const row=admin.locator('.video-row').filter({hasText:title});testId=await row.locator('[data-publish]').getAttribute('data-publish');
 await viewer.goto(base+'/#/films');await viewer.waitForTimeout(1500);
 assert.equal(await viewer.getByRole('button',{name:'Detalhes de '+title,exact:true}).count(),0);checks.push('Real TUS upload stored as private draft without a cover');
 stage='publish';await row.locator('[data-publish]').click();await row.getByText('Publicado no catálogo',{exact:false}).waitFor();
 await viewer.getByRole('button',{name:'Detalhes de '+title,exact:true}).waitFor({timeout:20000});checks.push('Publishing reaches an already open anonymous viewer through polling');
 stage='playback';await viewer.getByRole('button',{name:'Detalhes de '+title,exact:true}).click();await viewer.locator('#dialog [data-action=play]').click();
 await viewer.waitForFunction(()=>document.querySelector('video')?.readyState>=1,null,{timeout:30000});
 await viewer.locator('video').evaluate(v=>v.play());await viewer.waitForFunction(()=>document.querySelector('video')?.currentTime>0.3);checks.push('Signed private-storage MP4 actually plays in the viewer');
 stage='unpublish during playback';await row.locator('[data-publish]').click();await row.getByText('Rascunho · visível apenas no painel',{exact:false}).waitFor();
 await viewer.waitForFunction(async id=>!(await import('./catalog.mjs')).findMovie(id),testId,{timeout:20000});
 await viewer.locator('#dialog .dialog-close').click();await viewer.waitForFunction(()=>!document.querySelector('#dialog').open&&!document.querySelector('#dialog video'));
 assert.deepEqual(errors,[]);checks.push('Unpublishing during playback does not break cleanup');
 stage='delete';await row.locator('[data-delete]').click();await admin.getByText('Nenhum vídeo ainda.',{exact:false}).waitFor();testId=null;checks.push('Administrator deletes temporary title and storage media');
 stage='viewer denied';await viewer.goto(base+'/admin.html');await viewer.locator('#email').fill(input.viewer.email);await viewer.locator('#password').fill(input.viewer.password);await viewer.locator('#auth-submit').click();await viewer.locator('#denied').waitFor({state:'visible',timeout:20000});assert.equal(await viewer.locator('#workspace').isVisible(),false);checks.push('Ordinary verified account cannot open administration');
 const result={passed:true,mode:'LIVE_SUPABASE',checkedAt:new Date().toISOString(),checks,limits:['QA browser fetched Supabase HTTPS through the session proxy with TLS verification; realtime WebSockets disabled to exercise polling fallback.','Temporary operator-created QA identities; user email delivery and recovery delivery not exercised.']};
 await writeFile(new URL('../docs/cloud-browser-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){console.error(JSON.stringify({passed:false,stage,error:error.name,temporaryTitleId:testId||null,transport,ui:qaAdmin?await qaAdmin.locator('#message').innerText().catch(()=>'unavailable'):null}));process.exitCode=1;}
finally{await transportClient?.dispose();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));}
