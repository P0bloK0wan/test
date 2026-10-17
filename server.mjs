import http from 'node:http';
import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('./dist/',import.meta.url)));
const inside=p=>p===root||p.startsWith(root+path.sep);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.json':'application/json; charset=utf-8','.vtt':'text/vtt; charset=utf-8'};
export async function startServer(port=0){
 const server=http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  try{
   const url=new URL(req.url,'http://127.0.0.1');const pathname=decodeURIComponent(url.pathname);
   let requested=path.resolve(root,'.'+pathname);
   if(!inside(requested)){res.writeHead(403);res.end('Forbidden');return;}
   if(pathname.endsWith('/'))requested=path.join(requested,'index.html');
   const resolved=await realpath(requested);if(!inside(resolved)){res.writeHead(403);res.end('Forbidden');return;}
   const info=await stat(resolved);if(!info.isFile()){res.writeHead(404);res.end('Not found');return;}
   let start=0,end=info.size-1,status=200;
   const headers={'Content-Type':types[path.extname(resolved)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
   if(req.headers.range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
    if(!match[1]){const suffix=Number(match[2]);start=Math.max(0,info.size-suffix);}else start=Number(match[1]);
    if(match[1]&&match[2])end=Math.min(end,Number(match[2]));
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
   }
   headers['Content-Length']=String(Math.max(0,end-start+1));res.writeHead(status,headers);
   if(req.method==='HEAD'){res.end();return;}
   const stream=createReadStream(resolved,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(error){const status=error.code==='ENOENT'||error.code==='ENOTDIR'?404:error instanceof URIError?400:500;if(!res.headersSent)res.writeHead(status);res.end(status===404?'Not found':'Unable to serve request');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const server=await startServer(Number(process.env.PORT||4190));console.log(`Netflix Web: http://127.0.0.1:${server.address().port}`);}
