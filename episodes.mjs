// Episode metadata is optional. Incomplete metadata keeps the existing movie flow.
export function normalizeEpisodeMetadata(value){
 const text=(input,max)=>typeof input==='string'&&input.trim()&&input.trim().length<=max&&!/[\u0000-\u001f\u007f]/.test(input)?input.trim().replace(/\s+/g,' '):null;
 const series_title=text(value?.series_title,160);
 const season=value?.season,episode=value?.episode;
 if(!series_title||!Number.isSafeInteger(season)||season<1||season>100||!Number.isSafeInteger(episode)||episode<1||episode>10000)return {series_title:null,season:null,episode:null,episode_title:null};
 return {series_title,season,episode,episode_title:text(value.episode_title,160)};
}
export function seriesKey(title){return typeof title==='string'?title.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR'):'';}
export function seriesEpisodes(catalog,current,{kids=false}={}){
 const metadata=normalizeEpisodeMetadata(current);if(!metadata.series_title)return [];
 const key=seriesKey(metadata.series_title),seen=new Set();
 return catalog.filter(item=>{
  const entry=normalizeEpisodeMetadata(item);
  if(!entry.series_title||seriesKey(entry.series_title)!==key||!(item.status==='published'||item.status==null&&item.publishedOnline===true)||kids&&!(typeof item.age==='number'&&item.age<=10)||typeof item.id!=='string'||seen.has(item.id))return false;
  seen.add(item.id);return true;
 }).sort((a,b)=>a.season-b.season||a.episode-b.episode||a.id.localeCompare(b.id));
}
export const episodeSeasons=episodes=>[...new Set(episodes.map(item=>item.season))].sort((a,b)=>a-b);
