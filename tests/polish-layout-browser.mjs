import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startServer} from '../server.mjs';
const server=await startServer(0);let browser;const checks=[],errors=[];
try{
 const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await context.route('**/cloud-client.mjs',r=>r.fulfill({contentType:'text/javascript',body:'export const cloud={ready:false,client:null};'}));
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 const widths=[320,375,390,768,1024,1440];
 for(const width of widths){
  await page.setViewportSize({width,height:900});await page.goto(`${base}/#/films`);await page.locator('#catalog-grid .movie-card').first().waitFor();
  assert.ok(await page.locator('#account-entry').isVisible(),`Entrar visible at ${width}`);
  const inspect=()=>{
   const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width&&r.height&&s.display!=='none'&&s.visibility!=='hidden';};
   const rect=el=>{const r=el.getBoundingClientRect();return {label:el.id||el.className||el.textContent.trim(),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const items=[...document.querySelectorAll('.header>.wordmark,.header>.desktop-nav,.header .search-control,.header .notice-button,.header .profile-button,#account-entry')].filter(visible).map(rect);
   const overlaps=[];for(let a=0;a<items.length;a++)for(let b=a+1;b<items.length;b++){const x=items[a],y=items[b];if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1)overlaps.push([x.label,y.label]);}
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,outside:items.filter(r=>r.left< -1||r.right>innerWidth+1),overlaps};
  };
  let result=await page.evaluate(inspect);assert.deepEqual(result,{overflow:false,outside:[],overlaps:[]},`header at ${width}`);
  const targets=await page.locator('.catalog-grid .card-actions button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height];}));assert.ok(targets.every(([w,h])=>w>=44&&h>=44),`card targets 44px at ${width}`);
  const ratios=await page.locator('.catalog-grid .card-visual').evaluateAll(cards=>cards.map(c=>{const r=c.getBoundingClientRect();return r.width/r.height;}));assert.ok(ratios.every(r=>Math.abs(r-16/9)<.03),`16:9 cards at ${width}`);
  await page.locator('#search-toggle').click();await page.locator('#global-search').waitFor({state:'visible'});
  result=await page.evaluate(inspect);assert.deepEqual(result,{overflow:false,outside:[],overlaps:[]},`expanded search at ${width}`);
  if(width<=720){const nav=await page.locator('.mobile-nav').boundingBox();assert.ok(nav&&nav.x>=0&&nav.x+nav.width<=width+1);}
  if(width===390){await page.goto(`${base}/#/films`);await page.locator('#catalog-grid').waitFor();await page.screenshot({path:new URL('../docs/polish-mobile.png',import.meta.url).pathname,fullPage:true});}
  checks.push(`Guest header, expanded search, 44px cards and 16:9 layout at ${width}px`);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,externalNetwork:'blocked',pageErrors:errors}));
 await context.close();
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
