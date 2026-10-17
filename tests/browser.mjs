import assert from 'node:assert/strict';
import {mkdir, writeFile, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=await import('playwright-core').catch(()=>import(new URL('../../../tools/rea/node_modules/playwright-core/index.mjs',import.meta.url)));
import {startServer} from '../server.mjs';
import {catalog} from '../dist/catalog.mjs';

const docs = fileURLToPath(new URL('../docs/', import.meta.url));
const checks = [];
const errors = [];
let server, browser, page;
const check = async (label, run) => {await run(); checks.push({label, passed:true}); console.log(`PASS ${label}`);};
try {
  await mkdir(docs, {recursive:true});
  await rm(`${docs}/browser-results.json`, {force:true});
  server = await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium', headless:true, args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const go = async hash => {await page.goto(`${base}/#/${hash}`); await page.waitForLoadState('networkidle');};
  const close = async () => {await page.locator('#dialog .dialog-close').click(); await page.waitForFunction(()=>!document.querySelector('#dialog').open);};
  const profileMenu = async () => {await page.locator('#profile-toggle').click(); await page.locator('#header-panel').waitFor({state:'visible'});};
  const switchProfile = async name => {await profileMenu(); await page.locator('#header-panel .panel-profile').filter({hasText:name}).click();};
  await check('Home renders original Sintel hero and eleven catalog titles', async()=>{
    await go('home'); assert.equal(await page.locator('.hero h1').innerText(), 'SINTEL'); assert.equal(catalog.length,11);
    await page.screenshot({path:`${docs}/desktop.png`,fullPage:true});
    await go('films'); assert.equal(await page.locator('#catalog-grid .movie-card').count(),11);
  });
  await check('All local film images decode without broken assets', async()=>{
    const results = await page.evaluate(async paths=>Promise.all(paths.map(src=>new Promise(resolve=>{const i=new Image(); i.onload=()=>resolve({src,ok:i.naturalWidth>0});i.onerror=()=>resolve({src,ok:false});i.src=src;}))),[...new Set(catalog.flatMap(m=>[m.image,m.hero]))]);
    assert.deepEqual(results.filter(r=>!r.ok),[]);
  });
  await check('Title search and accent-insensitive genre text search work', async()=>{
    await page.locator('#search-toggle').click(); await page.locator('#global-search').fill('Sintel');
    assert.equal(await page.locator('#catalog-grid .movie-card').count(),1); assert.equal(await page.locator('.card-caption strong').innerText(),'Sintel');
    await page.locator('#global-search').fill('ficcao');
    await page.waitForFunction(()=>document.querySelectorAll('#catalog-grid .movie-card').length===3);
    assert.deepEqual((await page.locator('.card-caption strong').allTextContents()).sort(),catalog.filter(m=>m.genres.includes('Ficção científica')).map(m=>m.title).sort());
  });
  await check('Genre selection filters the film catalog', async()=>{
    await go('films'); await page.locator('#genre-filter').selectOption('Terror');
    await page.waitForFunction(()=>document.querySelectorAll('#catalog-grid .movie-card').length===1);
    assert.equal(await page.locator('.card-caption strong').innerText(),'Sprite Fright');
  });
  await check('Details save, my list, reload persistence, and rating persistence', async()=>{
    await go('home'); await page.getByRole('button',{name:'Mais informações',exact:true}).click();
    assert.equal(await page.locator('#dialog-title').innerText(),'Sintel');
    await page.locator('#dialog [data-action="save"]').click();
    assert.equal(await page.locator('#dialog [data-action="save"]').getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'Adorei',exact:true}).click(); await close();
    await go('list'); assert.equal(await page.locator('#catalog-grid .movie-card').count(),1);
    await page.reload(); await page.getByRole('button',{name:'Detalhes de Sintel',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Adorei',exact:true}).getAttribute('aria-pressed'),'true'); await close();
  });
  await check('Keyboard Escape closes details and restores the invoking control focus', async()=>{
    const opener=page.getByRole('button',{name:'Detalhes de Sintel',exact:true}); await opener.click(); await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#dialog').open);
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.focus),'details-sintel');
  });
  await check('Profile creation and switching isolate each saved list', async()=>{
    await profileMenu(); await page.getByRole('button',{name:'Gerenciar perfis'}).click();
    await page.getByRole('button',{name:'Adicionar perfil',exact:true}).click(); await page.getByLabel('Nome do perfil').fill('Teste QA');
    await page.getByRole('button',{name:'Salvar perfil',exact:true}).click(); await close();
    await switchProfile('Teste QA'); await go('list'); assert.equal(await page.locator('#catalog-grid .movie-card').count(),0);
    await go('films'); await page.getByRole('button',{name:'Detalhes de Spring',exact:true}).click(); await page.locator('#dialog [data-action="save"]').click(); await close();
    await go('list'); assert.deepEqual(await page.locator('.card-caption strong').allTextContents(),['Spring']);
    await switchProfile('Você'); assert.deepEqual(await page.locator('.card-caption strong').allTextContents(),['Sintel']);
    await page.reload(); assert.deepEqual(await page.locator('.card-caption strong').allTextContents(),['Sintel']);
  });
  await check('Playback preferences persist through a reload', async()=>{
    await page.locator('.footer [data-action="preferences"]').click(); await page.locator('#pref-autoplay').uncheck(); await page.locator('#pref-muted').check();
    await page.getByRole('button',{name:'Salvar preferências',exact:true}).click(); await page.reload();
    await page.locator('.footer [data-action="preferences"]').click(); assert.equal(await page.locator('#pref-autoplay').isChecked(),false); assert.equal(await page.locator('#pref-muted').isChecked(),true); await close();
  });
  await check('Child profile filtering, read notices, editing and deletion work',async()=>{
    await profileMenu();await page.getByRole('button',{name:'Gerenciar perfis'}).click();
    await page.getByRole('button',{name:'Adicionar perfil',exact:true}).click();
    await page.getByLabel('Nome do perfil').fill('Infantil');await page.locator('input[name="kids"]').check();
    await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();await close();
    await switchProfile('Infantil');await go('films');
    assert.equal(await page.locator('#catalog-grid .movie-card').count(),catalog.filter(m=>m.age<=10).length);
    assert.equal(await page.getByRole('button',{name:'Detalhes de Sprite Fright',exact:true}).count(),0);
    await page.locator('#notices-toggle').click();
    assert.equal(await page.locator('#header-panel .notice').count(),1);
    assert.equal(await page.locator('#notices-toggle .notice-dot').count(),0);
    await page.keyboard.press('Escape');await profileMenu();
    await page.getByRole('button',{name:'Gerenciar perfis'}).click();
    await page.getByRole('button',{name:'Editar perfil Infantil',exact:true}).click();
    await page.getByLabel('Nome do perfil').fill('Pequenos');await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();
    await page.getByRole('button',{name:'Editar perfil Pequenos',exact:true}).click();
    await page.getByRole('button',{name:'Excluir',exact:true}).click();
    await page.getByRole('button',{name:'Excluir perfil',exact:true}).click();await close();
    await go('list');assert.deepEqual(await page.locator('.card-caption strong').allTextContents(),['Sintel']);
    assert.match(await page.locator('#profile-toggle').getAttribute('aria-label'),/Perfil atual: Você/);
  });
  await check('Native local trailer loads, plays, seeks, saves and resumes actual progress', async()=>{
    await go('home'); await page.getByRole('button',{name:'Assistir trailer',exact:true}).click();
    await page.waitForFunction(()=>{const v=document.querySelector('video');return v?.readyState>=1 && v.duration>10;},{timeout:20000});
    const duration=await page.locator('video').evaluate(v=>v.duration); assert.ok(duration>10);
    await page.locator('video').evaluate(v=>v.play()); await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.3);
    await page.locator('video').evaluate(v=>{v.pause();v.currentTime=5;}); await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.seeking&&v.currentTime>=5;}); await close();
    await page.getByRole('button',{name:'Continuar Sintel',exact:true}).waitFor({state:'attached',timeout:4000});
    assert.equal(await page.getByRole('button',{name:'Continuar Sintel',exact:true}).count(),1);
    await page.reload(); await page.getByRole('button',{name:'Continuar Sintel',exact:true}).click();
    await page.waitForFunction(()=>{const v=document.querySelector('video');return v?.readyState>=1&&v.currentTime>=4.8&&v.currentTime<=5.5;}); await close();
  });
  await check('Unavailable local trailer shows an actionable recovery panel', async()=>{
    await go('home');
    await context.route('**/assets/media/sintel-trailer.mp4', r=>r.abort());
    await page.getByRole('button',{name:'Assistir trailer',exact:true}).click();
    await page.locator('#video-error').waitFor({state:'visible',timeout:4000});
    assert.match(await page.locator('#video-error a').getAttribute('href'),/youtube.com/);
    await close();await context.unroute('**/assets/media/sintel-trailer.mp4');
  });
  await check('Skip link keeps the current view and focuses main content', async()=>{
    await go('list');const previous=await page.evaluate(()=>location.hash);
    await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>location.hash),previous);
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'main');
  });
  await check('375px mobile home has no horizontal document overflow', async()=>{
    await page.setViewportSize({width:375,height:812}); await go('home');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
    await page.screenshot({path:`${docs}/mobile.png`,fullPage:true});
    await go('films'); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  });
  await check('Motion runs when allowed and respects reduced-motion changes', async()=>{
    await page.setViewportSize({width:1440,height:1000});
    await page.emulateMedia({reducedMotion:'no-preference'}); await go('home');
    assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('motion-enabled')),true);
    await page.getByRole('button',{name:'Mais informações',exact:true}).click();
    assert.notEqual(await page.locator('#dialog').evaluate(el=>getComputedStyle(el).animationName),'none');
    await close(); await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!document.documentElement.classList.contains('motion-enabled'));
    assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('motion-enabled')),false);
    assert.equal(await page.locator('.hero h1').isVisible(),true);
  });
  await check('A device file plays locally and its object URL is revoked on close', async()=>{
    await go('home');
    await page.evaluate(()=>{window.__revoked=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{window.__revoked.push(url);revoke(url);};});
    const chooser=page.waitForEvent('filechooser');
    await page.locator('.footer [data-action="local-video"]').click();
    await (await chooser).setFiles(fileURLToPath(new URL('../dist/assets/media/sintel-trailer.mp4',import.meta.url)));
    await page.waitForFunction(()=>{const v=document.querySelector('video');return v?.src.startsWith('blob:')&&v.readyState>=1;});
    const blob=await page.locator('video').evaluate(v=>v.src);
    await page.locator('video').evaluate(v=>v.play());
    await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.3);
    await close();await page.waitForFunction(url=>window.__revoked.includes(url),blob);
  });
  await check('An owner-configured catalog video plays natively and saves progress', async()=>{
    await context.route('**/my-videos.mjs',r=>r.fulfill({contentType:'text/javascript',body:`export const myVideos=[{id:'meu-video-qa',title:'Meu vídeo QA',video:'assets/media/sintel-trailer.mp4',age:0,minutes:1,credit:'Autor QA'}];`}));
    await go('films'); await page.reload(); await page.getByRole('button',{name:'Detalhes de Meu vídeo QA',exact:true}).click();
    assert.match(await page.locator('#dialog').innerText(),/Autor QA/);
    await page.locator('#dialog [data-action="play"]').click();
    assert.equal(await page.locator('#dialog iframe').count(),0);
    await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
    await page.locator('video').evaluate(v=>{v.currentTime=5;});
    await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.seeking&&v.currentTime>=5;});
    await close(); await go('home');
    await page.getByRole('button',{name:'Continuar Meu vídeo QA',exact:true}).waitFor();
    await page.getByRole('button',{name:'Continuar Meu vídeo QA',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('video')?.currentTime>=4.8); await close();
    await context.unroute('**/my-videos.mjs');
  });
  await check('No uncaught application errors', async()=>assert.deepEqual(errors,[]));
  const result={passed:true,checkedAt:new Date().toISOString(),checks,limits:['Official YouTube full-film playback not exercised; external network requests blocked.', 'APK runtime, Android device, iOS, and real user account services not exercised.'],screenshots:['docs/desktop.png','docs/mobile.png']};
  await writeFile(`${docs}/browser-results.json`,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks:checks.length}));
} catch(error) {
  console.error(error);console.error('Page errors:',errors);if(page)console.error('Progress diagnostic:',await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('netflix-web.library.v1')||'null');return s?.profiles.map(p=>({id:p.id,progress:p.progress}));}).catch(()=>null)); process.exitCode=1;
} finally {
  if(page) await page.evaluate(()=>document.querySelector('video')?.pause()).catch(()=>{});
  if(browser) await browser.close();
  if(server) await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
