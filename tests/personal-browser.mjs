import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {startServer} from '../server.mjs';
const server=await startServer(0);let browser;
try{
 const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await context.route('**/access.mjs',r=>r.fulfill({contentType:'text/javascript',body:"export const viewer={id:'personal-test',email:'personal@example.invalid'};export const viewerIsAdmin=false;export async function requireViewer(){return viewer;}"}));
 await context.route('**/cloud-client.mjs',r=>r.fulfill({contentType:'text/javascript',body:'export const cloud={ready:false};'}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/#/me`);await page.getByRole('heading',{name:'Você',exact:true}).waitFor();
 assert.equal(await page.locator('.personal-collection').count(),3);assert.equal(await page.locator('.personal-empty').count(),3);console.log('PASS personal route and useful empty states');
 await page.evaluate(()=>localStorage.setItem('netflix-web.library.v1.personal-test',JSON.stringify({version:1,activeProfileId:'default',profiles:[{id:'default',name:'Viajante',color:'teal',avatar:'orbit',kids:false,savedIds:['sintel','spring'],ratings:{spring:2,charge:-1},progress:{sintel:{seconds:25,duration:100,updatedAt:1}}}]})));
 await page.reload();await page.getByRole('heading',{name:'Viajante',exact:true}).waitFor();
 const collections=page.locator('.personal-collection');assert.equal(await collections.nth(0).locator('.movie-card').count(),1);assert.equal(await collections.nth(1).locator('.movie-card').count(),1);assert.equal(await collections.nth(2).locator('.movie-card').count(),2);assert.match(await page.locator('.progress-track').getAttribute('aria-label'),/25%/);console.log('PASS continued, liked and saved collections derive from active profile');
 await page.getByRole('button',{name:'Editar perfil e avatar',exact:true}).click();await page.getByRole('button',{name:'Raposa Aurora',exact:true}).click();await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();await page.locator('#dialog .dialog-close').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('netflix-web.library.v1.personal-test')).profiles[0].avatar),'fox');await page.reload();await page.getByRole('heading',{name:'Viajante',exact:true}).waitFor();
 assert.equal(await page.locator('.personal-profile>.avatar svg').count(),1);await page.getByRole('button',{name:'Editar perfil e avatar',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Raposa Aurora',exact:true}).getAttribute('aria-pressed'),'true');await page.keyboard.press('Escape');console.log('PASS categorized avatar picker persists and dialog closes by keyboard');
 await page.getByRole('button',{name:'Gerenciar perfis',exact:true}).click();await page.getByRole('button',{name:'Adicionar perfil',exact:true}).click();await page.getByLabel('Nome do perfil').fill('Novo perfil');await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();await page.locator('#dialog .dialog-close').click();await page.locator('#profile-toggle').click();await page.locator('.panel-profile').filter({hasText:'Novo perfil'}).click();assert.equal(await page.locator('.personal-empty').count(),3);console.log('PASS personal collections isolated after profile switch');
 await page.setViewportSize({width:375,height:812});assert.equal(await page.locator('[data-mobile="me"]').getAttribute('aria-current'),'page');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.ok(await page.locator('[data-mobile="me"]').isVisible());console.log('PASS mobile navigation and no page overflow');
 assert.deepEqual(errors,[]);console.log('PASS no page errors');
 await context.close();
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
