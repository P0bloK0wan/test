import {normalizeEpisodeMetadata} from './episodes.mjs';
import {myVideos} from './my-videos.mjs';

// Original catalogue text. Film artwork/films credited to Blender Studio/Foundation.
const entries = [
 ['sintel','Sintel',2010,15,10,['Fantasia','Aventura','Animação'],'animation','Colin Levy','Uma jovem atravessa terras desconhecidas em busca de um pequeno dragão. Uma amizade improvável transforma uma viagem em uma história inesquecível.','Uma jornada. Uma amizade. Um destino.'],
 ['big-buck-bunny','Big Buck Bunny',2008,10,0,['Comédia','Animação','Aventura'],'animation','Sacha Goedegebure','Um gigante de bom coração só queria um dia tranquilo na floresta. Mas três pequenos encrenqueiros têm outros planos.','Pequenos problemas. Um grande coelho.'],
 ['tears-of-steel','Tears of Steel',2012,12,12,['Ficção científica','Ação'],'live-action','Ian Hubert','Em uma Amsterdã do futuro, humanos e robôs precisam revisitar o passado para impedir uma catástrofe.','O futuro depende de uma lembrança.'],
 ['spring','Spring',2019,8,0,['Fantasia','Animação','Aventura'],'animation','Andy Goralczyk','Uma jovem pastora e seu cão despertam forças antigas para trazer de volta uma nova estação. Uma aventura sem palavras, cheia de descobertas.','Toda mudança começa com coragem.'],
 ['charge','Charge',2022,4,12,['Ficção científica','Ação','Animação'],'animation','Hjalti Hjálmarsson','Em um mundo sem energia, um homem invade uma fábrica de baterias e encontra um obstáculo que não estava em seus planos.','O último recurso. A última chance.'],
 ['sprite-fright','Sprite Fright',2021,13,16,['Terror','Comédia','Animação'],'animation','Matthew Luhn','Uma excursão por uma floresta isolada sai do controle quando seus pequenos habitantes decidem que já foram longe demais.','A natureza também sabe se defender.'],
 ['agent-327','Agent 327: Operation Barbershop',2017,4,10,['Ação','Comédia','Animação'],'animation','Hjalti Hjálmarsson e Colin Levy','Um agente secreto investiga uma barbearia suspeita. O corte de cabelo é só o começo dos seus problemas.','Nada é o que parece. Nem o barbeiro.'],
 ['cosmos-laundromat','Cosmos Laundromat',2015,12,12,['Fantasia','Comédia','Animação'],'animation','Mathieu Auvray','Em uma ilha deserta, um encontro inesperado oferece uma nova perspectiva a um personagem que já havia perdido a esperança.','Uma vida pode mudar em um instante.'],
 ['elephants-dream','Elephants Dream',2006,11,10,['Ficção científica','Fantasia','Animação'],'animation','Bassam Kurdali','Dois personagens percorrem um universo mecânico em que imaginação e realidade se confundem a cada nova porta.','Entre o que existe e o que imaginamos.'],
 ['wing-it','Wing It!',2023,4,0,['Comédia','Aventura','Animação'],'animation','Rik Schutte','Um engenheiro metódico e uma aspirante a piloto acabam juntos em uma nave fora de controle. Improvisar nunca foi tão necessário.','A melhor rota é a que você inventa.'],
 ['caminandes-3','Caminandes 3: Llamigos',2016,3,0,['Comédia','Aventura','Animação'],'animation','Pablo Vazquez','No inverno da Patagônia, uma lhama descobre que conseguir sua fruta favorita pode ser uma aventura a dois.','Às vezes, dividir é a melhor aventura.'],
];
const youtube = {'sintel':'eRsGyueVLvQ','big-buck-bunny':'aqz-KE-bpKQ','tears-of-steel':'R6MlUcmOul8','spring':'WhWc3b3KhnY','charge':'UXqq0ZvbOnk','sprite-fright':'_cMxraX_5RE','agent-327':'mN0zPOpADL4','cosmos-laundromat':'Y-rmzh0PI3c','elephants-dream':'TLkA0RELQ1g','wing-it':'u9lj-c29dxI','caminandes-3':'SkVqJ1SGeL0'};
const openMovies = entries.map(([id,title,year,minutes,age,genres,kind,director,synopsis,tagline]) => Object.freeze({id,title,year,minutes,age,genres:Object.freeze(genres),kind,director,synopsis,tagline,image:`assets/${id}.webp`,hero:id==='sintel'?'assets/sintel-hero.png':`assets/${id}.webp`,youtubeId:youtube[id],trailer:['sintel','big-buck-bunny'].includes(id)?`assets/media/${id}-trailer.mp4`:null,source:`https://studio.blender.org/projects/${id}/`,credit:'Blender Foundation / Blender Studio'}));
// Only relative media paths or public HTTP(S) URLs are accepted; no script/data/file URLs.
function mediaPath(value){
 if(typeof value!=='string'||!value.trim())return null;
 const path=value.trim();
 if(path.startsWith('//')||path.includes('\\')||/[\u0000-\u001f]/.test(path))return null;
 try{const url=new URL(path,'https://catalog.invalid/');if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;return path;}catch{return null;}
}
const usedIds=new Set(openMovies.map(movie=>movie.id));
const ownMovies=[];
for(const entry of Array.isArray(myVideos)?myVideos:[]){
 const video=mediaPath(entry?.video),id=entry?.id;
 if(!video||typeof id!=='string'||!/^[-a-z0-9]+$/.test(id)||usedIds.has(id)||!entry.title)continue;
 usedIds.add(id);
 const image=mediaPath(entry.image)||'assets/own-video.svg';
 ownMovies.push(Object.freeze({id,title:String(entry.title),video,image,hero:mediaPath(entry.hero)||image,year:Number(entry.year)||new Date().getFullYear(),minutes:Math.max(1,Number(entry.minutes)||1),age:[0,10,12,14,16,18].includes(entry.age)?entry.age:18,genres:Object.freeze(Array.isArray(entry.genres)&&entry.genres.length?entry.genres.map(String):['Meus vídeos']),kind:entry.kind==='animation'?'animation':'live-action',director:String(entry.director||'Produção própria'),synopsis:String(entry.synopsis||'Vídeo adicionado pelo responsável deste catálogo.'),tagline:String(entry.tagline||'Seu cinema, suas histórias.'),credit:String(entry.credit||'Conteúdo fornecido pelo responsável do site'),source:mediaPath(entry.source)||video,trailer:null}));
}
const baseCatalog=Object.freeze([...openMovies,...ownMovies]);
export let catalog=baseCatalog;
export function replaceCloudMovies(rows){
 const baseIds=new Set(baseCatalog.map(m=>m.id));
 const movies=rows.filter(m=>typeof m.id==='string'&&/^[-a-z0-9]+$/.test(m.id)&&!baseIds.has(m.id)&&mediaPath(m.video)).map(m=>Object.freeze({...m,...normalizeEpisodeMetadata(m),genres:Object.freeze(Array.isArray(m.genres)?m.genres.map(String):['Meus vídeos']),hero:mediaPath(m.image)||'assets/own-video.svg',image:mediaPath(m.image)||'assets/own-video.svg',video:mediaPath(m.video),trailer:null,tagline:'Uma nova história no catálogo.',credit:String(m.credit||'Produção própria')}));
 catalog=Object.freeze([...baseCatalog,...movies]);
 genres=Object.freeze([...new Set(catalog.flatMap(m=>m.genres))]);
 return movies;
}
export let genres = Object.freeze([...new Set(['Ação','Animação','Aventura','Comédia','Fantasia','Ficção científica','Terror',...ownMovies.flatMap(movie=>movie.genres)])]);
export const findMovie = id => catalog.find(movie=>movie.id===id);
