import http from 'node:http';
import path from 'node:path';
import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { Store } from './store.mjs';
import { ApiError, id, now, object, text, url as validUrl, product, channel, template, settings, integrations, CAMPAIGN_STATUSES, sniffImage } from './validation.mjs';
import { previewImport, csvExport, xlsxExport } from './imports.mjs';
import { validateZipStructure } from './zip.mjs';
import { MB,FILE_LIMIT,BACKUP_LIMITS } from './limits.mjs';
import { Connectors, restrictPrivate, requestGateway } from './connectors.mjs';
import { modules as moduleDefs } from './modules/index.mjs';
import { ShopeeAffiliate } from './shopee.mjs';
import { validateCoupon } from './coupons.mjs';

const JSON_LIMIT=12*MB;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const DRAIN_LIMIT=64*MB;
// Descarta o excedente antes do 413: sair do for-await destrói o socket e o cliente recebe erro de rede em vez da mensagem.
async function readBody(req,limit){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit){if(size>limit+DRAIN_LIMIT)break;continue;}chunks.push(chunk);}if(size>limit)throw new ApiError('Arquivo ou conteúdo excede o limite permitido.',413);return Buffer.concat(chunks);}
async function jsonBody(req){if(!String(req.headers['content-type']??'').toLowerCase().startsWith('application/json'))throw new ApiError('Use Content-Type application/json.',415);let value;try{value=JSON.parse((await readBody(req,JSON_LIMIT)).toString('utf8'));}catch(error){if(error instanceof ApiError)throw error;throw new ApiError('JSON inválido.');}return object(value);}
async function multipart(req,max=FILE_LIMIT){
  const type=String(req.headers['content-type']??'');const match=type.match(/^multipart\/form-data;\s*boundary=(?:"([^"\r\n]{1,70})"|([^;\s\r\n]{1,70}))(?:;.*)?$/i);
  if(!match)throw new ApiError('Envie um arquivo multipart/form-data no campo file.',415);
  const body=await readBody(req,max+64*1024),boundary=Buffer.from('--'+(match[1]??match[2]));
  if(!body.subarray(0,boundary.length).equals(boundary))throw new ApiError('Multipart inválido.');
  let cursor=boundary.length,file=null;
  while(cursor<body.length){
    if(body.subarray(cursor,cursor+2).toString()==='--')break;
    if(body.subarray(cursor,cursor+2).toString()!=='\r\n')throw new ApiError('Multipart inválido.');cursor+=2;
    const headerEnd=body.indexOf('\r\n\r\n',cursor);if(headerEnd<0||headerEnd-cursor>8192)throw new ApiError('Cabeçalho multipart inválido.');
    const header=body.toString('utf8',cursor,headerEnd);const next=body.indexOf(Buffer.concat([Buffer.from('\r\n'),boundary]),headerEnd+4);if(next<0)throw new ApiError('Multipart incompleto.');
    const disposition=header.match(/content-disposition:\s*form-data;[^\r\n]*\bname="([^"]+)"[^\r\n]*/i);
    const filename=header.match(/\bfilename="([^"\r\n]*)"/i);
    if(disposition?.[1]==='file'&&filename){if(file)throw new ApiError('Envie apenas um arquivo por vez.');const data=body.subarray(headerEnd+4,next);if(data.length>max)throw new ApiError(`Arquivo excede o limite de ${max/MB} MB.`,413);file={buffer:data,name:filename[1].split(/[\\/]/).at(-1)};}
    cursor=next+2+boundary.length;
  }
  if(!file?.buffer.length)throw new ApiError('Nenhum arquivo foi enviado no campo file.');return file;
}
function send(res,status,value,headers={}){const buffer=Buffer.isBuffer(value)?value:Buffer.from(typeof value==='string'?value:JSON.stringify(value));res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':buffer.length,'Cache-Control':'no-store',...headers});res.end(buffer);}
function notFound(){throw new ApiError('Registro não encontrado.',404);}
function productFingerprint(p){return p?createHash('sha256').update(JSON.stringify([p.title,p.image,p.price,p.originalPrice,p.coupon,p.affiliateUrl])).digest('hex'):'';}
function processAlive(pid){if(!Number.isSafeInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true;}catch(error){return error.code==='EPERM';}}

export function createApp({dataDir=path.resolve('data'),staticDir=path.resolve('dist'),allowedOrigins=[],connectorOptions={},shopeeOptions={},moduleOptions={},queueIntervalMs=1000}={}) {
  dataDir=path.resolve(dataDir);staticDir=path.resolve(staticDir);const mediaDir=path.join(dataDir,'media');mkdirSync(mediaDir,{recursive:true});const store=new Store(dataDir);const connectors=new Connectors({dataDir,mediaDir,store,...connectorOptions});const shopee=new ShopeeAffiliate({dataDir,mediaDir,store,saveProduct,...shopeeOptions});
  // Etapas em paralelo: cada módulo recebe o contexto comum (docs/ARQUITETURA-MODULOS.md).
  const registry=new Map();
  const moduleContext={store,dataDir,mediaDir,privateDir:path.join(dataDir,'private'),connectors,shopee,saveProduct,modules:registry,helpers:{jsonBody,multipart,send,notFound,text,url:validUrl,ApiError,id,now,restrictPrivate,requestGateway,sniffImage,productFingerprint}};
  for(const definition of moduleDefs)registry.set(definition.name,definition.create({...moduleContext,options:moduleOptions[definition.name]??{}}));
  const coupon=input=>{try{return validateCoupon(input);}catch(error){throw new ApiError(error.message);}};
  function ensureImage(value){if(value.startsWith('/media/')&&!existsSync(path.join(mediaDir,value.slice(7))))throw new ApiError('Imagem não encontrada. Envie o arquivo antes de salvar.');}
  function saveProduct(input,previous=null){const value=product(input);ensureImage(value.image);if(value.affiliateUrl&&store.all('products').some(p=>p.affiliateUrl===value.affiliateUrl&&p.id!==previous?.id))throw new ApiError('Este link afiliado já está no catálogo.',409);return store.save('products',{...value,id:previous?.id??id(),createdAt:previous?.createdAt??now(),updatedAt:now()});}
  for(const c of store.all('campaigns'))if(c.status==='sending'&&!processAlive(c.workerPid))store.save('campaigns',{...c,status:'unknown',deliveryError:'O aplicativo foi interrompido durante o envio. Confira o destino; nenhuma repetição automática será feita.'});
  for(const delivery of store.all('deliveries'))if(delivery.status==='sending'&&!processAlive(delivery.workerPid))store.save('deliveries',{...delivery,status:'unconfirmed',error:'Aplicativo interrompido durante esta tentativa. Confira o destino antes de criar outro envio.'});
  function campaign(input){object(input);const productId=text(input.productId,'Produto',100,true),channelId=text(input.channelId,'Canal',100,true),selectedProduct=store.get('products',productId);if(!selectedProduct)throw new ApiError('Produto da campanha não encontrado.');const selectedChannel=store.get('channels',channelId);if(!selectedChannel)throw new ApiError('Canal da campanha não encontrado.');const deliveryMode=input.deliveryMode??'manual';if(!['manual','telegram','evolution'].includes(deliveryMode))throw new ApiError('Modo de envio inválido.');if(deliveryMode!=='manual'&&input.confirmAutomatic!==true)throw new ApiError('Autorize explicitamente o envio automático desta campanha.');const prepared=deliveryMode==='manual'?{}:{...connectors.assertReady(deliveryMode,selectedChannel),productFingerprint:productFingerprint(selectedProduct)};const message=text(input.message,'Mensagem',deliveryMode==='telegram'?4096:12000,true);const date=input.scheduledAt?new Date(input.scheduledAt):new Date();if(Number.isNaN(date.getTime()))throw new ApiError('Data da campanha inválida.');if(input.templateId&&!store.get('templates',input.templateId))throw new ApiError('Modelo não encontrado.');return {id:id(),productId,channelId,scheduledAt:date.toISOString(),message,status:date.getTime()>Date.now()?'scheduled':'ready',createdAt:now(),templateId:input.templateId||'',deliveryMode,...prepared};}
  function state(){for(const c of store.all('campaigns'))if(c.status==='scheduled'&&Date.parse(c.scheduledAt)<=Date.now())store.save('campaigns',{...c,status:'ready'});return {products:store.all('products'),campaigns:store.all('campaigns'),channels:store.all('channels'),templates:store.all('templates'),coupons:store.all('coupons'),settings:store.settings(),activity:store.all('activity'),integrations,shopee:shopee.status(),modules:Object.fromEntries([...registry].map(([key,module])=>[key,module.state?.()??{}]))};}
  async function backup(){
    const snapshot=state(),zip=new JSZip(),manifest={version:1,exportedAt:now(),...snapshot};delete manifest.integrations;
    for(const field of ['products','campaigns','channels','templates','coupons'])if(snapshot[field].length>BACKUP_LIMITS.records)throw new ApiError('Backup ultrapassa 5.000 registros por lista. Dados preservados; faça uma cópia local com o aplicativo fechado.',413);
    const manifestData=Buffer.from(JSON.stringify(manifest,null,2));if(manifestData.length>BACKUP_LIMITS.single)throw new ApiError('Manifesto do backup ultrapassa 20 MB. Dados preservados; faça uma cópia local com o aplicativo fechado.',413);
    const names=(await fs.readdir(mediaDir)).filter(name=>/^[a-f0-9-]+\.(png|jpg|webp)$/.test(name));
    if(names.length+2>BACKUP_LIMITS.entries)throw new ApiError('Backup contém mídias demais. Dados preservados; faça uma cópia local com o aplicativo fechado.',413);
    let total=manifestData.length;for(const name of names){const stat=await fs.stat(path.join(mediaDir,name));if(stat.size>FILE_LIMIT)throw new ApiError('Mídia local excede o limite de 10 MB do backup.',413);total+=stat.size;}
    // STORE evita gerar razão de compressão que o próprio restaurador recusaria.
    // Estimativa conservadora inclui os cabeçalhos locais e centrais de cada entrada.
    const estimated=total+2048+names.reduce((sum,name)=>sum+256+4*Buffer.byteLength(name),0);
    if(total>BACKUP_LIMITS.total||estimated>BACKUP_LIMITS.compressed)throw new ApiError('Backup ultrapassa o limite restaurável de 50 MB. Dados preservados. Exporte o catálogo e copie a pasta media separadamente; para preservar toda a operação, copie a pasta de dados com o aplicativo fechado.',413);
    zip.file('manifest.json',manifestData);for(const name of names)zip.file('media/'+name,await fs.readFile(path.join(mediaDir,name)));
    const buffer=await zip.generateAsync({type:'nodebuffer',compression:'STORE'});if(buffer.length>BACKUP_LIMITS.compressed)throw new ApiError('Backup ultrapassa o limite restaurável de 50 MB; os dados locais permanecem intactos.',413);
    return buffer;
  }
  async function restore(buffer){
    if(buffer.length>BACKUP_LIMITS.compressed)throw new ApiError('Backup excede o limite de 50 MB.',413);
    const zip=await validateZipStructure(buffer,{maxSingle:BACKUP_LIMITS.single,maxTotal:BACKUP_LIMITS.total,maxEntries:BACKUP_LIMITS.entries});
    for(const entry of Object.values(zip.files))if(!entry.dir&&entry.name!=='manifest.json'&&!/^media\/[a-f0-9-]+\.(png|jpg|webp)$/.test(entry.name))throw new ApiError('Backup contém arquivos não reconhecidos.');
    const manifestEntry=zip.file('manifest.json');if(!manifestEntry)throw new ApiError('Backup não contém manifest.json.');
    let manifest;try{manifest=JSON.parse(await manifestEntry.async('string'));}catch{throw new ApiError('Manifesto do backup inválido.');}object(manifest);if(manifest.version!==1)throw new ApiError('Versão de backup não suportada.');manifest.coupons??=[];
    for(const field of ['products','campaigns','channels','templates','coupons'])if(!Array.isArray(manifest[field])||manifest[field].length>BACKUP_LIMITS.records)throw new ApiError(`Lista ${field} inválida ou excessiva.`);
    const validId=(value)=>text(value,'ID do backup',100,true);
    for(const field of ['products','campaigns','channels','templates','coupons']){const seen=new Set();for(const item of manifest[field]){object(item);validId(item.id);if(seen.has(item.id))throw new ApiError(`IDs repetidos em ${field}.`);seen.add(item.id);}}
    const plannedMedia=[],imageMap=new Map();for(const entry of Object.values(zip.files)){if(entry.dir||!entry.name.startsWith('media/'))continue;if(entry._data.uncompressedSize>FILE_LIMIT)throw new ApiError('Imagem no backup excede 10 MB.');const data=await entry.async('nodebuffer');const type=sniffImage(data);const name=id()+'.'+type.ext;plannedMedia.push({name,data});imageMap.set('/'+entry.name,'/media/'+name);}
    const validatedProducts=manifest.products.map(p=>{const value=product(p);if(value.image.startsWith('/media/')){if(!imageMap.has(value.image))throw new ApiError('Imagem referenciada ausente no backup.');value.image=imageMap.get(value.image);}return {...value,sourceId:p.id,createdAt:now()};});
    const validatedChannels=manifest.channels.map(c=>({...channel(c),sourceId:c.id}));
    const validatedTemplates=manifest.templates.map(t=>({...template(t),sourceId:t.id}));
    const validatedCoupons=manifest.coupons.map(c=>({...coupon(c),sourceId:c.id}));
    const productIds=new Set(manifest.products.map(p=>p.id)),channelIds=new Set(manifest.channels.map(c=>c.id)),templateIds=new Set(manifest.templates.map(t=>t.id));
    const validatedCampaigns=manifest.campaigns.map(c=>{if(!productIds.has(c.productId)||!channelIds.has(c.channelId))throw new ApiError('Campanha no backup tem referência inválida.');if(c.templateId&&!templateIds.has(c.templateId))throw new ApiError('Modelo da campanha ausente no backup.');if(!CAMPAIGN_STATUSES.includes(c.status))throw new ApiError('Status de campanha inválido no backup.');const scheduledAt=new Date(c.scheduledAt);if(Number.isNaN(scheduledAt.getTime()))throw new ApiError('Data da campanha inválida no backup.');return {...c,message:text(c.message,'Mensagem',12000,true),scheduledAt:scheduledAt.toISOString()};});
    if(manifest.settings)settings(manifest.settings); // Valida, mas preserva a configuração atual.
    const written=[];try{
      for(const media of plannedMedia){await fs.writeFile(path.join(mediaDir,media.name),media.data,{flag:'wx'});written.push(media.name);}
      const result=store.transaction(()=>{
        const productMap=new Map(),channelMap=new Map(),templateMap=new Map();let imported=0,skipped=0;
        const knownProducts=store.all('products'),knownProductIds=new Map(knownProducts.map(p=>[p.id,p])),knownLinks=new Map(knownProducts.filter(p=>p.affiliateUrl).map(p=>[p.affiliateUrl,p]));
        for(const p of validatedProducts){const existing=knownProductIds.get(p.sourceId)||(p.affiliateUrl?knownLinks.get(p.affiliateUrl):null);if(existing){productMap.set(p.sourceId,existing.id);skipped++;continue;}const {sourceId,...data}=p;const added=store.save('products',{...data,id:sourceId,updatedAt:now()});knownProductIds.set(added.id,added);if(added.affiliateUrl)knownLinks.set(added.affiliateUrl,added);productMap.set(sourceId,added.id);imported++;}
        for(const c of validatedChannels){const existing=store.all('channels').find(v=>v.id===c.sourceId||(v.name===c.name&&v.type===c.type&&v.url===c.url));const {sourceId,...data}=c;const added=existing??store.save('channels',{...data,id:id()});channelMap.set(sourceId,added.id);}
        for(const t of validatedTemplates){const existing=store.all('templates').find(v=>v.id===t.sourceId||(v.name===t.name&&v.body===t.body));const {sourceId,...data}=t;const added=existing??store.save('templates',{...data,id:id()});templateMap.set(sourceId,added.id);}
        let coupons=0;for(const c of validatedCoupons){if(store.get('coupons',c.sourceId))continue;const {sourceId,...data}=c;store.save('coupons',{...data,id:sourceId,productIds:data.productIds.map(key=>productMap.get(key)||key)});coupons++;}
        let campaigns=0;for(const c of validatedCampaigns){if(store.get('campaigns',c.id))continue;const value={id:c.id,productId:productMap.get(c.productId),channelId:channelMap.get(c.channelId),templateId:templateMap.get(c.templateId)||'',scheduledAt:c.scheduledAt,message:c.message,status:c.status==='sending'?'unknown':c.status,createdAt:now(),deliveryMode:'manual',...(c.status==='sending'?{deliveryError:'Envio interrompido no backup. Confira o destino antes de publicar.'}:{})};if(store.all('campaigns').some(v=>v.productId===value.productId&&v.channelId===value.channelId&&v.scheduledAt===value.scheduledAt&&v.message===value.message))continue;store.save('campaigns',value);campaigns++;}
        store.activity(`Backup restaurado: ${imported} produto(s), ${campaigns} campanha(s). Campanhas restauradas usam publicação manual.`);return {imported,skipped,campaigns,coupons,errors:[]};
      });
      // Imagens de produtos ignorados não precisam permanecer no disco.
      const used=new Set(store.all('products').map(p=>p.image));for(const filename of written)if(!used.has('/media/'+filename))await fs.unlink(path.join(mediaDir,filename)).catch(()=>{});return result;
    }catch(error){for(const filename of written)await fs.unlink(path.join(mediaDir,filename)).catch(()=>{});throw error;}
  }
  async function route(req,res){
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob: https://cf.shopee.com.br https://*.susercontent.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    const host=String(req.headers.host??'');let hostname;try{hostname=new URL('http://'+host).hostname;}catch{throw new ApiError('Host inválido.',403);}
    if(!['127.0.0.1','localhost'].includes(hostname))throw new ApiError('Acesso permitido somente no endereço local.',403);
    const origin=req.headers.origin;const actualPort=server.address()?.port;const origins=new Set([`http://127.0.0.1:${actualPort}`,`http://localhost:${actualPort}`,'http://localhost:4318','http://127.0.0.1:4318',...allowedOrigins]);
    if(origin&&!origins.has(origin))throw new ApiError('Origem não autorizada.',403);
    const mutation=!['GET','HEAD','OPTIONS'].includes(req.method);if(mutation&&req.headers['x-vitraya-client']!=='1')throw new ApiError('Cabeçalho de proteção local ausente.',403);
    if(req.method==='OPTIONS')throw new ApiError('Método não permitido.',405);
    let target;try{target=new URL(req.url,'http://'+host);}catch{throw new ApiError('Endereço inválido.');}
    const p=target.pathname,method=req.method;
    for(const module of registry.values())if(module.gate&&!(await module.gate({req,res,path:p,method,target})))return;
    if(p==='/api/health'&&method==='GET')return send(res,200,{ok:true,app:'Vitraya Studio',version:1});
    if(p==='/api/state'&&method==='GET')return send(res,200,state());
    if(p==='/api/coupons'&&method==='GET')return send(res,200,store.all('coupons'));
    if(p==='/api/coupons'&&method==='POST'){const value=store.save('coupons',{...coupon(await jsonBody(req)),id:id()});store.activity('Cupom local cadastrado para simulação.');return send(res,201,value);}
    let couponMatch=p.match(/^\/api\/coupons\/([^/]+)$/);if(couponMatch&&['PUT','DELETE'].includes(method)){const previous=store.get('coupons',couponMatch[1]);if(!previous)notFound();if(method==='DELETE'){store.remove('coupons',previous.id);return send(res,200,{ok:true});}return send(res,200,store.save('coupons',{...coupon({...previous,...await jsonBody(req)}),id:previous.id}));}
    if(p==='/api/integrations'&&method==='GET')return send(res,200,integrations);
    if(p==='/api/shopee'&&method==='GET')return send(res,200,shopee.status());
    if(p==='/api/shopee'&&method==='PUT')return send(res,200,await shopee.configure(await jsonBody(req)));
    if(p==='/api/shopee'&&method==='DELETE')return send(res,200,await shopee.remove());
    if(p==='/api/shopee/test'&&method==='POST')return send(res,200,await shopee.test());
    if(p==='/api/shopee/search'&&method==='POST')return send(res,200,await shopee.search(await jsonBody(req)));
    if(p==='/api/shopee/link'&&method==='POST')return send(res,200,await shopee.shortLink(await jsonBody(req)));
    if(p==='/api/shopee/import'&&method==='POST')return send(res,200,await shopee.importOffers(await jsonBody(req)));
    if(p==='/api/connectors'&&method==='GET')return send(res,200,connectors.list());
    let connectorMatch=p.match(/^\/api\/connectors\/(telegram|evolution)(?:\/(test|send))?$/);
    if(connectorMatch){const connectorId=connectorMatch[1],operation=connectorMatch[2];if(method==='PUT'&&!operation)return send(res,200,await connectors.configure(connectorId,await jsonBody(req)));if(method==='DELETE'&&!operation)return send(res,200,await connectors.remove(connectorId));if(method==='POST'&&operation==='test')return send(res,200,await connectors.test(connectorId,await jsonBody(req)));if(method==='POST'&&operation==='send'){const result=await connectors.send(connectorId,await jsonBody(req));return send(res,result.ok?200:502,result);}throw new ApiError('Método não permitido.',405);}
    if(p==='/api/products'&&method==='POST'){const value=saveProduct(await jsonBody(req));store.activity('Produto adicionado ao catálogo.');return send(res,201,value);}
    if(p==='/api/products/delete'&&method==='POST'){const body=await jsonBody(req);if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>5000)throw new ApiError('Selecione de 1 a 5.000 produtos para excluir.');const ids=new Set(body.ids.map(value=>text(value,'Produto',100,true)));if(store.all('campaigns').some(c=>ids.has(c.productId)&&c.status==='sending'))throw new ApiError('Há envio em andamento para um dos produtos. Aguarde o resultado.',409);let removed=0;store.transaction(()=>{for(const c of store.all('campaigns'))if(ids.has(c.productId))store.remove('campaigns',c.id);for(const productId of ids)if(store.get('products',productId)){store.remove('products',productId);removed++;}store.activity(`${removed} produto(s) removido(s) do catálogo de uma vez.`);});return send(res,200,{removed});}
    let match=p.match(/^\/api\/products\/([^/]+)$/);
    if(match&&['PUT','DELETE'].includes(method)){const previous=store.get('products',match[1]);if(!previous)notFound();if(store.all('campaigns').some(c=>c.productId===previous.id&&c.status==='sending'))throw new ApiError('Há envio em andamento para este produto. Aguarde o resultado.',409);if(method==='PUT'){const value=saveProduct({...previous,...await jsonBody(req)},previous);store.activity('Produto atualizado.');return send(res,200,value);}store.transaction(()=>{for(const c of store.all('campaigns'))if(c.productId===previous.id)store.remove('campaigns',c.id);store.remove('products',previous.id);store.activity('Produto removido do catálogo.');});return send(res,200,{ok:true});}
    if(p==='/api/media'&&method==='POST'){const file=await multipart(req);const type=sniffImage(file.buffer);const name=id()+'.'+type.ext;await fs.writeFile(path.join(mediaDir,name),file.buffer,{flag:'wx'});return send(res,201,{url:'/media/'+name,name:file.name});}
    if(p==='/api/import/preview'&&method==='POST'){const file=await multipart(req);return send(res,200,await previewImport(file.buffer,file.name));}
    if(p==='/api/import/commit'&&method==='POST'){
      const body=await jsonBody(req);if(!Array.isArray(body.rows)||body.rows.length>5000)throw new ApiError('Envie até 5.000 linhas para importar.');const errors=[];let imported=0,skipped=0,updated=0;
      const byLink=new Map(store.all('products').filter(p=>p.affiliateUrl).map(p=>[p.affiliateUrl,p]));
      store.transaction(()=>{for(const [index,row] of body.rows.entries())try{const value=product(row);ensureImage(value.image);const existing=value.affiliateUrl?byLink.get(value.affiliateUrl):null;if(existing){if(value.image&&!existing.image){byLink.set(value.affiliateUrl,store.save('products',{...existing,image:value.image,updatedAt:now()}));updated++;}else skipped++;continue;}const saved=store.save('products',{...value,id:id(),createdAt:now(),updatedAt:now()});if(value.affiliateUrl)byLink.set(value.affiliateUrl,saved);imported++;}catch(error){errors.push({row:Number.isSafeInteger(row?._rowNumber)?row._rowNumber:index+1,message:error.message});}store.activity(`Importação: ${imported} novo(s), ${updated} com foto adicionada, ${skipped} repetido(s), ${errors.length} erro(s).`);});return send(res,200,{imported,updated,skipped,errors});
    }
    if(p==='/api/export'&&method==='GET'){const format=target.searchParams.get('format')??'json';const values=store.all('products');const filename=`vitraya-produtos-${now().slice(0,10)}.${format}`;const headers={'Content-Disposition':`attachment; filename="${filename}"`};if(format==='json')return send(res,200,JSON.stringify(values,null,2),headers);if(format==='csv')return send(res,200,csvExport(values),{...headers,'Content-Type':'text/csv; charset=utf-8'});if(format==='xlsx')return send(res,200,await xlsxExport(values),{...headers,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});throw new ApiError('Formato de exportação inválido.');}
    if(p==='/api/backup'&&method==='GET')return send(res,200,await backup(),{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="vitraya-backup-${now().slice(0,10)}.zip"`});
    if(p==='/api/restore'&&method==='POST'){const file=await multipart(req,BACKUP_LIMITS.compressed);return send(res,200,await restore(file.buffer));}
    if(p==='/api/channels'&&method==='POST'){const value=store.save('channels',{...channel(await jsonBody(req)),id:id()});store.activity('Canal adicionado.');return send(res,201,value);}
    match=p.match(/^\/api\/channels\/([^/]+)$/);if(match&&method==='DELETE'){if(!store.get('channels',match[1]))notFound();if(store.all('campaigns').some(c=>c.channelId===match[1]))throw new ApiError('Remova primeiro as campanhas vinculadas a este canal.',409);store.remove('channels',match[1]);store.activity('Canal removido.');return send(res,200,{ok:true});}
    if(p==='/api/templates'&&method==='POST'){const value=store.save('templates',{...template(await jsonBody(req)),id:id()});return send(res,201,value);}
    match=p.match(/^\/api\/templates\/([^/]+)$/);if(match&&['PUT','DELETE'].includes(method)){const previous=store.get('templates',match[1]);if(!previous)notFound();if(method==='PUT')return send(res,200,store.save('templates',{...template({...previous,...await jsonBody(req)}),id:previous.id}));store.transaction(()=>{store.remove('templates',previous.id);for(const c of store.all('campaigns'))if(c.templateId===previous.id)store.save('campaigns',{...c,templateId:''});});return send(res,200,{ok:true});}
    if(p==='/api/campaigns'&&method==='POST'){const input=await jsonBody(req),value=campaign(input);const existing=store.all('campaigns').find(c=>c.productId===value.productId&&c.channelId===value.channelId&&c.message===value.message&&(c.deliveryMode||'manual')===value.deliveryMode&&(c.templateId||'')===value.templateId&&(input.scheduledAt?c.scheduledAt===value.scheduledAt:Math.abs(Date.parse(c.scheduledAt)-Date.parse(value.scheduledAt))<2000));if(existing)return send(res,200,existing);store.save('campaigns',value);store.activity(value.deliveryMode==='manual'?'Campanha adicionada à fila manual.':'Campanha automática autorizada explicitamente.');return send(res,201,value);}
    match=p.match(/^\/api\/campaigns\/([^/]+)$/);if(match&&['PUT','DELETE'].includes(method)){const previous=store.get('campaigns',match[1]);if(!previous)notFound();if(previous.status==='sending')throw new ApiError('Envio em andamento; aguarde o resultado.',409);if(method==='DELETE'){store.remove('campaigns',previous.id);return send(res,200,{ok:true});}const body=await jsonBody(req);if(!['scheduled','ready','done','cancelled'].includes(body.status))throw new ApiError('Status da campanha inválido.');if(previous.deliveryMode&&previous.deliveryMode!=='manual'&&!['done','cancelled'].includes(body.status))throw new ApiError('Envio automático não pode ser repetido alterando o status. Confira o destino e crie uma nova campanha explicitamente.',409);const value=store.save('campaigns',{...previous,status:body.status});store.activity(body.status==='done'?'Campanha marcada manualmente como concluída.':'Status de campanha atualizado.');return send(res,200,value);}
    if(p==='/api/settings'&&method==='PUT'){const value=settings({...store.settings(),...await jsonBody(req)});store.settings(value);return send(res,200,value);}
    if(p==='/api/demo'&&method==='POST'){
      if(store.all('products').length)throw new ApiError('O catálogo precisa estar vazio para carregar exemplos.',409);
      store.transaction(()=>{
        for(const [title,marketplace,price,originalPrice,image,category] of [['Fone sem fio · exemplo','shopee',12990,17990,'fone','Eletrônicos'],['Bolsa urbana · exemplo','shein',8990,12990,'bolsa','Moda'],['Luminária de mesa · exemplo','mercadolivre',14990,19990,'luminaria','Casa'],['Tênis casual · exemplo','tiktok',16990,22990,'tenis','Moda']])store.save('products',{...product({title,marketplace,price,originalPrice,image:`/demo/${image}.svg`,category,description:'Produto fictício para explorar o aplicativo. Substitua por seus produtos e links.',tags:['demonstração'],status:'draft'}),id:id(),createdAt:now(),updatedAt:now()});
        if(!store.all('templates').length)store.save('templates',{id:id(),name:'Oferta essencial',body:'✨ {titulo}\n\nPor {preco}\n{cupom}\n\n🔗 {link}\n{assinatura}'});
        store.activity('Catálogo fictício de demonstração carregado.');
      });return send(res,201,{ok:true,products:4});
    }
    for(const module of registry.values())if(module.handle&&await module.handle({req,res,path:p,method,target}))return;
    if(p.startsWith('/api/'))notFound();
    if(!['GET','HEAD'].includes(method))throw new ApiError('Método não permitido.',405);
    let root=staticDir,relative;try{relative=decodeURIComponent(p);}catch{throw new ApiError('Endereço inválido.');}
    if(relative.includes('\\')||relative.includes('\0'))notFound();
    if(p.startsWith('/media/')){root=mediaDir;relative=relative.slice(6);if(!/^\/[a-f0-9-]+\.(png|jpg|webp)$/.test(relative))notFound();}
    let filename=path.resolve(root,'.'+relative);if(filename!==root&&!filename.startsWith(root+path.sep))notFound();
    try{const stat=await fs.stat(filename);if(!stat.isFile())filename=path.join(root,'index.html');}catch{if(root===mediaDir||path.extname(relative))notFound();filename=path.join(root,'index.html');}
    let data;try{data=await fs.readFile(filename);}catch{notFound();}
    const contentType=MIME[path.extname(filename).toLowerCase()]??'application/octet-stream';res.writeHead(200,{'Content-Type':contentType,'Content-Length':data.length,'Cache-Control':root===mediaDir?'private, max-age=86400':'no-cache'});res.end(method==='HEAD'?undefined:data);
  }
  let queueTimer=null,queuePromise=null,stopped=false;
  async function processQueue(){if(stopped||queuePromise)return queuePromise;queuePromise=(async()=>{for(const original of store.all('campaigns').reverse()){
    const current=store.transaction(()=>{const fresh=store.get('campaigns',original.id);if(!fresh||!['scheduled','ready'].includes(fresh.status)||!['telegram','evolution'].includes(fresh.deliveryMode)||Date.parse(fresh.scheduledAt)>Date.now())return null;store.save('campaigns',{...fresh,status:'sending',deliveryError:'',workerPid:process.pid});return fresh;});if(!current)continue;
    try{const prepared=connectors.assertReady(current.deliveryMode,store.get('channels',current.channelId));if(prepared.connectorFingerprint!==current.connectorFingerprint||prepared.destination!==current.destination)throw new ApiError('Configuração ou destino mudou após autorizar a campanha. Crie uma nova campanha após conferir.');if(productFingerprint(store.get('products',current.productId))!==current.productFingerprint)throw new ApiError('Produto, preço, link ou imagem mudou após autorizar esta campanha. Confira a oferta e crie uma nova campanha.');const receipt=await connectors.send(current.deliveryMode,{productId:current.productId,channelId:current.channelId,message:current.message,confirm:true,idempotencyKey:'campaign_'+current.id});store.save('campaigns',{...current,status:receipt.ok?'done':'failed',receipt,deliveryError:receipt.ok?'':receipt.error||'Envio não confirmado. Confira o destino antes de repetir.'});}
    catch(error){store.save('campaigns',{...current,status:'failed',deliveryError:error instanceof ApiError?error.message:'Falha no envio. Confira o destino antes de repetir.'});store.activity('Campanha automática falhou; não haverá repetição automática.');}
    if(stopped)break;
  }})().finally(()=>{queuePromise=null;});return queuePromise;}
  const server=http.createServer((req,res)=>{route(req,res).catch(error=>{if(res.headersSent){res.destroy();return;}if(!(error instanceof ApiError))console.error('Falha local do servidor:',error.message);send(res,error instanceof ApiError?error.status:500,{error:error instanceof ApiError?error.message:'Falha interna. Consulte o terminal local.'});});});
  server.requestTimeout=30_000;server.headersTimeout=15_000;server.maxHeadersCount=80;
  return {server,store,dataDir,processQueue,async start(port=4317){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});stopped=false;if(queueIntervalMs>0){queueTimer=setInterval(()=>{processQueue().catch(()=>console.error('Falha ao processar fila local; confira campanhas antes de repetir.'));},queueIntervalMs);queueTimer.unref();}for(const module of registry.values())await module.start?.();return {port:server.address().port,url:`http://127.0.0.1:${server.address().port}`};},async close(){stopped=true;if(queueTimer)clearInterval(queueTimer);if(queuePromise)await queuePromise;for(const module of [...registry.values()].reverse()){try{await module.close?.();}catch{}}if(server.listening)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));store.close();}};
}

export async function startServer(options={}){const app=createApp(options);const address=await app.start(options.port??4317);return {...app,...address};}
