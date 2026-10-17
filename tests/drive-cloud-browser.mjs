import assert from 'node:assert/strict';
import readline from 'node:readline';
import {writeFile} from 'node:fs/promises';
import {chromium,request} from 'playwright-core';
import {startServer} from '../server.mjs';
import {cloudConfig} from '../dist/cloud-config.mjs';
console.log('READY: live Drive catalogue QA credentials on hidden stdin');
const reader=readline.createInterface({input:process.stdin,terminal:false});
const login=JSON.parse(await new Promise(resolve=>reader.once('line',resolve)));reader.close();
let browser,server,transport,stage='launch',testId;const checks=[],errors=[];
try{
 server=await startServer(0);const base=`http://127.0.0.1:${server.address().port}`;
 transport=await request.newContext({proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const newPage=async()=>{
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.routeWebSocket(/.*/,socket=>socket.close());
  await context.route('**/*',async route=>{
   const origin=new URL(route.request().url()).origin;
   if(origin===base)return route.continue();
   if(origin!==cloudConfig.url)return route.abort(); // No fictional Drive media is fetched.
   try{return await route.fulfill({response:await transport.fetch(route.request())});}catch{return await route.abort();}
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.name));return page;
 };
 const admin=await newPage(),viewer=await newPage();admin.on('dialog',d=>d.accept());
 stage='login';await admin.goto(base+'/admin.html');await admin.locator('#email').fill(login.email);await admin.locator('#password').fill(login.password);await admin.locator('#auth-submit').click();await admin.locator('#workspace').waitFor({state:'visible',timeout:20000});
 checks.push('Real existing test administrator login');
 stage='constraints';const constraints=await admin.evaluate(async()=>{
  const {cloud}=await import('./cloud-client.mjs');
  const results=[];
  for(const drive_url of [null,'https://evil.example/video','https://drive.google.com/drive/folders/123456789012345']){
   const {error}=await cloud.client.from('cinema_videos').insert({title:'Rejected Drive fixture',video_source:'drive',video_path:null,drive_url});results.push(error?.code);
  }
  return results;
 });assert.deepEqual(constraints,['23514','23514','23514']);checks.push('Live database rejects missing, foreign and folder Drive links');
 stage='draft';const title='Drive QA '+Date.now(),file='1DriveFixtureOnly1234567890',share=`https://drive.google.com/file/d/${file}/view?resourcekey=0-test`,embed=share.replace('/view?','/preview?');
 await admin.locator('[name=title]').fill(title);await admin.locator('[name=synopsis]').fill('Temporary catalogue integration fixture; not an actual Drive video');await admin.locator('[name=minutes]').fill('1');await admin.locator('[name=credit]').fill('Temporary QA; no media');await admin.locator('#drive-link').fill(share+'&usp=sharing');
 await admin.locator('#save-button').click();await admin.getByText('Rascunho salvo.',{exact:false}).waitFor({timeout:20000});
 const row=admin.locator('.video-row').filter({hasText:title});testId=await row.locator('[data-publish]').getAttribute('data-publish');
 const anonGet=async()=>{const res=await transport.get(`${cloudConfig.url}/rest/v1/cinema_videos?id=eq.${testId}&select=id,video_source,drive_url,video_path`,{headers:{apikey:cloudConfig.publishableKey}});assert.equal(res.status(),200);return res.json();};
 assert.deepEqual(await anonGet(),[]);checks.push('Drive link creates a real private draft with no video upload');
 await viewer.goto(base+'/#/films');
 stage='publish';await row.locator('[data-publish]').click();await row.getByText('Publicado no catálogo',{exact:false}).waitFor();
 assert.deepEqual(await anonGet(),[{id:testId,video_source:'drive',drive_url:share,video_path:null}]);
 await viewer.getByRole('button',{name:'Detalhes de '+title,exact:true}).waitFor({timeout:20000});checks.push('Published Drive entry reaches an already open anonymous catalogue');
 stage='preview';await viewer.getByRole('button',{name:'Detalhes de '+title,exact:true}).click();await viewer.locator('#dialog [data-action=play]').click();
 assert.equal(await viewer.locator('#dialog iframe').getAttribute('src'),embed);assert.equal(await viewer.locator('.player-bottom a').getAttribute('href'),share);assert.equal(await viewer.locator('#dialog video').count(),0);checks.push('Viewer selects canonical Drive preview and resource-key-aware fallback');
 await viewer.locator('#dialog .dialog-close').click();
 stage='delete';await row.locator('[data-delete]').click();await row.waitFor({state:'detached'});assert.deepEqual(await anonGet(),[]);testId=null;checks.push('Removing the catalogue entry succeeds without a storage object or Drive API call');
 assert.deepEqual(errors,[]);
 const result={passed:true,mode:'LIVE_SUPABASE_WITH_FICTIONAL_DRIVE_ID',checkedAt:new Date().toISOString(),checks,limits:['No actual user video provided: Drive preview playback, public permission and processing are NOT verified.','Drive requests were deliberately blocked; only metadata, authorisation, catalogue propagation and iframe/fallback URLs tested.','Realtime disabled to exercise the 10-second polling fallback.']};
 await writeFile(new URL('../docs/drive-cloud-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(e){console.error(JSON.stringify({passed:false,stage,error:e.name,temporaryTitleId:testId||null}));process.exitCode=1;}
finally{await browser?.close();await transport?.dispose();if(server)await new Promise(resolve=>server.close(resolve));}
