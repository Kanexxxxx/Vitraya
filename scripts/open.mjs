import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const address='http://127.0.0.1:4317';
async function healthy(){try{const response=await fetch(address+'/api/health',{signal:AbortSignal.timeout(800)});return (await response.json()).app==='Vitraya Studio';}catch{return false;}}
function browser(){const c=process.platform==='win32'?spawn('cmd.exe',['/c','start','',address],{windowsHide:true,stdio:'ignore'}):spawn(process.platform==='darwin'?'open':'xdg-open',[address],{stdio:'ignore'});c.on('error',()=>console.log('Abra no navegador: '+address));c.unref();}
if(await healthy()){browser();console.log('Vitraya Studio já está aberto em '+address);}else{
 const server=spawn(process.execPath,['server/index.mjs'],{cwd:root,stdio:'inherit'});
 server.on('exit',code=>{process.exitCode=code||0;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill());
 for(let attempt=0;attempt<30;attempt++){if(await healthy()){browser();console.log('Mantenha esta janela aberta durante o uso. Ctrl+C encerra o servidor.');break;}await new Promise(resolve=>setTimeout(resolve,200));}
}
