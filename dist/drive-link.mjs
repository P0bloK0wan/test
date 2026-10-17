/** Normalize a shared Drive FILE link. Never accept arbitrary iframe URLs. */
export function parseGoogleDriveLink(value) {
  const invalid=()=>new TypeError('Cole o link de um arquivo de vídeo do Google Drive, como https://drive.google.com/file/d/ID/view. Links de pastas não são aceitos.');
  if(typeof value!=='string'||value.length>2048||/[\u0000-\u001f\u007f]/.test(value))throw invalid();
  let url;try{url=new URL(value.trim());}catch{throw invalid();}
  if(url.protocol!=='https:'||url.hostname!=='drive.google.com'||url.port||url.username||url.password)throw invalid();
  const match=url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{10,200})(?:\/(?:view|preview))?\/?$/);
  const queryLink=/^\/(?:open|uc|download)\/?$/.test(url.pathname);
  if(url.searchParams.getAll('id').length>1||url.searchParams.getAll('resourcekey').length>1)throw invalid();
  const fileId=match?.[1]||(queryLink?url.searchParams.get('id'):null);
  const resourceKey=url.searchParams.get('resourcekey');
  if(!fileId||!/^[-A-Za-z0-9_]{10,200}$/.test(fileId)||resourceKey!==null&&!/^[-A-Za-z0-9_]{1,200}$/.test(resourceKey))throw invalid();
  const suffix=resourceKey?`?resourcekey=${resourceKey}`:'';
  const base=`https://drive.google.com/file/d/${fileId}`;
  return Object.freeze({fileId,resourceKey,shareUrl:`${base}/view${suffix}`,embedUrl:`${base}/preview${suffix}`});
}
