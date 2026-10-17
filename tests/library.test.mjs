import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibrary } from '../dist/library.mjs';
import { normalizeSearch, filterCatalog } from '../dist/catalog-query.mjs';
const KEY = 'netflix-web.library.v1';
const storage = () => { const values = new Map(); return {getItem:k=>values.get(k) ?? null,setItem:(k,v)=>values.set(k,v)}; };

test('library persists all profile-specific actions and active profile across reloads', () => {
  assert.equal(typeof createLibrary,'function');
  const disk=storage(), lib=createLibrary(disk,{catalogIds:['a','b']});
  assert.deepEqual(lib.activeProfile(),{id:'default',name:'Você',color:'red',kids:false});
  assert.equal(lib.toggleSaved('a'),true); lib.rate('a',2); lib.recordProgress('a',20,100);
  lib.setPreferences({autoplay:false,muted:false}); lib.markNoticesRead(['new']);
  const other=lib.saveProfile({name:'  Ana  ',color:'teal',kids:true});
  lib.setActiveProfile(other.id);
  assert.deepEqual(lib.savedIds(),[]); assert.equal(lib.getRating('a'),null);
  assert.equal(lib.progress('a'),null); assert.deepEqual(lib.unreadNotices(['new']),['new']);
  lib.toggleSaved('b');
  const reload=createLibrary(disk,{catalogIds:['a','b']});
  assert.equal(reload.activeProfile().id,other.id); assert.deepEqual(reload.savedIds(),['b']);
  reload.setActiveProfile('default');
  assert.deepEqual(reload.savedIds(),['a']); assert.equal(reload.getRating('a'),2);
  assert.equal(reload.progress('a').seconds,20);
  assert.deepEqual(reload.preferences(),{autoplay:false,muted:false});
  assert.deepEqual(reload.unreadNotices(['new','next']),['next']);
});

test('validates before mutation and enforces profile limits and safe deletion', () => {
  const lib=createLibrary(storage(),{catalogIds:['a']});
  const before=lib.snapshot();
  for(const action of [()=>lib.toggleSaved('unknown'),()=>lib.rate('a',3),()=>lib.recordProgress('a',NaN,100),()=>lib.saveProfile({name:' ',color:'red'}),()=>lib.saveProfile({name:'A',color:'pink'}),()=>lib.setPreferences({muted:'yes'}),()=>lib.deleteProfile('default'),()=>lib.setActiveProfile('absent')]) assert.throws(action);
  assert.deepEqual(lib.snapshot(),before);
  for(let i=0;i<4;i++)lib.saveProfile({name:`P${i}`,color:'blue'});
  assert.throws(()=>lib.saveProfile({name:'Six',color:'red'}),RangeError);
  lib.deleteProfile('default'); assert.notEqual(lib.activeProfile().id,'default');
  const id=lib.activeProfile().id; lib.saveProfile({id,name:'Updated',color:'gold',kids:false});
  assert.equal(lib.activeProfile().name,'Updated');
});

test('copies cannot mutate state and arbitrary IDs cannot pollute prototypes', () => {
  const lib=createLibrary(storage());
  lib.toggleSaved('__proto__');lib.rate('constructor',1);lib.recordProgress('__proto__',5,100);
  assert.equal(lib.isSaved('__proto__'),true);assert.equal(lib.getRating('constructor'),1);
  const snap=lib.snapshot();snap.profiles[0].name='wrong';snap.profiles[0].savedIds.length=0;
  lib.activeProfile().name='wrong';lib.progress('__proto__').seconds=88;
  assert.equal(lib.activeProfile().name,'Você');assert.equal(lib.progress('__proto__').seconds,5);
  assert.equal(lib.isSaved('__proto__'),true);assert.equal({}.polluted,undefined);
  lib.rate('constructor',null);assert.equal(lib.getRating('constructor'),null);
});

test('progress clamps, orders by recency and removes completed movies', () => {
  const lib=createLibrary(storage());
  lib.recordProgress('a',5,100);lib.recordProgress('b',10,100);
  assert.deepEqual(lib.continueWatching(),['b','a']);
  lib.recordProgress('a',95,100);assert.deepEqual(lib.continueWatching(),['b']);
  lib.recordProgress('b',500,100);assert.equal(lib.progress('b').seconds,100);
  const before=lib.snapshot();lib.recordProgress('b',10,0);assert.deepEqual(lib.snapshot(),before);
  lib.recordProgress('c',-2,100);assert.equal(lib.progress('c').seconds,0);
});

test('invalid persistence is sanitized and storage failures preserve usable memory', () => {
  const disk=storage();disk.setItem(KEY,'{"version":900,"profiles":[]}');
  assert.equal(createLibrary(disk).activeProfile().id,'default');
  disk.setItem(KEY,'not json');assert.equal(createLibrary(disk).activeProfile().name,'Você');
  disk.setItem(KEY,JSON.stringify({version:1,activeProfileId:'bad',profiles:[{id:'one',name:'  One ',color:'blue',kids:false,savedIds:['valid','invalid','valid'],ratings:{valid:2,invalid:1},progress:{valid:{seconds:999,duration:100,updatedAt:1}},preferences:{autoplay:false,muted:'bad'},readNotices:['x',3]},{id:'bad',name:'',color:'red'}]}));
  const clean=createLibrary(disk,{catalogIds:['valid']});
  assert.equal(clean.activeProfile().id,'one');assert.deepEqual(clean.savedIds(),['valid']);
  assert.equal(clean.progress('valid').seconds,100);assert.deepEqual(clean.continueWatching(),[]);
  const fail=createLibrary({getItem(){throw Error('blocked')},setItem(){throw Error('quota')}});
  assert.equal(fail.toggleSaved('a'),true);assert.deepEqual(fail.savedIds(),['a']);assert.equal(typeof fail.lastError(),'string');
});

test('query combines accent-insensitive fields, genre, kind, saved and kids restrictions', () => {
  assert.equal(typeof filterCatalog,'function');
  assert.equal(normalizeSearch('  AÇÃO  '),'acao');
  const catalog=[{id:'a',title:'Coração',genres:['Ação'],synopsis:'Uma viagem',director:'José',kind:'animation',age:10},{id:'b',title:'Drama',genres:['Drama'],synopsis:'Coração adulto',director:'Lu',kind:'live-action',age:16}];
  assert.deepEqual(filterCatalog(catalog,{query:'coracao'}).map(x=>x.id),['a','b']);
  assert.deepEqual(filterCatalog(catalog,{query:'jose',genre:'acao',kind:'animation',savedIds:['a'],kids:true}).map(x=>x.id),['a']);
  assert.deepEqual(filterCatalog(catalog,{genre:'aç'}),[]);
  assert.deepEqual(filterCatalog(catalog,{savedIds:[]}),[]);
  assert.deepEqual(filterCatalog(catalog,{kids:true}).map(x=>x.id),['a']);
  assert.equal(catalog.length,2);
});
