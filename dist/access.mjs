import {cloud} from './cloud-client.mjs';
export let viewer=null;
export let viewerIsAdmin=false;
function loginDestination(admin){const url=new URL('login.html',location.href);url.searchParams.set('next',admin?'admin.html':'index.html');return url.href;}
function unavailable(){
 const main=document.createElement('main');main.style.cssText='max-width:520px;margin:15vh auto;padding:24px;color:#fff;font:18px system-ui';
 const title=document.createElement('h1');title.textContent='Não foi possível validar seu acesso';
 const text=document.createElement('p');text.textContent='Confira a conexão e tente novamente. Sua sessão não foi apagada.';
 const retry=document.createElement('button');retry.textContent='Tentar novamente';retry.onclick=()=>location.reload();
 const login=document.createElement('a');login.href=new URL('login.html',location.href).href;login.textContent='Ir para entrar';login.style.cssText='display:block;margin-top:24px;color:white';
 main.append(title,text,retry,login);document.body.replaceChildren(main);document.body.removeAttribute('data-auth-pending');
}
export async function requireViewer({admin=false}={}){
 const guest=Object.freeze({guest:true});
 if(!cloud.ready||!cloud.client){if(admin){unavailable();return null;}return guest;}
 try{
  let sessionTimer;const {data,error}=await Promise.race([cloud.client.auth.getUser(),new Promise((_,reject)=>sessionTimer=setTimeout(()=>reject(new Error('Session timeout')),8000))]).finally(()=>clearTimeout(sessionTimer));
  if(!data?.user){
   if(admin){if(error&&/fetch|network|timeout/i.test(error.message||'')){unavailable();return null;}location.replace(loginDestination(true));return null;}
   cloud.client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session?.user?.id)location.reload();});
   addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
   return guest;
  }
  if(error){unavailable();return null;}
  viewer=Object.freeze({id:data.user.id,email:data.user.email||''});
  viewerIsAdmin=await cloud.isAdmin();
  if(admin&&!viewerIsAdmin){location.replace(new URL('index.html',location.href).href);return null;}
  cloud.client.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'||(session?.user?.id&&session.user.id!==viewer.id))location.replace(admin?loginDestination(true):new URL('index.html',location.href).href);
  });
  addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  return viewer;
 }catch{if(!admin)return guest;unavailable();return null;}
}
