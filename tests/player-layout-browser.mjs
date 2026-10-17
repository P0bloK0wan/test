import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startServer} from '../server.mjs';
const server=await startServer(0), base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const viewport of [{width:320,height:640},{width:390,height:844},{width:844,height:390}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  // Exercise the real access.mjs guest branch; only the unavailable cloud transport is mocked.
  await context.route('**/cloud-client.mjs',r=>r.fulfill({contentType:'text/javascript',body:'export const cloud={ready:false,client:null,publishedMovies:async()=>[],subscribe:()=>()=>{}};'}));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('button',{name:'Assistir trailer',exact:true}).click();
  await page.locator('.sl-controls').waitFor({state:'visible'});
  const bounds=await page.evaluate(()=>{
   const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
   return {top:rect('.player-topbar'),stage:rect('.player-stage'),controls:rect('.sl-controls'),footer:rect('.player-bottom'),dialog:rect('.player-dialog'),width:innerWidth,scroll:document.querySelector('.player-dialog').scrollWidth};
  });
  assert.ok(bounds.top.bottom<=bounds.stage.top+1,JSON.stringify(bounds));
  assert.ok(bounds.controls.bottom<=bounds.footer.top+1,JSON.stringify(bounds));
  assert.ok(bounds.stage.bottom<=bounds.footer.top+1,JSON.stringify(bounds));
  assert.ok(bounds.scroll<=bounds.width+1,JSON.stringify(bounds));
  await page.locator('.player-bottom').scrollIntoViewIfNeeded();
  await page.getByRole('link',{name:'Baixar trailer de Sintel'}).waitFor({state:'visible'});
  for(const button of await page.locator('.sl-buttons button:visible').all()){
   const box=await button.boundingBox();assert.ok(box.height>=44&&box.width>=44);assert.ok(box.x>=0&&box.x+box.width<=viewport.width+1);
  }
  assert.deepEqual(errors,[]);console.log(`PASS player layout ${viewport.width}×${viewport.height}: separate header/media/controls/footer, no horizontal overflow, visible controls`);
  await context.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
