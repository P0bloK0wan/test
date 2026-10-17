import {catalog, genres, findMovie, replaceCloudMovies} from './catalog.mjs';
import {createLibrary} from './library.mjs';
import {AVATARS,avatarArt} from './avatars.mjs';
import {mountStreamlabPlayer} from './streamlab-player.mjs';
import {filterCatalog} from './catalog-query.mjs';
import {initMotion} from './motion.mjs';
import {cloud} from './cloud-client.mjs';
import {viewer,viewerIsAdmin} from './access.mjs';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
 search:'<circle cx="10.8" cy="10.8" r="7.3"/><path d="m16 16 5 5"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 play:'<path d="m8 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="m5 12 4 4L19 6"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 right:'<path d="m9 5 7 7-7 7"/>', left:'<path d="m15 5-7 7 7 7"/>',
 home:'<path d="m3 10 9-7 9 7v10H15v-6H9v6H3z"/>', list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h.1M3 12h.1M3 18h.1"/>',
 edit:'<path d="m15 4 5 5M4 20l1-6L16 3l5 5-11 11z"/>',
 settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
 like:'<path d="M7 10v11H3V10zm0 0 4-7c2 0 3 1 2 5h6c2 0 2 2 1 5l-2 7H7"/>',
 dislike:'<path d="M7 14V3H3v11zm0 0 4 7c2 0 3-1 2-5h6c2 0 2-2 1-5l-2-7H7"/>',
 heart:'<path d="M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 4 0 8 8 15 8-7 12-11 8-15z"/>',
 external:'<path d="M14 3h7v7M21 3l-9 9M10 4H4v16h16v-6"/>', download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
let storage,rawStorage,librarySync=null,syncConflict=false,syncState={state:'offline',message:'Dados salvos neste navegador.'};
try{rawStorage=window.localStorage;const suffix='.'+viewer.id;storage={getItem:key=>rawStorage.getItem(key+suffix),setItem:(key,value)=>rawStorage.setItem(key+suffix,value)};}catch{}
function updateSyncStatus(value=syncState){
 syncState=value||syncState;if(syncState.state==='conflict')syncConflict=true;else if(syncState.state==='synced')syncConflict=false;const status=$('library-sync-status');if(!status)return;
 status.dataset.state=syncState.state;status.querySelector('[data-sync-message]').textContent=syncState.message||'Dados salvos neste navegador.';
 status.querySelector('[data-sync-conflict]').hidden=!syncConflict;
}
if(cloud.ready&&typeof cloud.client?.from==='function'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(viewer?.id||'')){
 try{const {createLibrarySync}=await import('./library-sync.mjs');librarySync=await createLibrarySync({client:cloud.client,userId:viewer.id,storage:rawStorage,onStatus:updateSyncStatus});storage=librarySync.storage;syncState=librarySync.status();}catch{syncState={state:'offline',message:'Sem conexão para sincronizar. Suas alterações continuam neste navegador.'};}
}
const library=createLibrary(storage);
const dialog=$('dialog');
let cleanupMotion=()=>{};
let currentPanel=null, toastTimer, railCounter=0, dialogOpener=null, playerCleanup=null;
const noticeMovies = () => [...catalog.filter(m=>m.publishedOnline),...['wing-it','charge','sprite-fright'].map(findMovie)].filter(m=>m&&(!library.activeProfile().kids||m.age<=10));
const age = value => `<span class="age age--${value}">${value===0?'L':value}</span>`;
const getRoute=()=>{const raw=location.hash.slice(1)||'/home';const [path,qs]=raw.split('?');return {view:path.replace(/^\//,'')||'home',params:new URLSearchParams(qs||'')};};
function route(view,params={},replace=false){
 const qs=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==''&&v!==null&&v!==undefined));
 const hash=`#/${view}${qs.size?'?'+qs:''}`;
 closePanel();
 if(replace){history.replaceState(null,'',hash);renderMain();}else if(location.hash!==hash){location.hash=hash;}else renderMain();
}
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function checkPersistence(){if(library.lastError())toast('Sua alteração vale nesta sessão, mas não pôde ser salva no navegador.');}
function avatar(profile,small=false){return `<span class="avatar avatar--${esc(profile.color)}${small?' avatar--small':''}${profile.avatar&&profile.avatar!=='classic'?' avatar--art':''}" aria-hidden="true">${avatarArt(profile.avatar)}</span>`;}
function updateHeader(){
 const {view,params}=getRoute();const profile=library.activeProfile();
 $('active-avatar').className=`avatar avatar--small avatar--${profile.color}${profile.avatar!=='classic'?' avatar--art':''}`;$('active-avatar').innerHTML=avatarArt(profile.avatar);
 $('profile-toggle').setAttribute('aria-label',`Abrir menu de perfis. Perfil atual: ${profile.name}`);
 $('header').classList.toggle('scrolled',scrollY>24||view!=='home'||params.has('genre'));
 document.querySelectorAll('[data-view]').forEach(a=>{if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.querySelectorAll('[data-mobile]').forEach(a=>{const target=a.dataset.mobile;const active=target===view||(target==='home'&&!['search','list','me'].includes(view));if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 const input=$('global-search');input.hidden=view!=='search';if(input.value!==(params.get('q')||''))input.value=params.get('q')||'';
 const unread=library.unreadNotices(noticeMovies().map(m=>m.id)).length;
 $('notices-toggle').innerHTML=icon('bell')+(unread?'<span class="notice-dot" aria-hidden="true"></span>':'');
}
function card(movie,{rank=0,progress=false}={}){
 const record=progress?library.progress(movie.id):null;const percent=record&&record.duration?Math.min(100,record.seconds/record.duration*100):0;
 return `<article class="movie-card${rank?' movie-card--rank':''}" data-movie="${movie.id}"><div class="card-visual">${rank?`<span class="rank-number" aria-hidden="true">${rank}</span>`:''}<button class="card-open" data-action="details" data-id="${movie.id}" data-focus="details-${movie.id}" aria-label="Detalhes de ${esc(movie.title)}" title="${esc(movie.title)}"><img src="${esc(movie.image)}" alt="" loading="lazy" width="640" height="360"></button><span class="card-mark" aria-hidden="true">C</span><span class="card-title-overlay" aria-hidden="true">${esc(movie.title)}</span><div class="card-actions"><button class="round-button round-button--white" data-action="${progress?'resume':'play'}" data-id="${movie.id}" data-focus="play-${movie.id}" aria-label="${progress?'Continuar':'Assistir a'} ${esc(movie.title)}">${icon('play')}</button><button class="round-button" data-action="save" data-id="${movie.id}" data-focus="save-${movie.id}" aria-label="${library.isSaved(movie.id)?'Remover da':'Adicionar à'} minha lista: ${esc(movie.title)}" aria-pressed="${library.isSaved(movie.id)}">${icon(library.isSaved(movie.id)?'check':'plus')}</button></div>${record?`<div class="progress-track" aria-label="${Math.round(percent)}% do ${movie.video?'vídeo':'trailer'} assistido"><span style="width:${percent}%"></span></div>`:''}</div><div class="card-caption"><strong>${esc(movie.title)}</strong><span>${progress?(movie.video?'Vídeo':'Trailer'):movie.minutes+' min'}</span></div></article>`;
}
function shelf(title,items,{rank=false,progress=false}={}){
 if(!items.length)return '';const id=`rail-${railCounter++}`;
 return `<section class="shelf" aria-label="${esc(title)}"><div class="section-heading"><h2>${esc(title)}</h2><a href="#/films" class="section-link"><span class="explore-text">Explorar todos</span>${icon('right')}</a></div><div class="rail-wrapper"><button class="rail-arrow rail-arrow--prev" data-action="rail" data-target="${id}" data-direction="-1" aria-label="Voltar em ${esc(title)}">${icon('left')}</button><div id="${id}" class="rail-track${rank?' ranking-track':''}">${items.map((m,i)=>card(m,{rank:rank?i+1:0,progress})).join('')}</div><button class="rail-arrow rail-arrow--next" data-action="rail" data-target="${id}" data-direction="1" aria-label="Avançar em ${esc(title)}">${icon('right')}</button></div></section>`;
}
function genreSelect(value=''){return `<select id="genre-filter" class="filter-select" aria-label="Filtrar por gênero"><option value="">Todos os gêneros</option>${genres.map(g=>`<option value="${esc(g)}" ${g===value?'selected':''}>${esc(g)}</option>`).join('')}</select>`;}
function personalPage(profile,available){
 const visible=ids=>ids.map(findMovie).filter(m=>m&&available.includes(m));
 const progress=visible(library.continueWatching()),liked=visible(library.likedIds()),saved=visible(library.savedIds());
 const collection=(title,items,{progress=false,empty,link='films'}={})=>`<section class="personal-collection" aria-label="${title}"><div class="personal-heading"><h2>${title}</h2><span>${items.length} ${items.length===1?'título':'títulos'}</span></div>${items.length?`<div class="personal-grid">${items.map(m=>card(m,{progress})).join('')}</div>`:`<div class="personal-empty"><p>${empty}</p><a href="#/${link}">Explorar filmes ${icon('right')}</a></div>`}</section>`;
 return `<section class="personal-page view-content"><div class="personal-profile">${avatar(profile)}<div><p class="personal-eyebrow">MINHA STREAMLAB</p><h1>${esc(profile.name)}</h1><p>Suas histórias, do seu jeito.${profile.kids?' Perfil infantil.':''}</p></div><button class="button button--outline" data-action="edit-profile" data-profile="${esc(profile.id)}">${icon('edit')}Editar perfil e avatar</button></div><div class="personal-summary"><span><strong>${saved.length}</strong> na minha lista</span><span><strong>${liked.length}</strong> curtidos</span><span><strong>${progress.length}</strong> para continuar</span><button data-action="profiles">Gerenciar perfis</button></div><div id="library-sync-status" class="library-sync" role="status" aria-live="polite"><span data-sync-message></span><div data-sync-conflict hidden><p>Existem alterações diferentes nesta conta. Escolha qual versão continuar usando. A versão deste aparelho fica preservada até você escolher.</p><button class="button button--outline" data-action="sync-choice" data-choice="local">Usar deste aparelho</button><button class="button button--outline" data-action="sync-choice" data-choice="remote">Usar da conta</button></div></div>${collection('Continue assistindo',progress,{progress:true,empty:'Seus vídeos e trailers iniciados aparecem aqui. O progresso de players externos, como Google Drive e YouTube, não é salvo.'})}${collection('Você curtiu',liked,{empty:'Gostou de uma história? Avalie com Gostei ou Adorei nos detalhes para encontrá-la aqui.'})}${collection('Minha lista',saved,{empty:'Guarde histórias com o botão + e volte quando quiser.'})}</section>`;
}
function renderMain(){
 const {view,params}=getRoute();const profile=library.activeProfile();const query=params.get('q')||'',genre=params.get('genre')||'';
 const available=filterCatalog(catalog,{kids:profile.kids});railCounter=0;
 const validViews=['home','films','animation','new','list','search','me'];
 if(!validViews.includes(view)){route('home',{},true);return;}
 if(view==='me'){
  $('main').innerHTML=personalPage(profile,available);
 }else if(view==='home'&&!genre){
  const movie=findMovie('sintel');const progressIds=library.continueWatching();const progress=progressIds.map(findMovie).filter(m=>m&&available.includes(m));
  $('main').innerHTML=`<div class="view-content"><section class="hero" aria-label="Destaque: Sintel"><img class="hero-image" src="${movie.hero}" alt="Sintel em uma paisagem montanhosa" fetchpriority="high"><div class="hero-copy"><div class="hero-label"><span aria-hidden="true">C</span> CINEMA ABERTO</div><h1>SINTEL</h1><p class="hero-tagline">Uma jornada. Uma amizade. Um destino.</p><p class="hero-synopsis">Em busca de um pequeno dragão, uma jovem descobre que algumas histórias ficam com a gente para sempre.</p><div class="hero-buttons"><button class="button" data-action="trailer" data-id="sintel" data-focus="hero-play">${icon('play')}Assistir trailer</button><button class="button button--secondary" data-action="details" data-id="sintel" data-focus="hero-details">${icon('info')}Mais informações</button></div></div><div class="hero-edge"><div class="hero-age">${age(10)}<span>Fantasia · 15 min</span></div></div></section><div class="content-rows">${shelf('Continue de onde parou',progress,{progress:true})}${shelf('Acabaram de chegar',available.filter(m=>m.publishedOnline))}${shelf('Sua próxima história favorita',available.slice(0,8))}${shelf('10 histórias para a sua lista',available.slice(0,10),{rank:true})}<div class="feature-band"><div><h2>Grandes histórias. Novas descobertas.</h2><p>Uma seleção de cinema independente para sair do óbvio.</p></div><a href="#/films">Explorar catálogo${icon('right')}</a></div>${shelf('Imaginação sem limites',available.filter(m=>m.genres.includes('Fantasia')||m.genres.includes('Ficção científica')))}${shelf('Para deixar o dia mais leve',available.filter(m=>m.genres.includes('Comédia')))}</div></div>`;
 }else{
  let items=filterCatalog(catalog,{query:view==='search'?query:'',genre,kind:view==='animation'?'animation':'all',savedIds:view==='list'?library.savedIds():null,kids:profile.kids});
  if(view==='new')items=[...items].sort((a,b)=>b.year-a.year);
  const titles={home:genre||'Explorar',films:'Filmes',animation:'Animações',new:'Novidades do catálogo',list:'Minha lista',search:query?`Resultados para “${query}”`:'O que você quer assistir?'};
  const subtitles={home:'Encontre uma nova história entre os nossos filmes selecionados.',films:'De pequenas aventuras a grandes mundos. Escolha sua próxima descoberta.',animation:'Histórias que só a imaginação poderia criar.',new:'Uma nova seleção para você descobrir, no seu tempo.',list:'As histórias que você guardou para ver depois.',search:query?`${items.length} ${items.length===1?'título encontrado':'títulos encontrados'}`:'Encontre filmes por título, gênero ou história.'};
  const chips=view==='search'?`<div class="genre-chips" aria-label="Gêneros">${genres.map(g=>`<button class="genre-chip${genre===g?' active':''}" data-action="genre" data-genre="${esc(g)}" aria-pressed="${genre===g}">${esc(g)}</button>`).join('')}</div>`:'';
  const empty=view==='list'?`${icon('list')}<h2>Sua lista começa com uma boa história.</h2><p>Toque no símbolo + de um filme para guardá-lo aqui. Esta lista é só do perfil ${esc(profile.name)}.</p><a class="button" href="#/films">Explorar filmes</a>`:`${icon('search')}<h2>Nenhuma história por aqui. Ainda.</h2><p>Tente outro título ou escolha um gênero diferente.</p><button class="button button--outline" data-action="reset-search">Limpar filtros</button>`;
  $('main').innerHTML=`<section class="catalog-page view-content"><div class="page-heading"><h1 id="page-title" tabindex="-1">${esc(titles[view])}</h1>${view!=='search'?genreSelect(genre):''}</div><p class="page-subtitle" id="result-status" role="status">${esc(subtitles[view])}</p>${chips}${items.length?`<div class="catalog-grid" id="catalog-grid">${items.map(m=>card(m)).join('')}</div>`:`<div class="empty-state">${empty}</div>`}</section>`;
 }
 updateHeader();updateSyncStatus();cleanupMotion();cleanupMotion=initMotion($('main'));
}
function closePanel(){currentPanel=null;$('header-panel').hidden=true;$('profile-toggle').setAttribute('aria-expanded','false');$('notices-toggle').setAttribute('aria-expanded','false');}
function openPanel(kind){
 if(currentPanel===kind){closePanel();return;}
 currentPanel=kind;const active=library.activeProfile();
 if(kind==='profiles'){
  $('header-panel').innerHTML=`<div class="panel-label">QUEM ESTÁ ASSISTINDO</div>${library.snapshot().profiles.map(p=>`<button class="panel-profile${p.id===active.id?' active':''}" data-action="switch-profile" data-profile="${esc(p.id)}">${avatar(p,true)}<span>${esc(p.name)}${p.kids?' <span class="kids-label">Infantil</span>':''}</span></button>`).join('')}${viewerIsAdmin?`<a class="panel-link" href="admin.html">${icon('settings')}Administrar catálogo</a>`:''}<div class="panel-label">${esc(viewer.email)}</div><button class="panel-link" data-action="sign-out">Sair da conta</button><a class="panel-link" href="#/me">${icon('heart')}Minha Streamlab</a><button class="panel-link" data-action="profiles">${icon('edit')}Gerenciar perfis</button><button class="panel-link" data-action="local-video">${icon('play')}Abrir vídeo do aparelho</button><button class="panel-link" data-action="preferences">${icon('settings')}Preferências</button>`;
  $('profile-toggle').setAttribute('aria-expanded','true');$('notices-toggle').setAttribute('aria-expanded','false');
 }else{
  const items=noticeMovies();
  $('header-panel').innerHTML=`<div class="panel-label">PARA VOCÊ DESCOBRIR</div>${items.map(m=>`<button class="notice" data-action="details" data-id="${m.id}"><img src="${m.image}" alt=""><div><strong>${esc(m.title)}</strong><span>${esc(m.tagline)}</span></div></button>`).join('')}`;
  library.markNoticesRead(items.map(m=>m.id));updateHeader();$('notices-toggle').setAttribute('aria-expanded','true');$('profile-toggle').setAttribute('aria-expanded','false');
 }
 $('header-panel').hidden=false;
}
function openDialog(content,{player=false}={}){
 closePanel();if(playerCleanup){playerCleanup();playerCleanup=null;}
 if(!dialog.open)dialogOpener={element:document.activeElement,key:document.activeElement?.dataset?.focus};
 dialog.className=player?'player-dialog':'';
 dialog.innerHTML=content;
 if(!dialog.open)dialog.showModal();
 dialog.querySelector('.dialog-close')?.focus({preventScroll:true});
}
const closeButton=(label='Fechar')=>`<button class="dialog-close" data-action="close" aria-label="${label}">${icon('close')}</button>`;
function closeDialog(){dialog.close();}
dialog.addEventListener('close',()=>{
 if(playerCleanup){playerCleanup();playerCleanup=null;}
 dialog.innerHTML='';dialog.className='';renderMain();
 const {element,key}=dialogOpener||{};const replacement=key?[...document.querySelectorAll('[data-focus]')].find(b=>b.dataset.focus===key):null;
 const target=element?.isConnected?element:replacement||$('main');target?.focus({preventScroll:true});dialogOpener=null;
});
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();}});
function details(id){
 const m=findMovie(id);if(!m||library.activeProfile().kids&&m.age>10){toast('Este título não está disponível neste perfil.');return;}
 openDialog(`${closeButton()}<div class="detail-art"><img src="${esc(m.hero)}" alt=""><div class="detail-art-content"><h1 id="dialog-title" class="detail-title">${esc(m.title)}</h1><div class="detail-actions"><button class="button" data-action="play" data-id="${m.id}">${icon('play')}Filme completo</button>${m.trailer?`<button class="button button--secondary" data-action="trailer" data-id="${m.id}">Trailer</button>`:''}<button class="round-button" data-action="save" data-id="${m.id}" aria-label="${library.isSaved(m.id)?'Remover da':'Adicionar à'} minha lista: ${esc(m.title)}" aria-pressed="${library.isSaved(m.id)}">${icon(library.isSaved(m.id)?'check':'plus')}</button></div></div></div><div class="detail-body"><div class="detail-cols"><div><div class="metadata"><span>${m.year}</span>${age(m.age)}<span>${m.minutes} min</span><span>Curta-metragem</span></div><p>${esc(m.synopsis)}</p><div class="detail-small-label">O que você achou?</div><div class="rating-actions" aria-label="Sua avaliação"><button class="round-button" data-action="rate" data-id="${m.id}" data-rating="-1" aria-label="Não é para mim" aria-pressed="${library.getRating(m.id)===-1}">${icon('dislike')}</button><button class="round-button" data-action="rate" data-id="${m.id}" data-rating="1" aria-label="Gostei" aria-pressed="${library.getRating(m.id)===1}">${icon('like')}</button><button class="round-button" data-action="rate" data-id="${m.id}" data-rating="2" aria-label="Adorei" aria-pressed="${library.getRating(m.id)===2}">${icon('heart')}</button></div></div><div><p class="metadata-small"><span>Direção:</span> ${esc(m.director)}</p><p class="metadata-small"><span>Gêneros:</span> ${esc(m.genres.join(', '))}</p><p class="metadata-small"><span>Uma história para:</span> ${esc(m.tagline)}</p><p class="metadata-small"><span>Produção:</span> ${esc(m.credit)}</p></div></div><p class="detail-footnote">${m.video?'Vídeo disponibilizado pelo responsável do catálogo.':'O filme completo é exibido pelo canal oficial do autor.'} Classificação etária editorial deste catálogo.</p></div>`);
}
function updateSavedButtons(id){const saved=library.isSaved(id),m=findMovie(id);document.querySelectorAll(`[data-action="save"][data-id="${id}"]`).forEach(b=>{b.innerHTML=icon(saved?'check':'plus');b.setAttribute('aria-pressed',String(saved));b.setAttribute('aria-label',`${saved?'Remover da':'Adicionar à'} minha lista: ${m.title}`);});}
function play(id,{trailer=false,resume=false}={}){
 const m=findMovie(id);if(!m||library.activeProfile().kids&&m.age>10)return;
 if(trailer&&!m.trailer){toast('O trailer deste título não está disponível.');return;}
 openPlayer(m,{trailer,resume});
}
function openPlayer(m,{trailer=false,resume=false,temporary=false,onClose=()=>{}}={}){
 const drive=!trailer&&m.drive;
 const native=trailer||!!m.video&&!drive,media=trailer?m.trailer:m.video;
 const subtitle=temporary?'Arquivo deste aparelho · Não enviado':trailer?'Trailer oficial':drive?'Vídeo no Google Drive':m.video?'Vídeo do catálogo':'Filme completo · Canal oficial Blender Studio';
 const pref=library.preferences();
 const youtube=`https://www.youtube-nocookie.com/embed/${m.youtubeId}?autoplay=1&rel=0`;
 const stage=drive?`<iframe src="${esc(drive.embedUrl)}" title="${esc(m.title)} — vídeo no Google Drive" allow="autoplay; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`:native?`<video id="movie-video" controls playsinline preload="metadata" src="${esc(media)}" poster="${esc(m.image)}" ${pref.muted?'muted':''} aria-label="${trailer?'Trailer':'Vídeo'} de ${esc(m.title)}"></video>`:`<iframe src="${youtube}" title="${esc(m.title)} — filme completo no canal oficial" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
 const footer=drive?`<div class="player-bottom"><span>Reprodução pelo Google Drive.</span><a href="${esc(drive.shareUrl)}" target="_blank" rel="noopener noreferrer">Abrir no Google Drive ${icon('external')}</a></div><p class="small-note">Se o vídeo não abrir, confira se o compartilhamento está público ou tente Abrir no Google Drive. O arquivo pode estar em processamento ou com limite de acessos. O progresso desse player não é salvo pelo site.</p>`:temporary?'<div class="player-bottom"><span>O arquivo fica no seu aparelho e não entra no catálogo online.</span><button class="button button--outline" data-action="local-video">Escolher outro vídeo</button></div>':trailer?`<div class="player-bottom"><span class="trailer-badge">TRAILER</span><span>Blender Foundation</span><a href="${esc(media)}" download="${m.id}-trailer.mp4" aria-label="Baixar trailer de ${esc(m.title)}">Baixar trailer</a></div>`:m.video?'<div class="player-bottom"><span>Conteúdo fornecido pelo responsável do catálogo.</span></div>':`<div class="player-bottom"><a href="https://www.youtube.com/watch?v=${m.youtubeId}" target="_blank" rel="noopener noreferrer">Abrir no canal oficial ${icon('external')}</a></div>`;
 const error=drive?`<p>Confira o compartilhamento público e tente abrir o vídeo no Google Drive.</p><a class="button" href="${esc(drive.shareUrl)}" target="_blank" rel="noopener noreferrer">Abrir no Google Drive</a>`:native?`<p>Confira o arquivo ou o link. Prefira MP4 com vídeo H.264 e áudio AAC. Outros formatos dependem do navegador.</p>${trailer?`<a class="button" href="https://www.youtube.com/watch?v=${m.youtubeId}" target="_blank" rel="noopener noreferrer">Abrir canal oficial</a>`:'<button class="button button--outline" data-action="local-video">Escolher arquivo do aparelho</button>'}`:`<p>Tente novamente ou assista no canal oficial do filme.</p><a class="button" href="https://www.youtube.com/watch?v=${m.youtubeId}" target="_blank" rel="noopener noreferrer">Abrir canal oficial</a>`;
 openDialog(`<div class="player-topbar">${closeButton('Fechar reprodução')}<h1 id="dialog-title">${esc(m.title)}<span>${subtitle}</span></h1></div><div class="player-stage">${stage}</div>${footer}<div class="video-error" id="video-error" hidden><strong>Não foi possível reproduzir agora.</strong>${error}</div>`,{player:true});
 if(native){
  const video=$('movie-video');const errorPanel=$('video-error');const controller=new AbortController();const signal=controller.signal;let lastSaved=0;
  const cleanupControls=mountStreamlabPlayer(video,{title:m.title});
  const save=()=>{if(!temporary&&Number.isFinite(video.duration)&&video.duration>0&&findMovie(m.id)){try{library.recordProgress(m.id,video.currentTime,video.duration);}catch{/* Title may have been removed while playing. */}}};
  video.muted=pref.muted;
  video.addEventListener('loadedmetadata',()=>{const record=temporary?null:library.progress(m.id);if(resume&&record&&record.seconds<video.duration*.95)video.currentTime=record.seconds;if(pref.autoplay)video.play().catch(()=>{});},{once:true,signal});
  video.addEventListener('timeupdate',()=>{if(Date.now()-lastSaved>1000){save();lastSaved=Date.now();}},{signal});
  video.addEventListener('ended',save,{signal});video.addEventListener('pause',save,{signal});
  video.addEventListener('error',()=>{errorPanel.hidden=false;},{signal});
  playerCleanup=()=>{save();controller.abort();cleanupControls();video.pause();video.removeAttribute('src');video.load();onClose();};
 }
}
function playLocalFile(file){
 if(!file)return;
 if(!/\.(mp4|webm|ogv|ogg)$/i.test(file.name)&&!/^video\//.test(file.type)){toast('Escolha um arquivo de vídeo. Prefira MP4 com vídeo H.264 e áudio AAC.');return;}
 const url=URL.createObjectURL(file);
 try{openPlayer({title:file.name.replace(/\.[^.]+$/,''),video:url,image:'assets/own-video.svg'},{temporary:true,onClose:()=>URL.revokeObjectURL(url)});}catch(error){URL.revokeObjectURL(url);throw error;}
}

function profiles(){
 const active=library.activeProfile();const list=library.snapshot().profiles;
 openDialog(`${closeButton()}<section class="panel-dialog"><h1 id="dialog-title">Quem está assistindo?</h1><p>Cada perfil tem sua própria lista, avaliações e histórias para continuar.</p><div class="profile-list">${list.map(p=>`<button class="profile-tile${p.id===active.id?' active':''}" data-action="edit-profile" data-profile="${esc(p.id)}" aria-label="Editar perfil ${esc(p.name)}">${avatar(p)}<span>${esc(p.name)}</span><span class="edit-mark" aria-hidden="true">${icon('edit')}</span></button>`).join('')}${list.length<5?`<button class="profile-tile" data-action="new-profile"><span class="profile-add">${icon('plus')}</span><span>Adicionar perfil</span></button>`:''}</div><p class="small-note">Até 5 perfis na sua biblioteca.</p><button class="button" data-action="close">Concluído</button></section>`);
}
function avatarPicker(profile){return `<div class="avatar-picker"><span class="field-label">Escolha seu avatar</span>${[...new Set(AVATARS.map(a=>a.category))].map(category=>`<fieldset><legend>${category}</legend><div class="avatar-options">${AVATARS.filter(a=>a.category===category).map(a=>`<button type="button" class="avatar-option" data-action="avatar-choice" data-avatar="${a.id}" aria-label="${a.name}" aria-pressed="${(profile.avatar||'classic')===a.id}">${avatar({...profile,avatar:a.id})}<span>${a.name}</span></button>`).join('')}</div></fieldset>`).join('')}<input type="hidden" name="avatar" value="${profile.avatar||'classic'}"></div>`;}
function profileForm(id=null){
 const profile=id?library.snapshot().profiles.find(p=>p.id===id):{name:'',color:'blue',kids:false,avatar:'classic'};if(!profile)return;
 const canDelete=id&&library.snapshot().profiles.length>1;
 openDialog(`${closeButton()}<section class="panel-dialog"><h1 id="dialog-title">${id?'Editar perfil':'Adicionar perfil'}</h1><p>Dê a este espaço o seu jeito.</p><form id="profile-form" data-profile="${esc(id||'')}"><label class="field-label" for="profile-name">Nome do perfil</label><input class="text-input" id="profile-name" name="name" value="${esc(profile.name)}" maxlength="24" placeholder="Como você quer ser chamado?" required autocomplete="off">${avatarPicker(profile)}<span class="field-label">Escolha uma cor</span><div class="color-choices" aria-label="Cor do perfil">${['red','blue','teal','gold','violet'].map(c=>`<button type="button" class="color-choice color-choice--${c}" data-action="color" data-color="${c}" aria-label="${{red:'Vermelho',blue:'Azul',teal:'Verde',gold:'Dourado',violet:'Violeta'}[c]}" aria-pressed="${c===profile.color}"><span></span></button>`).join('')}</div><input type="hidden" name="color" value="${profile.color}"><label class="checkbox-label"><input type="checkbox" name="kids" ${profile.kids?'checked':''}>Perfil infantil</label><p class="small-note">Exibe apenas títulos com indicação editorial de até 10 anos.</p><p class="form-error" id="profile-error" role="alert"></p><div class="form-actions"><button class="button" type="submit">Salvar perfil</button><button class="button button--outline" type="button" data-action="profiles">Cancelar</button>${canDelete?`<button class="button button--outline" type="button" data-action="delete-profile" data-profile="${esc(id)}">Excluir</button>`:''}</div></form></section>`);
 $('profile-name')?.focus();
}
function preferences(){const pref=library.preferences();openDialog(`${closeButton()}<section class="panel-dialog"><h1 id="dialog-title">Do seu jeito</h1><p>Preferências de reprodução do perfil ${esc(library.activeProfile().name)}.</p><label class="settings-row"><div><strong>Iniciar trailers automaticamente</strong><p>Reproduzir ao abrir um trailer. A página inicial permanece silenciosa.</p></div><input id="pref-autoplay" type="checkbox" ${pref.autoplay?'checked':''}></label><label class="settings-row"><div><strong>Começar com o som desativado</strong><p>Você pode ativar o áudio nos controles do vídeo.</p></div><input id="pref-muted" type="checkbox" ${pref.muted?'checked':''}></label><div class="form-actions"><button class="button" data-action="save-preferences">Salvar preferências</button></div><p class="small-note">Estas opções se aplicam aos trailers disponíveis neste site.</p></section>`);}
function credits(){openDialog(`${closeButton()}<section class="panel-dialog"><h1 id="dialog-title">Créditos do catálogo</h1><section aria-label="Dados de filmes TMDB"><a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"><img src="assets/tmdb.svg" alt="TMDB" width="120" style="height:auto"></a><p>Integração opcional para informações de filmes.</p><p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section><p>Histórias abertas, feitas por pessoas talentosas. Conheça quem criou cada filme.</p><ul class="credits-list">${catalog.map(m=>`<li><a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">${esc(m.title)}</a><span>${m.year} · Direção: ${esc(m.director)}</span><span>${esc(m.credit)}</span></li>`).join('')}</ul><p class="small-note">Artes: <a href="https://studio.blender.org/terms-and-conditions/" target="_blank" rel="noopener noreferrer">Creative Commons Atribuição 4.0</a>. Trailers de Sintel e Big Buck Bunny: Blender Foundation, CC BY 3.0, hospedados originalmente pelo W3C. Filmes completos: incorporações dos canais oficiais. Sinopses em português e experiência web são independentes.</p></section>`);}
function help(){openDialog(`${closeButton()}<section class="panel-dialog"><h1 id="dialog-title">Vamos encontrar sua próxima história?</h1><div class="help-list"><h3>Explore sem pressa</h3><p>Busque por um título, uma ideia ou um gênero. Nos trilhos, deslize para ver mais filmes.</p><h3>Uma lista só sua</h3><p>Use o + para guardar um filme. Ao trocar de perfil, você encontra uma lista diferente.</p><h3>Vídeos do seu aparelho</h3><p>Abra o menu do perfil ou o rodapé e toque em Abrir vídeo do aparelho. Escolha um arquivo, preferencialmente MP4. Ele não é enviado e fica disponível apenas nesta reprodução. Para compartilhar no catálogo, um administrador pode cadastrar o link público do Drive ou enviar um MP4 pelo painel.</p><h3>Continue depois</h3><p>O progresso dos trailers e vídeos próprios do catálogo fica salvo. Volte à página inicial para continuar de onde parou.</p><h3>Cinema aberto</h3><p>Os filmes completos são exibidos pelos canais oficiais do Blender Studio. Os trailers de Sintel e Big Buck Bunny também estão disponíveis aqui para assistir e baixar.</p><h3>Sua biblioteca</h3><p>Sua biblioteca pertence à conta conectada. A área Minha Streamlab mostra quando há alterações pendentes ou sem conexão. Alterações locais ficam neste navegador até a sincronização.</p></div></section>`);}
function saveMovie(id){try{const saved=library.toggleSaved(id);updateSavedButtons(id);if(['list','me'].includes(getRoute().view)&&!dialog.open)renderMain();toast(saved?'Adicionado à sua lista.':'Removido da sua lista.');checkPersistence();}catch{toast('Não foi possível alterar sua lista.');}}

document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');
 if(!button){if(currentPanel&&!$('header').contains(event.target))closePanel();return;}
 const {action,id}=button.dataset;
 switch(action){
  case 'sign-out':void (async()=>{if(librarySync){await librarySync.flush();}return cloud.client.auth.signOut({scope:'local'});})().then(({error})=>{if(error){toast('Não foi possível sair. Tente novamente.');return;}librarySync?.dispose();location.replace(new URL('login.html',location.href).href);}).catch(()=>toast('Confira a conexão para sair.'));break;
  case 'details':details(id);break;
  case 'play':play(id);break;
  case 'trailer':play(id,{trailer:true});break;
  case 'resume':play(id,{trailer:!findMovie(id)?.video,resume:true});break;
  case 'local-video':closePanel();$('local-video-file').click();break;
  case 'save':saveMovie(id);break;
  case 'close':closeDialog();break;
  case 'rail':{const rail=$(button.dataset.target);rail?.scrollBy({left:rail.clientWidth*.8*Number(button.dataset.direction),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});break;}
  case 'genre':{const r=getRoute();route(r.view,{q:r.params.get('q')||'',genre:r.params.get('genre')===button.dataset.genre?'':button.dataset.genre});break;}
  case 'reset-search':route(getRoute().view==='list'?'list':'search',{},true);$('global-search').focus();break;
  case 'sync-choice':if(librarySync){const choices=[...document.querySelectorAll('[data-action="sync-choice"]')];choices.forEach(b=>b.disabled=true);void librarySync.resolveConflict(button.dataset.choice).then(()=>{if(librarySync.status().state==='synced')location.reload();else toast('A escolha foi mantida neste aparelho. Aguarde a conexão para concluir.');}).catch(()=>toast('Não foi possível resolver agora. Sua versão local foi preservada.')).finally(()=>choices.forEach(b=>b.disabled=false));}break;
  case 'avatar-choice':{const form=$('profile-form');form.elements.avatar.value=button.dataset.avatar;form.querySelectorAll('[data-action="avatar-choice"]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));break;}
  case 'profiles':profiles();break;
  case 'new-profile':profileForm();break;
  case 'edit-profile':profileForm(button.dataset.profile);break;
  case 'switch-profile':try{library.setActiveProfile(button.dataset.profile);closePanel();renderMain();toast(`Olá, ${library.activeProfile().name}.`);}catch{toast('Perfil indisponível.');}break;
  case 'delete-profile':{const p=library.snapshot().profiles.find(p=>p.id===button.dataset.profile);openDialog(`${closeButton()}<section class="panel-dialog"><h1 id="dialog-title">Excluir ${esc(p?.name)}?</h1><p>A lista, as avaliações e o progresso deste perfil também serão removidos.</p><div class="form-actions"><button class="button button--red" data-action="confirm-delete-profile" data-profile="${esc(button.dataset.profile)}">Excluir perfil</button><button class="button button--outline" data-action="profiles">Cancelar</button></div></section>`);break;}
  case 'confirm-delete-profile':try{library.deleteProfile(button.dataset.profile);profiles();renderMain();toast('Perfil excluído.');}catch{toast('Mantenha pelo menos um perfil.');}break;
  case 'color':{const form=$('profile-form');form.elements.color.value=button.dataset.color;form.querySelectorAll('[data-action="color"]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));break;}
  case 'preferences':preferences();break;
  case 'save-preferences':library.setPreferences({autoplay:$('pref-autoplay').checked,muted:$('pref-muted').checked});closeDialog();toast('Preferências salvas.');checkPersistence();break;
  case 'credits':credits();break;
  case 'help':help();break;
  case 'rate':{const value=Number(button.dataset.rating);library.rate(id,library.getRating(id)===value?null:value);dialog.querySelectorAll('[data-action="rate"]').forEach(b=>b.setAttribute('aria-pressed',String(library.getRating(id)===Number(b.dataset.rating))));toast('Sua avaliação foi atualizada.');checkPersistence();break;}
 }
});
document.addEventListener('submit',event=>{
 if(event.target.id!=='profile-form')return;event.preventDefault();const form=event.target;
 try{library.saveProfile({id:form.dataset.profile||undefined,name:form.elements.name.value,color:form.elements.color.value,kids:form.elements.kids.checked,avatar:form.elements.avatar.value});profiles();renderMain();toast('Perfil salvo.');checkPersistence();}catch(error){$('profile-error').textContent=error instanceof RangeError?'Use um nome entre 1 e 24 caracteres e mantenha até 5 perfis.':'Confira os dados do perfil.';}
});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();$('main').focus({preventScroll:true});$('main').scrollIntoView({block:'start',behavior:'instant'});});
$('search-toggle').innerHTML=icon('search');$('search-toggle').addEventListener('click',()=>{route('search');requestAnimationFrame(()=>$('global-search').focus());});
$('profile-toggle').addEventListener('click',()=>openPanel('profiles'));$('notices-toggle').addEventListener('click',()=>openPanel('notices'));
$('global-search').addEventListener('input',event=>{const r=getRoute();route('search',{q:event.target.value,genre:r.params.get('genre')||''},true);});
$('local-video-file').addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';playLocalFile(file);});
document.addEventListener('change',event=>{if(event.target.id==='genre-filter'){const r=getRoute();route(r.view,{genre:event.target.value,q:r.params.get('q')||''});}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&currentPanel){closePanel();$('profile-toggle').focus();}});
window.addEventListener('hashchange',()=>{closePanel();renderMain();window.scrollTo({top:0,behavior:'instant'});if(getRoute().view==='search')$('global-search').focus({preventScroll:true});});
window.addEventListener('scroll',()=>{const r=getRoute();$('header').classList.toggle('scrolled',scrollY>24||r.view!=='home'||r.params.has('genre'));},{passive:true});
if(viewerIsAdmin)$('admin-footer').innerHTML='<a href="admin.html">Administrar catálogo</a>';
const mobileNames={home:['home','Início'],search:['search','Buscar'],list:['list','Minha lista'],me:['heart','Minha Streamlab']};
document.querySelectorAll('[data-mobile]').forEach(a=>{const [i,label]=mobileNames[a.dataset.mobile];a.innerHTML=icon(i)+`<span>${label}</span>`;});
renderMain();

let cloudFingerprint=null,cloudLoading=false;
async function refreshCloudCatalog(){
 if(!cloud.ready||cloudLoading)return;cloudLoading=true;
 try{
  const rows=await cloud.publishedMovies();
  const fingerprint=JSON.stringify(rows.map(m=>[m.id,m.updated_at,m.video,m.image]));
  if(fingerprint!==cloudFingerprint){
   const first=cloudFingerprint===null;const previous=new Set(catalog.map(m=>m.id));
   const movies=replaceCloudMovies(rows.map(m=>({...m,publishedOnline:true})));
   library.setCatalogIds(catalog.map(m=>m.id));cloudFingerprint=fingerprint;
   const focused=document.activeElement;const selection=focused?.id==='global-search'?[focused.selectionStart,focused.selectionEnd]:null;
   if(!dialog.open)renderMain();else updateHeader();
   if(selection){$('global-search').focus({preventScroll:true});$('global-search').setSelectionRange(...selection);}
   const added=movies.filter(m=>!previous.has(m.id)&&(!library.activeProfile().kids||m.age<=10));
   if(!first&&added.length)toast(`${added.length===1?'Novo vídeo disponível':'Novos vídeos disponíveis'}: ${added.map(m=>m.title).join(', ')}`);
  }
 }catch{ /* Preserve the last usable catalogue; the admin shows actionable errors. */ }finally{cloudLoading=false;}
}
if(cloud.ready){
 void refreshCloudCatalog();
 const stop=cloud.subscribe(()=>void refreshCloudCatalog());
 const timer=setInterval(()=>{if(!document.hidden)void refreshCloudCatalog();},10000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshCloudCatalog();});
 window.addEventListener('pagehide',()=>{clearInterval(timer);stop();},{once:true});
}
