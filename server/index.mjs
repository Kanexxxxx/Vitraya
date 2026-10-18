import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { startServer } from './app.mjs';

const projectDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT??4317);
if(!Number.isInteger(port)||port<0||port>65535)throw new Error('PORT inválida.');
const defaultDataDir=process.platform==='win32'?path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'AppData','Local'),'VitrayaStudio','data'):path.join(os.homedir(),'.local','share','VitrayaStudio','data');
const app=await startServer({port,dataDir:process.env.VITRAYA_DATA_DIR??defaultDataDir,staticDir:path.join(projectDir,'dist')});
console.log(`Vitraya Studio disponível em ${app.url}`);
console.log(`Dados locais em ${app.dataDir}`);
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{app.close().then(()=>process.exit(0)).catch(()=>process.exit(1));});
