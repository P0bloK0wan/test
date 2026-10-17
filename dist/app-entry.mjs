import {requireViewer} from './access.mjs';
try{
 if(await requireViewer()){
  await import('./app.mjs');
  document.body.removeAttribute('data-auth-pending');
 }
}catch{
 const main=document.getElementById('main');
 const heading=document.createElement('h1');heading.textContent='Não foi possível carregar o site';
 const text=document.createElement('p');text.textContent='Confira sua conexão e tente novamente.';
 const retry=document.createElement('button');retry.textContent='Tentar novamente';retry.className='button';retry.onclick=()=>location.reload();
 const panel=document.createElement('section');panel.className='personal-page';panel.append(heading,text,retry);main.replaceChildren(panel);
 document.body.removeAttribute('data-auth-pending');
}
