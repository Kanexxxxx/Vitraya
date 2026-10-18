import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { createApp } from '../server/app.mjs';
import { cents, parseProductUrl } from '../server/shopee.mjs';

const APP_ID='18300012345',SECRET='SEGREDO_FICTICIO_shopee_0123456789';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const shopeeError=(code,message)=>({errors:[{message:`error [${code}]: ${message}`,extensions:{code,message}}]});

// Simula a Open API: recalcula a assinatura sobre o corpo exato e recusa cabeçalho, relógio ou assinatura errados.
async function provider(t){
  const calls=[],state={mode:'ok',nodes:null};
  const server=http.createServer(async(req,res)=>{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString('utf8');
    const reply=(status,value,type='application/json')=>{res.writeHead(status,{'Content-Type':type});res.end(Buffer.isBuffer(value)?value:typeof value==='string'?value:JSON.stringify(value));};
    if(req.method==='GET'&&req.url==='/img/ok.png')return reply(200,png,'image/png');
    if(req.method==='GET'&&req.url==='/img/fake.png')return reply(200,'<svg onload="alert(1)"></svg>','image/png');
    if(req.method!=='POST'||req.url!=='/graphql')return reply(404,{});
    const auth=String(req.headers.authorization??''),match=auth.match(/^SHA256 (.+)$/);if(!match)return reply(200,shopeeError(10020,'Invalid Authorization Header'));
    const fields=Object.fromEntries(match[1].split(',').map(part=>part.trim().split('=')));
    if(Math.abs(Number(fields.Timestamp)-Date.now()/1000)>600)return reply(200,shopeeError(10020,'Request Expired'));
    const expected=createHash('sha256').update(fields.Credential+fields.Timestamp+body+SECRET).digest('hex');
    if(fields.Credential!==APP_ID||fields.Signature!==expected)return reply(200,shopeeError(10020,'Invalid Signature'));
    const query=JSON.parse(body).query;calls.push(query);
    if(state.mode==='noAccess')return reply(200,shopeeError(10035,'You currently do not have access to the Shopee Affiliate Open API Platform'));
    if(state.mode==='rate')return reply(200,shopeeError(10030,'Rate limit exceeded'));
    if(query.startsWith('mutation{generateShortLink'))return reply(200,{data:{generateShortLink:{shortLink:'https://s.shopee.com.br/AbC123?lp=aff&x=1'}}});
    if(query.includes('productOfferV2'))return reply(200,{data:{productOfferV2:{nodes:state.nodes??[{itemId:22593727447,shopId:445566,productName:'Tênis "Casual" {Branco}',imageUrl:mockUrl+'/img/ok.png',priceMin:'1234.56',priceMax:'1299.9',priceDiscountRate:30,commissionRate:'0.08',sales:1520,ratingStar:'4.8',shopName:'Loja Fictícia',productLink:'https://shopee.com.br/produto-i.445566.22593727447',offerLink:'https://s.shopee.com.br/Xy9?utm=a&b=2',periodEndTime:1893456000}],pageInfo:{page:1,limit:20,hasNextPage:true}}}});
    return reply(200,{errors:[{message:'Cannot query field'}]});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const mockUrl='http://127.0.0.1:'+server.address().port;t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  return {calls,state,url:mockUrl};
}
async function fixture(t,mock,{env={}}={}){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vitraya-shopee-'));const options={dataDir:dir,queueIntervalMs:0,connectorOptions:{env:{}},shopeeOptions:{env,apiBase:mock.url+'/graphql',imageHosts:['127.0.0.1']}};
  let app=createApp(options),address=await app.start(0);t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});});
  return {dir,async restart(){await app.close();app=createApp(options);address=await app.start(0);},async request(route,{method='GET',body}={}){return fetch(address.url+route,{method,headers:{...(method!=='GET'?{'X-Vitraya-Client':'1'}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});}};
}
async function json(response,status=200){const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;}
const configure=async f=>json(await f.request('/api/shopee',{method:'PUT',body:{appId:APP_ID,secret:SECRET}}));

test('centavos e links de produto são lidos sem ponto flutuante',()=>{
  assert.equal(cents('29.9'),2990);assert.equal(cents('1234.56'),123456);assert.equal(cents(19.99),1999);assert.equal(cents('1.995'),200);assert.equal(cents('0'),0);
  for(const invalid of ['','abc','-1','1,50','1e5',null])assert.equal(cents(invalid),null);
  assert.deepEqual(parseProductUrl('https://shopee.com.br/T%C3%AAnis-Casual-i.445566.22593727447?sp_atk=x'),{shopId:'445566',itemId:'22593727447'});
  assert.deepEqual(parseProductUrl('https://shopee.com.br/product/445566/22593727447'),{shopId:'445566',itemId:'22593727447'});
  assert.equal(parseProductUrl('https://evil.example.com/x-i.1.2'),null);assert.equal(parseProductUrl('não é link'),null);
});

test('assinatura aceita pelo mock, segredo fora do estado/backup/atividade e conexão persiste após reinício',async t=>{
  const mock=await provider(t),f=await fixture(t,mock);
  assert.equal((await json(await f.request('/api/shopee'))).status,'credentials_required');
  await json(await f.request('/api/shopee',{method:'PUT',body:{appId:'abc',secret:SECRET}}),400);
  const saved=await configure(f);assert.equal(saved.status,'configured');assert.equal(saved.appId,'•••2345');
  const tested=await json(await f.request('/api/shopee/test',{method:'POST'}));assert.equal(tested.status,'connected');assert.equal(mock.calls.length,1);
  for(const route of ['/api/state','/api/shopee','/api/backup']){const text=Buffer.from(await (await f.request(route)).arrayBuffer()).toString('latin1');assert.ok(!text.includes(SECRET),route+' expôs o segredo');assert.ok(!text.includes(APP_ID),route+' expôs o AppID completo');}
  const stored=JSON.parse(await fs.readFile(path.join(f.dir,'private','shopee.json'),'utf8'));assert.equal(stored.config.secret,SECRET);
  await f.restart();assert.equal((await json(await f.request('/api/shopee'))).status,'connected');
  await json(await f.request('/api/shopee',{method:'DELETE'}));assert.equal((await json(await f.request('/api/shopee'))).status,'credentials_required');
});

test('busca escapa o texto no GraphQL, normaliza a oferta e aceita link de produto colado',async t=>{
  const mock=await provider(t),f=await fixture(t,mock);await configure(f);
  await json(await f.request('/api/shopee/search',{method:'POST',body:{keyword:'  '}}),400);assert.equal(mock.calls.length,0);
  const keyword='tênis "branco"){x} \\ }';
  const result=await json(await f.request('/api/shopee/search',{method:'POST',body:{keyword,sort:'commission',limit:10}}));
  const literal=mock.calls[0].match(/keyword:("(?:[^"\\]|\\.)*")/)[1];assert.equal(JSON.parse(literal),keyword);assert.match(mock.calls[0],/sortType:5,page:1,limit:10/);
  const [offer]=result.items;assert.equal(offer.itemId,'22593727447');assert.equal(offer.price,123456);assert.equal(offer.priceMax,129990);assert.equal(offer.commissionRate,0.08);assert.equal(offer.discountRate,30);assert.equal(offer.offerLink,'https://s.shopee.com.br/Xy9?utm=a&b=2');assert.equal(result.hasNextPage,true);assert.equal(offer.periodEnd,'2030-01-01T00:00:00.000Z');
  await json(await f.request('/api/shopee/search',{method:'POST',body:{keyword:'https://shopee.com.br/Produto-i.445566.22593727447'}}));assert.match(mock.calls[1],/itemId:22593727447,shopId:445566/);assert.doesNotMatch(mock.calls[1],/keyword:/);
  await json(await f.request('/api/shopee/search',{method:'POST',body:{keyword:'x',sort:'aleatorio'}}),400);await json(await f.request('/api/shopee/search',{method:'POST',body:{keyword:'x',limit:51}}),400);
});

test('importação usa só a oferta devolvida pela API, baixa a foto permitida e não duplica',async t=>{
  const mock=await provider(t);mock.state.nodes=[
    {itemId:1001,productName:'Bolsa fictícia',imageUrl:mock.url+'/img/ok.png',priceMin:'89.9',offerLink:'https://s.shopee.com.br/bolsa?ref=literal&b=2'},
    {itemId:1002,productName:'Foto fora da Shopee',imageUrl:'https://evil.example.com/foto.png',priceMin:'10',offerLink:'https://s.shopee.com.br/b2'},
    {itemId:1003,productName:'SVG disfarçado',imageUrl:mock.url+'/img/fake.png',priceMin:'',offerLink:'https://s.shopee.com.br/b3'},
    {itemId:1004,productName:'Sem link',imageUrl:'',priceMin:'5',offerLink:''},
  ];
  const f=await fixture(t,mock);await configure(f);
  await json(await f.request('/api/shopee/import',{method:'POST',body:{itemIds:['1001']}}));// sem busca, nada no cache
  let state=await json(await f.request('/api/state'));assert.equal(state.products.length,0);
  await json(await f.request('/api/shopee/search',{method:'POST',body:{keyword:'bolsa'}}));
  const result=await json(await f.request('/api/shopee/import',{method:'POST',body:{itemIds:['1001','1002','1003','1004','9999','x;drop']}}));
  const by=Object.fromEntries(result.results.map(r=>[r.itemId,r]));assert.equal(result.imported,3);
  assert.equal(by['1001'].status,'imported');assert.equal(by['1001'].message,undefined);
  assert.equal(by['1002'].status,'imported');assert.match(by['1002'].message,/fora dos servidores/);
  assert.equal(by['1003'].status,'imported');assert.match(by['1003'].message,/PNG, JPEG ou WebP/);
  assert.equal(by['1004'].status,'error');assert.equal(by['9999'].status,'expired');assert.equal(by['x;drop'].status,'error');
  state=await json(await f.request('/api/state'));const bolsa=state.products.find(p=>p.title==='Bolsa fictícia');
  assert.equal(bolsa.affiliateUrl,'https://s.shopee.com.br/bolsa?ref=literal&b=2');assert.equal(bolsa.price,8990);assert.equal(bolsa.originalPrice,0);assert.equal(bolsa.marketplace,'shopee');assert.equal(bolsa.status,'ready');assert.deepEqual(bolsa.tags,['shopee','shopee:1001']);
  const image=await f.request(bolsa.image);assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
  assert.equal(state.products.find(p=>p.title==='SVG disfarçado').status,'draft');assert.equal(state.products.find(p=>p.title==='SVG disfarçado').image,'');
  const again=await json(await f.request('/api/shopee/import',{method:'POST',body:{itemIds:['1001']}}));assert.equal(again.results[0].status,'duplicate');
  assert.equal((await fs.readdir(path.join(f.dir,'media'))).length,1,'imagem rejeitada ou duplicada ficou no disco');
});

test('link de afiliado só para endereços da Shopee; erros de acesso e de limite são distintos',async t=>{
  const mock=await provider(t),f=await fixture(t,mock);
  await json(await f.request('/api/shopee/link',{method:'POST',body:{url:'https://shopee.com.br/x'}}),400);// sem configuração
  await configure(f);
  await json(await f.request('/api/shopee/link',{method:'POST',body:{url:'https://evil.example.com/shopee.com.br'}}),400);
  await json(await f.request('/api/shopee/link',{method:'POST',body:{url:'https://shopee.com.br/x',subIds:['ok','com espaço']}}),400);assert.equal(mock.calls.length,0);
  const short=await json(await f.request('/api/shopee/link',{method:'POST',body:{url:'https://shopee.com.br/Produto-i.1.2?sp=1',subIds:['whatsapp','grupo_1']}}));
  assert.equal(short.shortLink,'https://s.shopee.com.br/AbC123?lp=aff&x=1');assert.match(mock.calls[0],/originUrl:"https:\/\/shopee.com.br\/Produto-i.1.2\?sp=1",subIds:\["whatsapp","grupo_1"\]/);
  await json(await f.request('/api/shopee/test',{method:'POST'}));
  mock.state.mode='rate';await json(await f.request('/api/shopee/search',{method:'POST',body:{keyword:'x'}}),429);assert.equal((await json(await f.request('/api/shopee'))).status,'connected');
  mock.state.mode='noAccess';const denied=await json(await f.request('/api/shopee/test',{method:'POST'}),403);assert.match(denied.error,/não tem acesso/);
  const status=await json(await f.request('/api/shopee'));assert.equal(status.status,'error');assert.match(status.lastError,/não tem acesso/);
});

test('credencial errada é recusada pela assinatura e variáveis de ambiente têm precedência',async t=>{
  const mock=await provider(t);
  const wrong=await fixture(t,mock);await json(await wrong.request('/api/shopee',{method:'PUT',body:{appId:APP_ID,secret:'outra_chave_ficticia_123'}}));
  const refused=await json(await wrong.request('/api/shopee/test',{method:'POST'}),502);assert.match(refused.error,/AppID e a chave secreta/);
  const f=await fixture(t,mock,{env:{VITRAYA_SHOPEE_APP_ID:APP_ID,VITRAYA_SHOPEE_SECRET:SECRET}});
  const status=await json(await f.request('/api/shopee'));assert.equal(status.source,'environment');assert.equal(status.status,'configured');
  await json(await f.request('/api/shopee',{method:'PUT',body:{appId:APP_ID,secret:SECRET}}),409);await json(await f.request('/api/shopee',{method:'DELETE'}),409);
  assert.equal((await json(await f.request('/api/shopee/test',{method:'POST'}))).status,'connected');
  await f.restart();assert.equal((await json(await f.request('/api/shopee'))).status,'connected');
});
