import path from 'node:path';
import { promises as fs, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ApiError, object, text, id, now, sniffImage, url as validUrl } from './validation.mjs';
import { requestGateway, restrictPrivate } from './connectors.mjs';
import { FILE_LIMIT } from './limits.mjs';

// Contrato conferido em docs/execucao/SHOPEE.md: assinatura SHA256(AppID+Timestamp+Payload+Secret) sobre o corpo exato.
const API_BASE='https://open-api.affiliate.shopee.com.br/graphql';
const IMAGE_HOSTS=['cf.shopee.com.br','.susercontent.com'];
const LINK_HOSTS=['shopee.com.br','shope.ee'];
export const SORTS={relevance:1,sales:2,priceDesc:3,priceAsc:4,commission:5};
const FIELDS='itemId productName imageUrl priceMin priceMax priceDiscountRate commissionRate sales ratingStar shopName shopId productLink offerLink periodEndTime';
const CACHE_TTL=2*60*60*1000,CACHE_MAX=1000;

function hostAllowed(hostname,list){return list.some(h=>h.startsWith('.')?hostname.endsWith(h):hostname===h||hostname.endsWith('.'+h));}
function configFor(input){object(input);const appId=text(input.appId,'AppID',20,true).trim(),secret=text(input.secret,'Chave secreta',256,true);if(!/^\d{4,20}$/.test(appId))throw new ApiError('AppID da Shopee: use somente os números exibidos no portal.');if(!/^[\x21-\x7e]{8,256}$/.test(secret))throw new ApiError('Chave secreta da Shopee inválida: confira se copiou sem espaços.');return {appId,secret};}
// Centavos a partir do texto decimal da API, sem ponto flutuante; null quando não é um preço legível.
export function cents(value){if(value==null||value==='')return null;const match=String(value).trim().match(/^(\d{1,9})(?:\.(\d+))?$/);if(!match)return null;const decimals=(match[2]??'').padEnd(3,'0');const value100=Number(match[1])*100+Number(decimals.slice(0,2));return value100+(Number(decimals[2])>=5?1:0);}
// Aceita links de produto da Shopee: .../Nome-i.<loja>.<item> ou .../product/<loja>/<item>.
export function parseProductUrl(value){let parsed;try{parsed=new URL(value);}catch{return null;}if(!['https:','http:'].includes(parsed.protocol)||!hostAllowed(parsed.hostname,LINK_HOSTS))return null;const match=parsed.pathname.match(/-i\.(\d{1,15})\.(\d{1,15})(?:$|[/?#])/)??parsed.pathname.match(/\/product\/(\d{1,15})\/(\d{1,15})(?:$|\/)/);return match?{shopId:match[1],itemId:match[2]}:null;}
function integer(value,name,min,max,fallback){if(value==null||value==='')return fallback;const number=Number(value);if(!Number.isSafeInteger(number)||number<min||number>max)throw new ApiError(`${name}: use um número inteiro entre ${min} e ${max}.`);return number;}
function digits(value,name){if(value==null||value==='')return '';value=String(value).trim();if(!/^\d{1,15}$/.test(value))throw new ApiError(`${name}: use somente números.`);return value;}
function rate(value){const number=Number(value);return value!=null&&value!==''&&Number.isFinite(number)&&number>=0?number:null;}
function link(value){try{return value?validUrl(String(value),'Link da oferta'):'';}catch{return '';}}
function normalize(node){
  const offerLink=link(node.offerLink),productLink=link(node.productLink),end=Number(node.periodEndTime);
  return {itemId:String(node.itemId??''),shopId:String(node.shopId??''),title:String(node.productName??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,300),image:typeof node.imageUrl==='string'?node.imageUrl:'',price:cents(node.priceMin),priceMax:cents(node.priceMax),discountRate:rate(node.priceDiscountRate),commissionRate:rate(node.commissionRate),sales:rate(node.sales),rating:rate(node.ratingStar),shopName:String(node.shopName??'').slice(0,200),productLink,offerLink,periodEnd:Number.isSafeInteger(end)&&end>0?new Date(end*1000).toISOString():null};
}
function shopeeError(error){
  const code=Number(error?.extensions?.code),message=String(error?.extensions?.message??error?.message??'').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,300);
  const auth=(message,status)=>Object.assign(new ApiError(message,status),{auth:true});
  if(code===10035)return auth('Sua conta ainda não tem acesso à Open API de afiliados da Shopee. Confira a liberação na área Open API do portal de afiliados.',403);
  if(code===10030)return new ApiError('Limite de consultas da Shopee atingido. Aguarde alguns minutos antes de tentar de novo.',429);
  if(code===10020&&/expired/i.test(message))return auth('A Shopee recusou o horário da requisição. Confira se o relógio do Windows está sincronizado.',502);
  if(code===10020)return auth('A Shopee recusou a autenticação. Confira o AppID e a chave secreta.',502);
  return new ApiError(`A Shopee recusou a consulta${Number.isFinite(code)?` (código ${code})`:''}: ${message||'sem detalhes.'}`,502);
}

export class ShopeeAffiliate {
  constructor({dataDir,mediaDir,store,saveProduct,env=process.env,apiBase=API_BASE,imageHosts=IMAGE_HOSTS,request=requestGateway,clock=()=>Date.now()}={}){
    this.privateDir=path.join(dataDir,'private');this.filename=path.join(this.privateDir,'shopee.json');this.mediaDir=mediaDir;this.store=store;this.saveProduct=saveProduct;this.env=env;this.apiBase=apiBase;this.imageHosts=imageHosts;this.request=request;this.clock=clock;this.record=null;this.offers=new Map();this.chain=Promise.resolve();this.writeQueue=Promise.resolve();
    if(existsSync(this.filename)){try{const saved=JSON.parse(readFileSync(this.filename,'utf8'));if(saved.config||saved.check)this.record={config:saved.config?configFor(saved.config):undefined,check:saved.check??null};}catch{throw new Error('Arquivo local da Shopee inválido. Preserve-o e revise antes de iniciar.');}}
  }
  envConfig(){return this.env.VITRAYA_SHOPEE_APP_ID||this.env.VITRAYA_SHOPEE_SECRET?configFor({appId:this.env.VITRAYA_SHOPEE_APP_ID??'',secret:this.env.VITRAYA_SHOPEE_SECRET??''}):null;}
  config(){return this.envConfig()??this.record?.config??null;}
  fingerprint(config){return config?createHash('sha256').update(JSON.stringify([config.appId,config.secret,this.apiBase])).digest('hex'):'';}
  status(){const config=this.config(),check=this.record?.check?.fingerprint===this.fingerprint(config)?this.record.check:null;return {configured:!!config,source:this.envConfig()?'environment':this.record?.config?'local':'none',status:!config?'credentials_required':check?.ok?'connected':check?'error':'configured',appId:config?'•••'+config.appId.slice(-4):'',checkedAt:check?.checkedAt??null,lastError:check?.error??''};}
  persist(){const operation=this.writeQueue.then(async()=>{await fs.mkdir(this.privateDir,{recursive:true,mode:0o700});await restrictPrivate(this.privateDir,true);const temporary=path.join(this.privateDir,id()+'.tmp');try{await fs.writeFile(temporary,JSON.stringify(this.record??{},null,2),{mode:0o600,flag:'wx'});await restrictPrivate(temporary);await fs.rename(temporary,this.filename);await restrictPrivate(this.filename);}finally{await fs.unlink(temporary).catch(()=>{});}});this.writeQueue=operation.catch(()=>{});return operation;}
  async configure(input){if(this.envConfig())throw new ApiError('Shopee definida por variáveis de ambiente. Atualize-as no processo do servidor.',409);this.record={config:configFor(input),check:null};this.offers.clear();await this.persist();return this.status();}
  async remove(){if(this.envConfig())throw new ApiError('Remova as variáveis de ambiente da Shopee e reinicie o servidor.',409);this.record=null;this.offers.clear();await this.persist();return {ok:true};}
  async remember(ok,error=''){const config=this.config();this.record={...(this.record??{config:undefined}),check:{ok,checkedAt:now(),error,fingerprint:this.fingerprint(config)}};await this.persist();}
  // Uma chamada por vez: a Shopee limita requisições e não há repetição automática.
  call(query){const run=this.chain.then(()=>this.send(query));this.chain=run.catch(()=>{});return run;}
  async send(query){
    const config=this.config();if(!config)throw new ApiError('Configure o AppID e a chave secreta da Shopee primeiro.');
    const payload=JSON.stringify({query}),timestamp=Math.floor(this.clock()/1000),signature=createHash('sha256').update(config.appId+timestamp+payload+config.secret,'utf8').digest('hex');
    let result;try{result=await this.request(this.apiBase,{headers:{'Content-Type':'application/json',Authorization:`SHA256 Credential=${config.appId}, Timestamp=${timestamp}, Signature=${signature}`},body:Buffer.from(payload,'utf8'),timeout:20000});}catch(error){if(error instanceof ApiError&&error.status===400)throw error;throw new ApiError('Não foi possível falar com a Shopee (rede, tempo limite ou resposta inválida). Tente de novo em instantes.',502);}
    const errors=result.data?.errors;if(Array.isArray(errors)&&errors.length)throw shopeeError(errors[0]);
    if(result.status===429)throw shopeeError({extensions:{code:10030}});if(result.status<200||result.status>=300||!result.data?.data)throw new ApiError(`A Shopee respondeu de forma inesperada (HTTP ${result.status}).`,502);
    return result.data.data;
  }
  // Só autenticação/acesso mudam o estado da conexão; limite de taxa e rede não.
  async guarded(query){try{const data=await this.call(query);if(!this.status().checkedAt||this.status().status!=='connected')await this.remember(true);return data;}catch(error){if(error?.auth)await this.remember(false,error.message).catch(()=>{});throw error;}}
  async test(){const data=await this.guarded('{productOfferV2(limit:1){nodes{itemId}}}');if(!data.productOfferV2)throw new ApiError('A Shopee não devolveu a lista de ofertas no teste.',502);await this.remember(true);this.store.activity('Shopee: AppID e acesso à Open API verificados.');return this.status();}
  async search(input){
    object(input);let keyword=text(input.keyword,'Busca',500).trim(),itemId=digits(input.itemId,'ID do produto'),shopId=digits(input.shopId,'ID da loja');
    const fromUrl=parseProductUrl(keyword);if(fromUrl){({itemId,shopId}=fromUrl);keyword='';}
    if(!keyword&&!itemId&&!shopId)throw new ApiError('Digite o que procura ou cole o link de um produto da Shopee.');
    const sort=input.sort??'relevance';if(!Object.hasOwn(SORTS,sort))throw new ApiError('Ordenação inválida.');
    const page=integer(input.page,'Página',1,100,1),limit=integer(input.limit,'Quantidade',1,50,20);
    // JSON.stringify gera literal de string GraphQL válido e escapado; números já foram validados.
    const args=[keyword&&`keyword:${JSON.stringify(keyword)}`,itemId&&`itemId:${itemId}`,shopId&&`shopId:${shopId}`,`sortType:${SORTS[sort]}`,`page:${page}`,`limit:${limit}`].filter(Boolean).join(',');
    const data=await this.guarded(`{productOfferV2(${args}){nodes{${FIELDS}} pageInfo{page limit hasNextPage}}}`);
    const nodes=data.productOfferV2?.nodes;if(!Array.isArray(nodes))throw new ApiError('A Shopee não devolveu a lista de ofertas.',502);
    const items=nodes.map(normalize).filter(item=>/^\d+$/.test(item.itemId));this.cache(items);
    return {items,page,hasNextPage:data.productOfferV2.pageInfo?.hasNextPage===true,fetchedAt:now()};
  }
  cache(items){const at=this.clock();for(const [key,entry] of this.offers)if(at-entry.at>CACHE_TTL)this.offers.delete(key);for(const item of items){this.offers.delete(item.itemId);this.offers.set(item.itemId,{item,at});}while(this.offers.size>CACHE_MAX)this.offers.delete(this.offers.keys().next().value);}
  cached(itemId){const entry=this.offers.get(itemId);return entry&&this.clock()-entry.at<=CACHE_TTL?entry.item:null;}
  async shortLink(input){
    object(input);const originUrl=validUrl(input.url,'Link da Shopee',true);if(!hostAllowed(new URL(originUrl).hostname,LINK_HOSTS))throw new ApiError('Cole um link de produto, loja ou página da Shopee Brasil.');
    if(input.subIds!=null&&(!Array.isArray(input.subIds)||input.subIds.length>5))throw new ApiError('Use até 5 identificadores de campanha (subIds).');
    const subIds=(input.subIds??[]).map(value=>text(value,'Identificador de campanha',50).trim()).filter(Boolean);if(subIds.some(value=>!/^[a-zA-Z0-9_]+$/.test(value)))throw new ApiError('Identificador de campanha: use letras, números ou _.');
    const data=await this.guarded(`mutation{generateShortLink(input:{originUrl:${JSON.stringify(originUrl)},subIds:${JSON.stringify(subIds)}}){shortLink}}`);
    const shortLink=link(data.generateShortLink?.shortLink);if(!shortLink)throw new ApiError('A Shopee não devolveu um link de afiliado válido.',502);
    this.store.activity('Shopee: link de afiliado gerado pela Open API.');return {originUrl,shortLink,subIds};
  }
  async downloadImage(value){
    let parsed;try{parsed=new URL(value);}catch{throw new ApiError('Imagem da oferta sem endereço válido.');}
    if(!hostAllowed(parsed.hostname,this.imageHosts))throw new ApiError('Imagem fora dos servidores de imagem da Shopee.');
    const result=await this.request(parsed.href,{method:'GET',raw:true,maxBytes:FILE_LIMIT,timeout:20000});if(result.status!==200)throw new ApiError(`Imagem indisponível (HTTP ${result.status}).`,502);
    const type=sniffImage(result.buffer),name=id()+'.'+type.ext;await fs.writeFile(path.join(this.mediaDir,name),result.buffer,{flag:'wx'});return '/media/'+name;
  }
  async importOffers(input){
    object(input);if(!Array.isArray(input.itemIds)||!input.itemIds.length||input.itemIds.length>50)throw new ApiError('Selecione de 1 a 50 ofertas para importar.');
    const results=[];let imported=0;
    for(const raw of new Set(input.itemIds.map(value=>String(value)))){
      if(!/^\d{1,15}$/.test(raw)){results.push({itemId:raw,status:'error',message:'ID de oferta inválido.'});continue;}
      const offer=this.cached(raw);if(!offer){results.push({itemId:raw,status:'expired',message:'Busque a oferta novamente antes de importar.'});continue;}
      if(!offer.offerLink){results.push({itemId:raw,status:'error',message:'A Shopee não devolveu link de afiliado para esta oferta.'});continue;}
      const tag='shopee:'+raw;if(this.store.all('products').some(p=>p.tags?.includes(tag)||p.affiliateUrl===offer.offerLink)){results.push({itemId:raw,status:'duplicate',message:'Já está no catálogo.'});continue;}
      let image='',warning='';if(offer.image)try{image=await this.downloadImage(offer.image);}catch(error){warning=error instanceof ApiError?error.message:'Não foi possível baixar a imagem.';}
      try{
        const price=offer.price??0,saved=this.saveProduct({title:offer.title||'Oferta Shopee '+raw,marketplace:'shopee',price,originalPrice:0,coupon:'',affiliateUrl:offer.offerLink,image,category:'',description:'',tags:['shopee',tag],status:price>0?'ready':'draft'});
        imported++;results.push({itemId:raw,status:'imported',productId:saved.id,...(warning?{message:warning}:{})});
      }catch(error){if(image)await fs.unlink(path.join(this.mediaDir,image.slice(7))).catch(()=>{});results.push({itemId:raw,status:error?.status===409?'duplicate':'error',message:error instanceof ApiError?error.message:'Falha ao salvar a oferta.'});}
    }
    if(imported)this.store.activity(`Shopee: ${imported} oferta(s) importada(s) pela Open API oficial.`);
    return {imported,results};
  }
}
