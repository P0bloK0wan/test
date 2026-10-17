import {createClient} from '@supabase/supabase-js';
import {Upload} from 'tus-js-client';
import {cloudConfig} from '../dist/cloud-config.mjs';
import {parseGoogleDriveLink} from '../dist/drive-link.mjs';
const ready=!!(cloudConfig.url&&cloudConfig.publishableKey);
const client=ready?createClient(cloudConfig.url,cloudConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const bucket='cinema-media';
const maxVideoBytes=cloudConfig.maxVideoBytes||50*1024*1024;
const signed=new Map();
function requireClient(){if(!client)throw new Error('O armazenamento online ainda não foi configurado.');return client;}
function fail(error){if(error)throw error;}
async function signedUrl(path){
 if(!path)return null;
 const cached=signed.get(path);if(cached&&cached.expires>Date.now())return cached.url;
 const {data,error}=await requireClient().storage.from(bucket).createSignedUrl(path,3600);fail(error);
 signed.set(path,{url:data.signedUrl,expires:Date.now()+45*60*1000});return data.signedUrl;
}
async function uploadVideo(file,{onProgress=()=>{},signal}={}){
 if(!file||!file.size||file.size>maxVideoBytes)throw new Error(`Escolha um MP4 de até ${Math.floor(maxVideoBytes/1024/1024)} MB.`);
 if(!/\.mp4$/i.test(file.name)||file.type&&file.type!=='video/mp4')throw new Error('Use um arquivo MP4 com vídeo H.264 e áudio AAC.');
 if(signal?.aborted)throw new DOMException('Envio cancelado','AbortError');
 const {data:{session},error}=await requireClient().auth.getSession();fail(error);
 if(!session)throw new Error('Entre novamente para enviar o vídeo.');
 const path=`video/${crypto.randomUUID()}.mp4`;
 const host=new URL(cloudConfig.url);host.hostname=host.hostname.replace('.supabase.co','.storage.supabase.co');
 await new Promise((resolve,reject)=>{
  let upload;
  const cancel=()=>{void upload.abort(true).catch(()=>{});reject(new DOMException('Envio cancelado','AbortError'));};
  const finish=(fn,value)=>{signal?.removeEventListener('abort',cancel);fn(value);};
  upload=new Upload(file,{endpoint:`${host.origin}/storage/v1/upload/resumable`,headers:{authorization:`Bearer ${session.access_token}`,apikey:cloudConfig.publishableKey},metadata:{bucketName:bucket,objectName:path,contentType:'video/mp4',cacheControl:'3600'},chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,retryDelays:[0,1000,3000,5000],onProgress:(a,b)=>onProgress({percent:b?Math.round(a/b*100):0,bytesUploaded:a,bytesTotal:b}),onError:()=>finish(reject,new Error('Falha ao enviar o vídeo. Confira a conexão e tente novamente.')),onSuccess:()=>finish(resolve)});
  signal?.addEventListener('abort',cancel,{once:true});upload.start();
 });
 return {path,url:null};
}
async function uploadCover(file){
 if(!file||!file.size||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use uma capa JPG, PNG ou WebP de até 5 MB.');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type],path=`cover/${crypto.randomUUID()}.${ext}`;
 const {error}=await requireClient().storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});fail(error);return {path,url:null};
}
async function listAdminVideos(){const {data,error}=await requireClient().from('cinema_videos').select('*').order('created_at',{ascending:false});fail(error);return data;}
async function saveVideo(payload){
 const allowed=['id','title','synopsis','age','minutes','year','genres','kind','director','credit','video_path','image_path','status','video_source','drive_url'];
 const row=Object.fromEntries(Object.entries(payload).filter(([key])=>allowed.includes(key)));
 const query=row.id?requireClient().from('cinema_videos').update(row).eq('id',row.id):requireClient().from('cinema_videos').insert(row);
 const {data,error}=await query.select().single();fail(error);return data;
}
async function setPublished(id,published){const {error}=await requireClient().from('cinema_videos').update({status:published?'published':'draft'}).eq('id',id);fail(error);}
async function deleteVideo(id){
 const {data,error}=await requireClient().from('cinema_videos').select('video_path,image_path').eq('id',id).single();fail(error);
 const {error:removeError}=await client.from('cinema_videos').delete().eq('id',id);fail(removeError);
 const paths=[data.video_path,data.image_path].filter(Boolean);if(paths.length){const {error:storageError}=await client.storage.from(bucket).remove(paths);if(storageError)throw new Error('Título removido. Alguns arquivos precisam ser removidos pelo administrador do armazenamento.');}
}
async function isAdmin(){if(!client)return false;const {data,error}=await client.rpc('cinema_admin_access');if(error)return false;return data===true;}
async function publishedMovies(){
 const {data,error}=await requireClient().from('cinema_videos').select('*').eq('status','published').order('created_at',{ascending:false});fail(error);
 return Promise.all(data.map(async row=>{
  const drive=row.video_source==='drive'?parseGoogleDriveLink(row.drive_url):null;
  const video=drive?drive.shareUrl:await signedUrl(row.video_path);
  return {...row,drive,video,image:await signedUrl(row.image_path)||'assets/own-video.svg',source:video};
 }));
}
function subscribe(onChange){
 if(!client)return ()=>{};
 const channel=client.channel('cinema-publications').on('postgres_changes',{event:'*',schema:'public',table:'cinema_videos'},onChange).subscribe();
 return ()=>{void client.removeChannel(channel);};
}
export const cloud={ready,client,maxVideoBytes,uploadVideo,uploadCover,listAdminVideos,saveVideo,setPublished,deleteVideo,isAdmin,publishedMovies,subscribe};
