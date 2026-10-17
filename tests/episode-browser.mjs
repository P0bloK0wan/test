import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startServer} from '../server.mjs';
const server=await startServer(0);let browser;const checks=[],errors=[];
const row=(id,season,episode)=>({id,title:`A Jornada ${season}.${episode}`,series_title:'A Jornada',season,episode,episode_title:`Capítulo ${episode}`,synopsis:'Descrição fornecida para esta demonstração de teste.',age:10,minutes:2,year:2026,genres:['Animação'],kind:'animation',credit:'Fixture de teste',video:'assets/media/sintel-trailer.mp4',image:'assets/sintel.webp',status:'published'});
const fixtures=[row('episode-10',1,10),row('episode-2',1,2),row('episode-season2',2,1)];
try{
 const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await context.route('**/cloud-client.mjs',r=>r.fulfill({contentType:'text/javascript',body:`export const cloud={ready:true,client:null,publishedMovies:async()=>(${JSON.stringify(fixtures)}),subscribe:()=>()=>{}};`}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#/films');await page.getByRole('button',{name:'Detalhes de A Jornada 1.2',exact:true}).waitFor();
 await page.getByRole('button',{name:'Detalhes de A Jornada 1.2',exact:true}).click();assert.equal(await page.locator('#dialog-title').innerText(),'A Jornada');
 assert.deepEqual(await page.locator('.episode-item').evaluateAll(items=>items.map(e=>e.dataset.id)),['episode-2','episode-10']);assert.equal(await page.locator('[data-episode-season] option').count(),2);checks.push('Series details show only actual episodes, numeric order and available seasons');
 await page.locator('[data-episode-season]').selectOption('2');assert.equal(await page.locator('.episode-item').count(),1);await page.locator('.episode-item').click();
 await page.locator('.episode-player-layout').waitFor();assert.equal(await page.locator('.episode-browser--player .episode-item[aria-current=true]').getAttribute('data-id'),'episode-season2');assert.match(await page.locator('#dialog-title').innerText(),/Temporada 2 · Episódio 1/);checks.push('Selecting an episode starts that episode and marks the player list');
 await page.locator('[data-episode-season]').selectOption('1');await page.locator('.episode-item[data-id=episode-2]').click();await page.waitForFunction(()=>document.querySelector('.episode-item[aria-current=true]')?.dataset.id==='episode-2');assert.equal(await page.locator('#movie-video').count(),1);assert.equal(await page.locator('.streamlab-player').count(),1);checks.push('Switching episodes replaces video and controls without duplicate players');
 let rect=await page.locator('.episode-browser--player').boundingBox(),videoRect=await page.locator('.episode-player-content').boundingBox();assert.ok(rect.x>=videoRect.x+videoRect.width-1);checks.push('Episode list sits beside playback on desktop');
 await page.setViewportSize({width:390,height:844});rect=await page.locator('.episode-browser--player').boundingBox();videoRect=await page.locator('.episode-player-content').boundingBox();assert.ok(rect.y>=videoRect.y+videoRect.height-1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('Episode list sits below playback without page overflow on mobile');
 await page.locator('#dialog .dialog-close').click();await page.waitForFunction(()=>!document.querySelector('#dialog').open);await page.getByRole('button',{name:'Detalhes de Sintel',exact:true}).click();assert.equal(await page.locator('.episode-browser').count(),0);assert.equal(await page.locator('#dialog-title').innerText(),'Sintel');assert.deepEqual(errors,[]);checks.push('Film details remain unchanged and no page errors');
 console.log(JSON.stringify({passed:true,mode:'LOCAL_EPISODE_FIXTURES',checks}));await context.close();
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
