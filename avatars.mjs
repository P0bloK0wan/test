// Original Streamlab illustrations. IDs, never arbitrary markup, are persisted.
const drawing = (body,background) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" aria-hidden="true"><rect width="80" height="80" rx="12" fill="${background}"/>${body}</svg>`;
const eyes='<circle cx="29" cy="38" r="3" fill="#172037"/><circle cx="51" cy="38" r="3" fill="#172037"/>';
export const AVATARS=Object.freeze([
 {id:'classic',name:'Sorriso clássico',category:'Clássicos',svg:null},
 {id:'fox',name:'Raposa Aurora',category:'Companheiros',svg:drawing('<path d="M15 17 32 27 48 27 65 17 61 54 40 68 19 54Z" fill="#f4a66a"/><path d="M20 43 40 53 60 43 51 61 40 68 29 61Z" fill="#fff0d4"/>'+eyes+'<path d="m35 50 5 6 5-6Z" fill="#172037"/>','#373252')},
 {id:'cat',name:'Gato Eclipse',category:'Companheiros',svg:drawing('<path d="M17 18 34 28 46 28 63 18 64 51Q62 68 40 68T16 51Z" fill="#b8b6ee"/>'+eyes+'<path d="m36 49 4 4 4-4M40 53v6m-21-9-10-3m52 3 10-3" stroke="#172037" stroke-width="3" fill="none"/>','#233e50')},
 {id:'owl',name:'Coruja Lume',category:'Companheiros',svg:drawing('<path d="M17 19 31 27 49 27 63 19v32Q60 68 40 68T17 51Z" fill="#eccb83"/><circle cx="29" cy="40" r="11" fill="#fff4d5"/><circle cx="51" cy="40" r="11" fill="#fff4d5"/>'+eyes+'<path d="m35 51 5 8 5-8Z" fill="#9c5a3b"/>','#32544b')},
 {id:'orbit',name:'Órbita Azul',category:'Universo',svg:drawing('<circle cx="40" cy="40" r="21" fill="#81d8e5"/><ellipse cx="40" cy="43" rx="34" ry="10" transform="rotate(-24 40 43)" fill="none" stroke="#fff0bc" stroke-width="5"/><circle cx="62" cy="16" r="3" fill="#fff0bc"/>','#24314d')},
 {id:'comet',name:'Cometa Coral',category:'Universo',svg:drawing('<path d="m15 16 43 20-8 21Z" fill="#fa887e"/><path d="m27 13 32 25-8 8Z" fill="#ffc984"/><circle cx="51" cy="50" r="17" fill="#ffe2b6"/><circle cx="56" cy="47" r="3" fill="#bc6d79"/>','#503752')},
 {id:'moon',name:'Lua Serena',category:'Universo',svg:drawing('<path d="M51 14A27 27 0 1 0 65 56 26 26 0 0 1 51 14" fill="#f0e4be"/><path d="m59 20 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#94ddda"/>','#28354c')},
 {id:'peak',name:'Horizonte',category:'Formas e paisagens',svg:drawing('<circle cx="56" cy="23" r="10" fill="#f6d68c"/><path d="m3 69 28-46 21 35 9-15 19 26Z" fill="#8dc5b4"/><path d="m19 44 12-21 12 20-12-6Z" fill="#e6f0da"/>','#344c65')},
 {id:'bloom',name:'Flor Solar',category:'Formas e paisagens',svg:drawing('<g fill="#e9a7bc"><ellipse cx="40" cy="27" rx="11" ry="18"/><ellipse cx="40" cy="53" rx="11" ry="18"/><ellipse cx="27" cy="40" rx="18" ry="11"/><ellipse cx="53" cy="40" rx="18" ry="11"/></g><circle cx="40" cy="40" r="12" fill="#ffe1a0"/>','#334c4a')}
].map(Object.freeze));
export const validAvatar=id=>AVATARS.some(item=>item.id===id);
export const avatarArt=id=>AVATARS.find(item=>item.id===id)?.svg||'';
