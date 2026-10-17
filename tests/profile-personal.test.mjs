import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibrary} from '../dist/library.mjs';
import {AVATARS,validAvatar,avatarArt} from '../dist/avatars.mjs';
const key='netflix-web.library.v1';
const disk=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test('original avatar identifiers persist per profile and unknown persisted identifiers safely fall back',()=>{
 const storage=disk(),lib=createLibrary(storage);
 lib.saveProfile({id:'default',name:'Você',color:'red',avatar:'fox'});
 const second=lib.saveProfile({name:'Lua',color:'blue',avatar:'moon'});
 assert.equal(createLibrary(storage).activeProfile().avatar,'fox');
 lib.setActiveProfile(second.id);assert.equal(lib.activeProfile().avatar,'moon');
 const before=lib.snapshot();assert.throws(()=>lib.saveProfile({id:second.id,name:'Lua',color:'blue',avatar:'<script>'}));assert.deepEqual(lib.snapshot(),before);
 const input=JSON.parse(storage.getItem(key));input.profiles[0].avatar='https://evil.test/avatar';storage.setItem(key,JSON.stringify(input));
 const reload=createLibrary(storage);reload.setActiveProfile('default');assert.equal(reload.activeProfile().avatar,'classic');
});
test('legacy profile colors survive avatar migration and edits preserve a chosen avatar',()=>{
 const storage=disk();storage.setItem(key,JSON.stringify({version:1,activeProfileId:'legacy',profiles:[{id:'legacy',name:'Antigo',color:'teal',kids:false}]}));
 const lib=createLibrary(storage);assert.equal(lib.activeProfile().avatar,'classic');assert.equal(lib.activeProfile().color,'teal');
 lib.saveProfile({id:'legacy',name:'Antigo',color:'gold',avatar:'orbit'});lib.saveProfile({id:'legacy',name:'Atual',color:'gold'});assert.equal(lib.activeProfile().avatar,'orbit');
});
test('liked titles include positive ratings only and are isolated by profile',()=>{
 const lib=createLibrary(disk());lib.rate('sintel',1);lib.rate('spring',2);lib.rate('charge',-1);assert.deepEqual(lib.likedIds(),['sintel','spring']);
 lib.rate('sintel',null);assert.deepEqual(lib.likedIds(),['spring']);const other=lib.saveProfile({name:'Outro',color:'red'});lib.setActiveProfile(other.id);assert.deepEqual(lib.likedIds(),[]);
});
test('avatar catalog has unique accessible names, categories and only trusted original SVG illustrations',()=>{
 assert.equal(new Set(AVATARS.map(a=>a.id)).size,AVATARS.length);for(const entry of AVATARS){assert.ok(entry.name&&entry.category);assert.equal(validAvatar(entry.id),true);assert.doesNotMatch(avatarArt(entry.id),/<script|onload=|(?:href|src)=/i);}assert.equal(avatarArt('unknown'),'');
});
