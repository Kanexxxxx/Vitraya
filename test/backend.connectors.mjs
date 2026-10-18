import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { promises as fs } from 'node:fs';
import JSZip from 'jszip';
import { createApp } from '../server/app.mjs';
import { safeGateway, requestGateway } from '../server/connectors.mjs';
import { sniffImage } from '../server/validation.mjs';

const TOKEN='123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ_123456789';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function provider(t){const calls=[],state={failText:false,redirect:false};const server=http.createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);const buffer=Buffer.concat(chunks),method=req.url.split('/').at(-1);let body;try{body=JSON.parse(buffer.toString());}catch{body=buffer.toString();}calls.push({url:req.url,method,body,headers:req.headers,buffer});let result;
  if(state.redirect){res.writeHead(302,{Location:'http://169.254.169.254/latest/meta-data/'});res.end('{}');return;}
  if(req.url.startsWith('/bot')){if(method==='getMe')result={id:123456789,is_bot:true,username:'vitraya_test_bot'};else if(method==='getChat')result={id:-100123,type:'channel',title:'Canal fictício'};else if(method==='getChatMember')result={status:'administrator',can_post_messages:true};else if(state.failText&&method==='sendMessage'){res.writeHead(429,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:false,error_code:429,description:'Test rejection'}));return;}else result={message_id:calls.length};res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,result}));return;}
  if(req.url.startsWith('/instance/connectionState/'))result={instance:{instanceName:'test-instance',state:'open'}};else result={key:{id:'EVO-'+calls.length},status:'PENDING'};res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result));
});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));return {calls,state,url:'http://127.0.0.1:'+server.address().port};}
async function fixture(t,options={}){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vitraya-connector-'));let app=createApp({dataDir:dir,queueIntervalMs:0,...options}),address=await app.start(0);t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});});return {dir,get app(){return app;},async restart(){await app.close();app=createApp({dataDir:dir,queueIntervalMs:0,...options});address=await app.start(0);},async request(route,{method='GET',body}={}){return fetch(address.url+route,{method,headers:{...(method!=='GET'?{'X-Vitraya-Client':'1'}:{}),...(body&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{})},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});}};}
async function json(response,status=200){const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;}
function form(buffer,name){const data=new FormData();data.append('file',new Blob([buffer]),name);return data;}
async function product(f,image=''){return json(await f.request('/api/products',{method:'POST',body:{title:'Oferta fictícia',marketplace:'shein',price:12990,affiliateUrl:'https://example.com/produto?ref=literal',image,status:'ready'}}),201);}
async function telegramSetup(f,channelId){await json(await f.request('/api/connectors/telegram',{method:'PUT',body:{botToken:TOKEN,chatId:'-100123'}}));return json(await f.request('/api/connectors/telegram/test',{method:'POST',body:{channelId}}));}

test('Telegram real transport contra mock: teste sem envio, foto/legenda literal, idempotência e segredo fora do estado/backup',async t=>{
  const mock=await provider(t),f=await fixture(t,{connectorOptions:{env:{},telegramApiBase:mock.url}});
  const state=await telegramSetup(f);assert.equal(state.status,'connected');assert.equal(mock.calls.filter(c=>c.method.startsWith('send')).length,0);
  const upload=await json(await f.request('/api/media',{method:'POST',body:form(png,'foto.png')}),201),p=await product(f,upload.url);
  const message='✨ Oferta R$129,90\nhttps://example.com/produto?ref=literal&ordem=2';
  const receipt=await json(await f.request('/api/connectors/telegram/send',{method:'POST',body:{productId:p.id,channelId:'',message,confirm:true,idempotencyKey:'attempt_0001'}}));assert.equal(receipt.status,'sent');
  const sent=mock.calls.find(c=>c.method==='sendPhoto');assert.ok(sent.body.includes(message));assert.ok(!sent.body.includes('parse_mode'));assert.ok(sent.buffer.includes(png));
  const responseState=await (await f.request('/api/state')).text(),connectors=await (await f.request('/api/connectors')).text();assert.ok(!responseState.includes(TOKEN));assert.ok(!connectors.includes(TOKEN));
  const zip=await JSZip.loadAsync(await (await f.request('/api/backup')).arrayBuffer());assert.ok(!Object.keys(zip.files).some(name=>name.includes('private')));assert.ok(!(await zip.file('manifest.json').async('string')).includes(TOKEN));
  await f.restart();const repeat=await json(await f.request('/api/connectors/telegram/send',{method:'POST',body:{productId:p.id,channelId:'',message,confirm:true,idempotencyKey:'attempt_0001'}}));assert.equal(repeat.reused,true);assert.equal(mock.calls.filter(c=>c.method==='sendPhoto').length,1);
  await json(await f.request('/api/connectors/telegram/send',{method:'POST',body:{productId:p.id,channelId:'',message,confirm:false}}),400);
  await json(await f.request('/api/connectors/telegram',{method:'DELETE'}));assert.equal((await json(await f.request('/api/connectors')))[0].configured,false);
});

test('Telegram legenda longa preservada como texto separado, resultado parcial sem retry',async t=>{
  const mock=await provider(t),f=await fixture(t,{connectorOptions:{env:{},telegramApiBase:mock.url}});await telegramSetup(f);
  const upload=await json(await f.request('/api/media',{method:'POST',body:form(png,'foto.png')}),201),p=await product(f,upload.url);const message='A'.repeat(1030)+'\nhttps://example.com/afiliado?ref=original';
  mock.state.failText=true;const result=await json(await f.request('/api/connectors/telegram/send',{method:'POST',body:{productId:p.id,message,confirm:true,idempotencyKey:'long_attempt_01'}}),502);assert.equal(result.status,'partial');assert.equal(result.messageIds.length,1);assert.match(result.error,/Imagem enviada/);const photo=mock.calls.find(c=>c.method==='sendPhoto');assert.ok(!photo.body.includes('name="caption"'));assert.equal(mock.calls.find(c=>c.method==='sendMessage').body.text,message);
  const count=mock.calls.length;await json(await f.request('/api/connectors/telegram/send',{method:'POST',body:{productId:p.id,message,confirm:true,idempotencyKey:'long_attempt_01'}}),502);assert.equal(mock.calls.length,count);
});

test('Evolution v2 somente grupo/número, base64 local e destino inválido nunca cai no padrão',async t=>{
  const mock=await provider(t),f=await fixture(t,{connectorOptions:{env:{}}});
  await json(await f.request('/api/connectors/evolution',{method:'PUT',body:{baseUrl:mock.url,apiKey:'FAKE_LOCAL_TEST_KEY',instance:'test-instance',number:'120363123456789@g.us'}}));
  await json(await f.request('/api/connectors/evolution/test',{method:'POST',body:{}}));assert.equal(mock.calls[0].headers.apikey,'FAKE_LOCAL_TEST_KEY');assert.equal(mock.calls[0].url,'/instance/connectionState/test-instance');
  const upload=await json(await f.request('/api/media',{method:'POST',body:form(png,'foto.png')}),201),p=await product(f,upload.url);
  const message='Preço R$129,90\nhttps://example.com/produto?ref=literal';await json(await f.request('/api/connectors/evolution/send',{method:'POST',body:{productId:p.id,message,confirm:true}}));const sent=mock.calls.find(c=>c.url.startsWith('/message/sendMedia/'));assert.equal(sent.body.number,'120363123456789@g.us');assert.equal(sent.body.media,png.toString('base64'));assert.equal(sent.body.caption,message);
  for(const url of ['https://whatsapp.com/channel/example','https://chat.whatsapp.com/INVITE']){const c=await json(await f.request('/api/channels',{method:'POST',body:{name:'Não suportado',type:'whatsapp',url}}),201);const count=mock.calls.length;await json(await f.request('/api/connectors/evolution/send',{method:'POST',body:{productId:p.id,channelId:c.id,message,confirm:true}}),400);assert.equal(mock.calls.length,count);}
});

test('destinos Telegram inválidos e rede privada/metadata/redirect são recusados',async t=>{
  const mock=await provider(t),f=await fixture(t,{connectorOptions:{env:{},telegramApiBase:mock.url}});await telegramSetup(f);const p=await product(f);
  for(const url of ['https://t.me/+invite','https://example.com/telegram','https://t.me/c/123/456']){const c=await json(await f.request('/api/channels',{method:'POST',body:{name:'Destino inválido',type:'telegram',url}}),201);const count=mock.calls.length;await json(await f.request('/api/connectors/telegram/send',{method:'POST',body:{productId:p.id,channelId:c.id,message:'Não enviar',confirm:true}}),400);assert.equal(mock.calls.length,count);}
  for(const url of ['http://example.com','https://169.254.169.254','https://10.0.0.1','https://192.168.1.1','https://[::ffff:169.254.169.254]','https://metadata.google.internal'])await assert.rejects(safeGateway(url));
  mock.state.redirect=true;await assert.rejects(requestGateway(mock.url),/Redirecionamento/);
});

test('fila automática opt-in usa mocks, dedup persistente, não repete falha e reinício vira unknown',async t=>{
  const mock=await provider(t),options={connectorOptions:{env:{},telegramApiBase:mock.url}},f=await fixture(t,options);const p=await product(f);const c=await json(await f.request('/api/channels',{method:'POST',body:{name:'Canal fictício',type:'telegram',url:'https://t.me/test_channel'}}),201);await telegramSetup(f,c.id);
  const body={productId:p.id,channelId:c.id,scheduledAt:new Date(Date.now()-1000).toISOString(),message:'Oferta futura https://example.com/produto',deliveryMode:'telegram'};
  await json(await f.request('/api/campaigns',{method:'POST',body}),400);
  const first=await json(await f.request('/api/campaigns',{method:'POST',body:{...body,confirmAutomatic:true}}),201);const duplicate=await json(await f.request('/api/campaigns',{method:'POST',body:{...body,confirmAutomatic:true}}));assert.equal(first.id,duplicate.id);
  await f.app.processQueue();let state=await json(await f.request('/api/state'));assert.equal(state.campaigns[0].status,'done');assert.equal(state.campaigns[0].receipt.status,'sent');const accepted=mock.calls.filter(c=>c.method==='sendMessage').length;assert.equal(accepted,1);await f.app.processQueue();assert.equal(mock.calls.filter(c=>c.method==='sendMessage').length,accepted);
  mock.state.failText=true;const failed=await json(await f.request('/api/campaigns',{method:'POST',body:{...body,message:'Falha planejada',confirmAutomatic:true}}),201);await f.app.processQueue();state=await json(await f.request('/api/state'));assert.equal(state.campaigns.find(v=>v.id===failed.id).status,'failed');const rejected=mock.calls.length;await f.app.processQueue();assert.equal(mock.calls.length,rejected);
  await json(await f.request('/api/campaigns/'+failed.id,{method:'PUT',body:{status:'ready'}}),409);
  const changed=await json(await f.request('/api/campaigns',{method:'POST',body:{...body,message:'Texto aprovado antes da edição',confirmAutomatic:true}}),201);await json(await f.request('/api/products/'+p.id,{method:'PUT',body:{price:13990}}));await f.app.processQueue();state=await json(await f.request('/api/state'));assert.equal(state.campaigns.find(v=>v.id===changed.id).status,'failed');assert.match(state.campaigns.find(v=>v.id===changed.id).deliveryError,/Produto.*mudou/);assert.equal(mock.calls.length,rejected);
  f.app.store.save('campaigns',{...first,id:'interrupted-campaign',status:'sending'});await f.restart();state=await json(await f.request('/api/state'));assert.equal(state.campaigns.find(v=>v.id==='interrupted-campaign').status,'unknown');await f.app.processQueue();assert.equal(mock.calls.length,rejected);
});

test('duas instâncias no mesmo SQLite reservam tentativa e campanha atomicamente',async t=>{
  const mock=await provider(t),dir=await fs.mkdtemp(path.join(os.tmpdir(),'vitraya-shared-')),options={dataDir:dir,queueIntervalMs:0,connectorOptions:{env:{VITRAYA_TELEGRAM_BOT_TOKEN:TOKEN,VITRAYA_TELEGRAM_CHAT_ID:'@test_channel'},telegramApiBase:mock.url}};
  const one=createApp(options),two=createApp(options),addresses=await Promise.all([one.start(0),two.start(0)]);t.after(async()=>{await Promise.all([one.close(),two.close()]);await fs.rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});});
  async function request(index,route,body){return fetch(addresses[index].url+route,{method:'POST',headers:{'X-Vitraya-Client':'1',...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body)});}
  const upload=await json(await request(0,'/api/media',form(png,'foto.png')),201),p=await json(await request(0,'/api/products',{title:'Foto fictícia',price:100,image:upload.url}),201),channel=await json(await request(0,'/api/channels',{name:'Teste',type:'telegram',url:'https://t.me/test_channel'}),201);
  await Promise.all([0,1].map(index=>request(index,'/api/connectors/telegram/test',{channelId:channel.id}).then(json)));
  const payload={productId:p.id,channelId:channel.id,message:'Uma tentativa simultânea',confirm:true,idempotencyKey:'shared_attempt_photo_01'};
  await Promise.all([0,1].map(index=>request(index,'/api/connectors/telegram/send',payload).then(r=>r.json())));
  assert.equal(mock.calls.filter(c=>c.method==='sendPhoto').length,1);assert.equal(one.store.all('deliveries').length,1);
  await json(await request(0,'/api/campaigns',{productId:p.id,channelId:channel.id,message:'Campanha concorrente',scheduledAt:new Date(Date.now()-1000).toISOString(),deliveryMode:'telegram',confirmAutomatic:true}),201);
  await Promise.all([one.processQueue(),two.processQueue()]);assert.equal(mock.calls.filter(c=>c.method==='sendPhoto').length,2);assert.equal(one.store.all('campaigns')[0].status,'done');
});

test('backup recusa catálogo acima do teto antes de criar arquivo; PNG/JPEG/WebP têm limites de dimensão',async t=>{
  const f=await fixture(t,{connectorOptions:{env:{}}});for(let i=0;i<6;i++){const filename=path.join(f.dir,'media',`${String(i).padStart(8,'0')}.png`),file=await fs.open(filename,'w');await file.truncate(9*1024*1024);await file.close();}
  const result=await json(await f.request('/api/backup'),413);assert.match(result.error,/50 MB/);assert.equal((await json(await f.request('/api/state'))).products.length,0);
  const huge=Buffer.from(png);huge.writeUInt32BE(20001,16);assert.throws(()=>sniffImage(huge),/dimensões/);assert.throws(()=>sniffImage(Buffer.from([255,216,255,0,0,0,0,0,0,0,255,217])),/JPEG/);
});
