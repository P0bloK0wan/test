import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEpisodeMetadata as normalize,seriesEpisodes,episodeSeasons} from '../dist/episodes.mjs';
const ep=(id,season,episode,extra={})=>({id,series_title:'Uma Série',season,episode,age:10,status:'published',...extra});
test('episode metadata is optional, normalized and bounded without inventing missing numbers or titles',()=>{
 assert.deepEqual(normalize({}),{series_title:null,season:null,episode:null,episode_title:null});
 assert.deepEqual(normalize({series_title:'  Uma  Série ',season:1,episode:2}),{series_title:'Uma Série',season:1,episode:2,episode_title:null});
 for(const extra of [{season:0},{episode:-1},{season:'1'},{episode:NaN},{series_title:'x\n<script>'},{series_title:'x'.repeat(161)}])assert.equal(normalize(ep('a',1,1,extra)).series_title,null);
});
test('groups published episodes only and sorts seasons and episode numbers numerically',()=>{
 const current=ep('a',1,2);const rows=[ep('c',2,1),ep('b',1,10),current,ep('d',1,1),ep('draft',1,3,{status:'draft'}),ep('other',1,1,{series_title:'Outra Série'}),ep('invalid',1,null)];
 assert.deepEqual(seriesEpisodes(rows,current).map(e=>e.id),['d','a','b','c']);assert.deepEqual(episodeSeasons(seriesEpisodes(rows,current)),[1,2]);
 assert.deepEqual(seriesEpisodes(rows,{title:'Movie'}),[]);
});
test('series identity tolerates casing and whitespace, child profiles hide adult episodes and IDs deduplicate',()=>{
 const current=ep('a',1,1);const rows=[current,ep('b',1,2,{series_title:'  UMA   SÉRIE ',age:16}),ep('c',1,3,{age:0}),current,ep('d',1,4,{status:undefined,publishedOnline:true})];
 assert.deepEqual(seriesEpisodes(rows,current,{kids:true}).map(e=>e.id),['a','c','d']);assert.equal(seriesEpisodes(rows,current).length,4);
});

test('series names preserve ordinary letters and normalize spaces while rejecting control characters',()=>{
 assert.equal(normalize({series_title:'  Kusuriya   no Hitorigoto  ',season:1,episode:1}).series_title,'Kusuriya no Hitorigoto');
 assert.equal(normalize({series_title:'Invalid\u0001title',season:1,episode:1}).series_title,null);
 assert.equal(normalize({series_title:'Series',season:101,episode:1}).series_title,null);
 assert.equal(normalize({series_title:'Series',season:1,episode:10001}).series_title,null);
});
