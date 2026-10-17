const KEY='streamlab.account-intent.v1';
export function rememberAccountIntent(storage,{action='browse',id=null,hash='#/home'}={}){
 const value={action:['browse','save'].includes(action)?action:'browse',id:typeof id==='string'&&/^[A-Za-z0-9_-]{1,256}$/.test(id)?id:null,hash:/^#\/(?:home|films|animation|new|list|search|me)(?:\?[^#]*)?$/.test(hash)&&hash.length<1500?hash:'#/home',createdAt:Date.now()};
 try{storage?.setItem(KEY,JSON.stringify(value));}catch{}
}
export function takeAccountIntent(storage,{consume=true}={}){
 try{const raw=storage?.getItem(KEY);if(consume)storage?.removeItem(KEY);const value=JSON.parse(raw||'null');if(!value||!Number.isFinite(value.createdAt)||Date.now()-value.createdAt<0||Date.now()-value.createdAt>30*60*1000)return null;
 if(!['browse','save'].includes(value.action)||!/^#\/(?:home|films|animation|new|list|search|me)(?:\?[^#]*)?$/.test(value.hash)||value.hash.length>=1500)return null;
 if(value.action==='save'&&(typeof value.id!=='string'||!/^[A-Za-z0-9_-]{1,256}$/.test(value.id)))return null;return value;}catch{return null;}
}
