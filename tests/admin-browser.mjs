import {mkdir,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {startServer} from '../server.mjs';
const {chromium}=await import('playwright-core').catch(()=>import(new URL('../../../tools/rea/node_modules/playwright-core/index.mjs',import.meta.url)));
const docs=fileURLToPath(new URL('../docs/',import.meta.url));
await mkdir(docs,{recursive:true});
await rm(`${docs}/admin-browser-results.json`,{force:true});
const mock=`let signed=false, listener, rows=[]; export const cloud={ready:true,maxVideoBytes:52428800,client:{auth:{getUser:async()=>({data:{user:signed?{id:'u'}:null}}),signInWithPassword:async()=>{signed=true;return {data:{}}},signUp:async()=>({data:{session:null}}),signOut:async()=>{signed=false;return{}},resetPasswordForEmail:async()=>({}),updateUser:async()=>({}),onAuthStateChange:fn=>{listener=fn;}}},isAdmin:async()=>signed,listAdminVideos:async()=>rows,uploadCover:async()=>({path:'cover.jpg'}),uploadVideo:async(file,{onProgress,signal})=>{if(signal.aborted)throw new DOMException('cancel','AbortError');onProgress({percent:100});return {path:'video.mp4'}},saveVideo:async payload=>{rows.push({...payload,id:'v1',created_at:new Date().toISOString()});return rows[0]},setPublished:async(id,published)=>{rows[0].status=published?'published':'draft'},deleteVideo:async()=>{rows=[]}};`;
const server=await startServer(0);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const checks=[];function assert(ok,name){if(!ok)throw new Error(name);checks.push(name)}
try{
 await page.route('**/cloud-client.mjs',route=>route.fulfill({contentType:'text/javascript',body:mock}));
 await page.goto(`http://127.0.0.1:${server.address().port}/admin.html`);
 await page.locator('#auth:visible').waitFor();
 assert(await page.locator('#auth-title').textContent()==='Entrar como administrador','Login inicial');
 await page.locator('[data-mode=signup]').click();await page.locator('#email').fill('admin@example.com');await page.locator('#password').fill('ExamplePassword12');await page.locator('#auth-submit').click();await page.getByText('Se o cadastro estiver disponível',{exact:false}).waitFor();assert(true,'Cadastro informa confirmação e-mail');
 await page.locator('[data-mode=reset]').click();await page.locator('#auth-submit').click();await page.getByText('Se houver uma conta',{exact:false}).waitFor();assert(true,'Recuperação não enumera conta');
 await page.locator('[data-mode=login]').click();await page.locator('#password').fill('ExamplePassword12');await page.locator('#auth-submit').click();await page.locator('#workspace:visible').waitFor();assert(true,'Login libera painel com autorização servidor mock');
 await page.locator('[name=title]').fill('Meu filme');await page.locator('[name=synopsis]').fill('História original de teste.');await page.locator('[name=minutes]').fill('12');await page.locator('[name=credit]').fill('Produção própria');await page.locator('#video-file').setInputFiles({name:'teste.mp4',mimeType:'video/mp4',buffer:Buffer.from('mock transport; not a media fixture')});await page.locator('#save-button').click();await page.getByText('Rascunho salvo.',{exact:false}).waitFor();await page.getByText('Rascunho · visível apenas no painel',{exact:false}).waitFor();assert(true,'Upload simulado cria rascunho sem publicar');
 await page.locator('[data-publish]').click();await page.getByText('Publicado no catálogo',{exact:false}).waitFor();assert(true,'Publicação explícita');
 await page.locator('[data-publish]').click();await page.getByText('Rascunho · visível apenas no painel',{exact:false}).waitFor();assert(true,'Retirada mantém rascunho');
 await page.locator('[data-delete]').click();await page.getByText('Nenhum vídeo ainda.',{exact:false}).waitFor();assert(true,'Exclusão confirmada');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sem rolagem horizontal em 390px');assert(errors.length===0,'Sem erros JavaScript');
 await page.locator('#change-password').click();await page.getByText('Definir nova senha',{exact:true}).waitFor();await page.locator('#password').fill('ChangedOnlyInMock12');await page.locator('#auth-submit').click();await page.locator('#workspace:visible').waitFor();assert(true,'Administrador altera a própria senha sem recuperar por e-mail');
 await page.locator('#workspace [data-signout]').click();await page.locator('#auth:visible').waitFor();assert(true,'Logout volta ao login');
 const unconfigured=await browser.newPage(); await unconfigured.route('**/cloud-client.mjs',route=>route.fulfill({contentType:'text/javascript',body:'export const cloud={ready:false,client:null}'})); await unconfigured.goto(`http://127.0.0.1:${server.address().port}/admin.html`); await unconfigured.locator('#setup:visible').waitFor(); assert(await unconfigured.locator('#auth').isHidden(),'Configuração pendente não mostra formulário de senha'); await unconfigured.close();
 const recovery=await browser.newPage(); await recovery.route('**/cloud-client.mjs',route=>route.fulfill({contentType:'text/javascript',body:mock.replace('listener=fn;',"listener=fn;setTimeout(()=>fn('PASSWORD_RECOVERY'),25);")})); await recovery.goto(`http://127.0.0.1:${server.address().port}/admin.html`); await recovery.getByText('Definir nova senha',{exact:true}).waitFor(); await recovery.locator('#password').fill('FreshExamplePassword12'); await recovery.locator('#auth-submit').click(); await recovery.getByText('Senha atualizada com sucesso.',{exact:true}).waitFor(); assert(true,'Fluxo PASSWORD_RECOVERY atualiza senha'); await recovery.close();
 const report={mode:'MOCK',checks:checks.length,results:checks.map(label=>({label,passed:true})),note:'UI com transporte/backend simulado; não verifica Supabase real, permissões RLS reais, entrega de e-mail, upload remoto nem codec de vídeo.'};
 await writeFile(`${docs}/admin-browser-results.json`,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r))}
