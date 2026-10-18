import os from 'node:os';
import path from 'node:path';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createApp} from '../server/app.mjs';

const projectDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// moduleOptions injeta falsos nos módulos das etapas (ex.: WhatsApp sem rede); VITRAYA_DIST aponta o build de cada etapa.
export async function isolatedServer(port=0,{shopeeOptions={},moduleOptions={}}={}){
 const tempRoot=path.resolve(os.tmpdir());
 const dataDir=await mkdtemp(path.join(tempRoot,'vitraya-e2e-'));
 if(!path.resolve(dataDir).startsWith(tempRoot+path.sep)||!path.basename(dataDir).startsWith('vitraya-e2e-'))throw new Error('Pasta temporária inesperada.');
 const options={dataDir,staticDir:path.join(projectDir,process.env.VITRAYA_DIST||'dist'),queueIntervalMs:0,connectorOptions:{env:{}},shopeeOptions:{env:{},...shopeeOptions},moduleOptions};
 let app=createApp(options);
 let address=await app.start(port);
 return {
  get url(){return address.url;},
  async restart(){const previousPort=address.port;await app.close();app=createApp(options);address=await app.start(previousPort);},
  async close(){await app.close();await rm(dataDir,{recursive:true,force:true});},
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const instance=await isolatedServer(Number(process.env.VITRAYA_E2E_PORT??4320));
 console.log(`Servidor E2E isolado: ${instance.url}; somente dados temporários.`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>instance.close().then(()=>process.exit(0),()=>process.exit(1)));
}
