import {build} from 'esbuild';
import {readFile,appendFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
const result=await build({entryPoints:['src/cloud-client.mjs'],outfile:'dist/cloud-client.mjs',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,metafile:true,legalComments:'linked',external:['./cloud-config.mjs'],plugins:[{name:'public-config',setup(b){b.onResolve({filter:/cloud-config\.mjs$/},()=>({path:'./cloud-config.mjs',external:true}));}}]});
const roots=new Set();
for(const input of Object.keys(result.metafile.inputs)){
 if(!input.includes('node_modules/'))continue;
 let root=dirname(resolve(input));
 while(root!==dirname(root)){
  try{const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));if(pkg.name){roots.add(root);break;}}catch{}
  root=dirname(root);
 }
}
for(const root of [...roots].sort()){
 const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
 for(const name of ['LICENSE','LICENSE.md','LICENSE.txt','LICENSE-MIT']){
  try{const license=await readFile(join(root,name),'utf8');await appendFile('dist/cloud-client.mjs.LEGAL.txt',`\n\n${pkg.name}@${pkg.version}\n${license}`);break;}catch{}
 }
}
