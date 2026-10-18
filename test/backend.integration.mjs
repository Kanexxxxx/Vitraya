import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { createApp } from '../server/app.mjs';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'vitraya-test-'));let app=createApp({dataDir:dir,staticDir:path.join(dir,'dist')});let address=await app.start(0);t.after(async()=>{await app.close();await fs.rm(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});});return {dir,get app(){return app;},get url(){return address.url;},async restart(){await app.close();app=createApp({dataDir:dir,staticDir:path.join(dir,'dist')});address=await app.start(0);},async request(route,{method='GET',body,headers={}}={}){const response=await fetch(address.url+route,{method,headers:{...(method!=='GET'?{'X-Vitraya-Client':'1'}:{}),...(body&&! (body instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});return response;}};}
function form(buffer,name){const data=new FormData();data.append('file',new Blob([buffer]),name);return data;}
const baseProduct={title:'Produto de teste',marketplace:'shein',price:12990,originalPrice:15990,coupon:'TESTE',affiliateUrl:'https://example.com/p?a=1&b=2',tags:['teste'],status:'ready'};
async function json(response,status=200){const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result;}

test('catálogo persiste, preserva URL literal, valida mutações e relacionamentos',async t=>{
  const f=await fixture(t);
  assert.deepEqual((await json(await f.request('/api/state'))).products,[]);
  const p=await json(await f.request('/api/products',{method:'POST',body:baseProduct}),201);
  assert.equal(p.affiliateUrl,baseProduct.affiliateUrl);assert.equal(p.price,12990);
  await json(await f.request('/api/products',{method:'POST',body:baseProduct}),409);
  await json(await f.request('/api/products',{method:'POST',body:{...baseProduct,affiliateUrl:'javascript:alert(1)'}}),400);
  await json(await f.request('/api/products',{method:'POST',body:{...baseProduct,price:1.25}}),400);
  const c=await json(await f.request('/api/channels',{method:'POST',body:{name:'Canal teste',type:'whatsapp',url:'https://example.com/canal'}}),201);
  const template=await json(await f.request('/api/templates',{method:'POST',body:{name:'Modelo',body:'{titulo} {preco} {link}'}}),201);
  const campaign=await json(await f.request('/api/campaigns',{method:'POST',body:{productId:p.id,channelId:c.id,templateId:template.id,message:'Uma oferta preparada.',scheduledAt:new Date(Date.now()-60000).toISOString()}}),201);
  assert.equal(campaign.status,'ready');
  await json(await f.request('/api/channels/'+c.id,{method:'DELETE'}),409);
  await json(await f.request('/api/campaigns/'+campaign.id,{method:'PUT',body:{status:'done'}}));
  await f.restart();
  const state=await json(await f.request('/api/state'));assert.equal(state.products[0].affiliateUrl,baseProduct.affiliateUrl);assert.equal(state.campaigns[0].status,'done');assert.equal(state.templates.length,1);
  await json(await f.request('/api/products/'+p.id,{method:'DELETE'}));assert.equal((await json(await f.request('/api/state'))).campaigns.length,0);
});

test('importação CSV brasileira, validação por linha, dedupe e XLSX/JSON round-trip',async t=>{
  const f=await fixture(t);
  const csv='titulo;marketplace;preço;preço original;link afiliado;descrição;imagem\r\n"Produto; com aspas ""legais""";SHEIN;"1.234,56";"1.500,00";https://example.com/a?x=1&y=2;"Linha um\nLinha dois";C:\\fotos\\minha-foto.png\r\nInválido;Shopee;valor ruim;;https://example.com/erro;;\r\n';
  const preview=await json(await f.request('/api/import/preview',{method:'POST',body:form(csv,'ofertas.csv')}));
  assert.equal(preview.rows.length,1);assert.equal(preview.rows[0].price,123456);assert.equal(preview.rows[0].originalPrice,150000);assert.equal(preview.rows[0]._imageName,'minha-foto.png');assert.equal(preview.errors.length,1);assert.equal(preview.warnings.length,1);
  const result=await json(await f.request('/api/import/commit',{method:'POST',body:{rows:[...preview.rows,...preview.rows,{title:'Ataque',price:-1}]}}));
  assert.equal(result.imported,1);assert.equal(result.skipped,1);assert.equal(result.errors.length,1);
  for(const format of ['json','csv','xlsx']){
    const exported=await f.request('/api/export?format='+format);assert.equal(exported.status,200);
    const imported=await json(await f.request('/api/import/preview',{method:'POST',body:form(await exported.arrayBuffer(),'export.'+format)}));
    assert.equal(imported.errors.length,0,JSON.stringify(imported.errors));assert.equal(imported.rows[0].price,123456);assert.equal(imported.rows[0].affiliateUrl,'https://example.com/a?x=1&y=2');
  }
  const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Ofertas');sheet.addRow(['nome','plataforma','valor','link']);sheet.addRow(['Tênis','TikTok Shop',129.9,'https://example.com/tenis']);
  const xlsx=await json(await f.request('/api/import/preview',{method:'POST',body:form(await workbook.xlsx.writeBuffer(),'produtos.xlsx')}));assert.equal(xlsx.rows[0].price,12990);assert.equal(xlsx.rows[0].marketplace,'tiktok');
  const malformed=await f.request('/api/import/preview',{method:'POST',body:form('nome;preco\n"não terminou','x.csv')});assert.equal(malformed.status,400);
});

test('reimportar a mesma planilha com foto preenche a imagem do produto que já existia sem foto',async t=>{
  const f=await fixture(t);
  const row={title:'Top cropped',marketplace:'shein',price:3671,affiliateUrl:'https://onelink.shein.com/57/abc?x=1',status:'draft'};
  const first=await json(await f.request('/api/import/commit',{method:'POST',body:{rows:[row]}}));assert.equal(first.imported,1);
  const upload=await json(await f.request('/api/media',{method:'POST',body:form(png,'S64988N_1.jpg')}),201);
  const second=await json(await f.request('/api/import/commit',{method:'POST',body:{rows:[{...row,image:upload.url}]}}));
  assert.equal(second.imported,0);assert.equal(second.updated,1);assert.equal(second.skipped,0);
  const state=await json(await f.request('/api/state'));assert.equal(state.products.length,1);assert.equal(state.products[0].image,upload.url);
  const third=await json(await f.request('/api/import/commit',{method:'POST',body:{rows:[{...row,image:upload.url}]}}));
  assert.equal(third.updated,0);assert.equal(third.skipped,1,'não deve trocar a foto de quem já tem');
});

test('planilha de automação (Situacao, PrecoBRL, Genero, título longo, loja desconhecida) entra sem rejeitar linhas',async t=>{
  const f=await fixture(t);const longo='Sandália '+'Salto Alto Formal '.repeat(25);
  const csv='ID;Loja;Nome;Categoria;PrecoBRL;PrecoOriginalBRL;LinkAfiliado;Foto;Situacao;Genero\r\n'+
    `1;SHEIN;Top cropped;Croppeds;36,71;48,95;https://onelink.shein.com/57/a?x=1;C:\\Fotos\\F\\S64988N_1.jpg;CONCLUIDO;Feminino\r\n`+
    `2;SHEIN;${longo};Sapatos;99,90;;https://onelink.shein.com/57/b;C:\\Fotos\\S2_1.jpg;PENDENTE_FOTO;Indefinido\r\n`+
    `3;Magalu;Panela;Casa;120,00;;https://example.com/panela;;ALGO_NOVO;Unissex\r\n`;
  const preview=await json(await f.request('/api/import/preview',{method:'POST',body:form(csv,'produtos.csv')}));
  assert.equal(preview.errors.length,0,JSON.stringify(preview.errors));assert.equal(preview.rows.length,3);
  const [top,sandalia,panela]=preview.rows;
  assert.equal(top.marketplace,'shein');assert.equal(top.price,3671);assert.equal(top.originalPrice,4895);assert.equal(top.status,'ready');assert.equal(top._imageName,'S64988N_1.jpg');assert.deepEqual(top.tags,['Feminino']);
  assert.equal(sandalia.status,'draft');assert.ok(sandalia.title.length<=300&&sandalia.title.endsWith('…'));assert.deepEqual(sandalia.tags,[],'gênero Indefinido não vira etiqueta');
  assert.equal(panela.marketplace,'outro');assert.ok(panela.tags.includes('Magalu'));assert.ok(panela.tags.includes('Unissex'));assert.equal(panela.status,'draft');
  const avisos=preview.warnings.map(w=>w.message).join(' | ');assert.match(avisos,/2 produto\(s\) indicam a foto/);assert.match(avisos,/1 título/);assert.match(avisos,/ALGO_NOVO/);assert.ok(preview.warnings.every(w=>w.row==null),'avisos-resumo, não um por linha');
});

test('exclusão em lote remove produtos e campanhas numa transação e recusa lista vazia',async t=>{
  const f=await fixture(t);
  const a=await json(await f.request('/api/products',{method:'POST',body:{...baseProduct,affiliateUrl:'https://example.com/a'}}),201);
  const b=await json(await f.request('/api/products',{method:'POST',body:{...baseProduct,affiliateUrl:'https://example.com/b'}}),201);
  const c=await json(await f.request('/api/products',{method:'POST',body:{...baseProduct,affiliateUrl:'https://example.com/c'}}),201);
  const channel=await json(await f.request('/api/channels',{method:'POST',body:{name:'Canal',type:'whatsapp',url:'https://example.com/canal'}}),201);
  await json(await f.request('/api/campaigns',{method:'POST',body:{productId:a.id,channelId:channel.id,message:'Oferta',scheduledAt:new Date(Date.now()+3600e3).toISOString()}}),201);
  await json(await f.request('/api/products/delete',{method:'POST',body:{ids:[]}}),400);
  const result=await json(await f.request('/api/products/delete',{method:'POST',body:{ids:[a.id,b.id,'nao-existe']}}));assert.equal(result.removed,2);
  const state=await json(await f.request('/api/state'));assert.deepEqual(state.products.map(p=>p.id),[c.id]);assert.equal(state.campaigns.length,0);
});

test('upload reconhece bytes, serve imagem local e rejeita SVG/HTML e imagens ausentes',async t=>{
  const f=await fixture(t);
  const upload=await json(await f.request('/api/media',{method:'POST',body:form(png,'../foto.png')}),201);assert.match(upload.url,/^\/media\/[a-f0-9-]+\.png$/);
  const image=await f.request(upload.url);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
  await json(await f.request('/api/media',{method:'POST',body:form('<svg onload="alert(1)"></svg>','fake.png')}),400);
  await json(await f.request('/api/products',{method:'POST',body:{...baseProduct,image:'/media/00000000.png'}}),400);
  const value=await json(await f.request('/api/products',{method:'POST',body:{...baseProduct,image:upload.url}}),201);assert.equal(value.image,upload.url);
  await json(await f.request('/api/media',{method:'POST',body:form(Buffer.alloc(10*1024*1024+1),'huge.png')}),413);
});

test('backup lógico com mídia é aditivo, restaura vínculos e rejeita ZIP inseguro antes de gravar',async t=>{
  const source=await fixture(t),dest=await fixture(t);
  const upload=await json(await source.request('/api/media',{method:'POST',body:form(png,'foto.png')}),201);
  const p=await json(await source.request('/api/products',{method:'POST',body:{...baseProduct,image:upload.url}}),201);
  const c=await json(await source.request('/api/channels',{method:'POST',body:{name:'Canal',type:'telegram'}}),201);
  await json(await source.request('/api/campaigns',{method:'POST',body:{productId:p.id,channelId:c.id,message:'Mensagem',scheduledAt:new Date(Date.now()+3600000).toISOString()}}),201);
  const backup=Buffer.from(await (await source.request('/api/backup')).arrayBuffer());
  await json(await dest.request('/api/settings',{method:'PUT',body:{brand:'Minha marca',accent:'#123456',signature:'Assinatura'}}));
  const result=await json(await dest.request('/api/restore',{method:'POST',body:form(backup,'backup.zip')}));assert.equal(result.imported,1);assert.equal(result.campaigns,1);
  const state=await json(await dest.request('/api/state'));assert.equal(state.settings.brand,'Minha marca');assert.equal(state.campaigns[0].productId,state.products[0].id);assert.notEqual(state.products[0].image,upload.url);assert.equal((await dest.request(state.products[0].image)).status,200);
  const again=await json(await dest.request('/api/restore',{method:'POST',body:form(backup,'backup.zip')}));assert.equal(again.imported,0);assert.equal(again.skipped,1);assert.equal(again.campaigns,0);
  // Rascunhos sem link também preservam identidade em restaurações repetidas.
  await json(await source.request('/api/products',{method:'POST',body:{title:'Rascunho sem link',price:0}}),201);
  const withDraft=Buffer.from(await (await source.request('/api/backup')).arrayBuffer());
  const draftRestore=await json(await dest.request('/api/restore',{method:'POST',body:form(withDraft,'backup.zip')}));assert.equal(draftRestore.imported,1);
  const draftRepeat=await json(await dest.request('/api/restore',{method:'POST',body:form(withDraft,'backup.zip')}));assert.equal(draftRepeat.imported,0);assert.equal(draftRepeat.skipped,2);
  const zip=new JSZip();zip.file('../outside.txt','unsafe');zip.file('manifest.json','{}');const bad=await zip.generateAsync({type:'nodebuffer'});
  await json(await dest.request('/api/restore',{method:'POST',body:form(bad,'unsafe.zip')}),400);
  const bomb=new JSZip();bomb.file('manifest.json',Buffer.alloc(2*1024*1024));await json(await dest.request('/api/restore',{method:'POST',body:form(await bomb.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),'bomb.zip')}),400);
  assert.equal((await json(await dest.request('/api/state'))).products.length,2);
});

test('proteções locais recusam Host, Origin e mutação sem cabeçalho; demo exige catálogo vazio',async t=>{
  const f=await fixture(t);
  const noHeader=await fetch(f.url+'/api/demo',{method:'POST'});assert.equal(noHeader.status,403);
  await json(await f.request('/api/demo',{method:'POST',headers:{Origin:'https://evil.example'}}),403);
  await json(await f.request('/api/settings',{method:'PUT',headers:{Origin:'http://127.0.0.1:4318'},body:{brand:'Dev local',accent:'#abcdef'}}));
  const status=await new Promise((resolve,reject)=>{const req=http.get(f.url+'/api/health',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(status,403);
  await json(await f.request('/api/demo',{method:'POST'}),201);await json(await f.request('/api/demo',{method:'POST'}),409);
  const state=await json(await f.request('/api/state'));assert.equal(state.products.length,4);assert.ok(state.products.every(p=>p.title.includes('exemplo')&&!p.affiliateUrl&&p.status==='draft'));assert.ok(state.integrations.every(i=>['manual','credentials_required'].includes(i.status)));
});

test('cupons têm CRUD persistente, backup aditivo e escopo remapeado sem mudar preço',async t=>{
  const source=await fixture(t),dest=await fixture(t);const p=await json(await source.request('/api/products',{method:'POST',body:baseProduct}),201),existing=await json(await dest.request('/api/products',{method:'POST',body:baseProduct}),201);
  const input={code:'TESTE10',marketplace:'shein',type:'percent',value:10,minSpend:10000,maxDiscount:2000,startsAt:'',expiresAt:'',productIds:[p.id],category:'',active:true};
  const coupon=await json(await source.request('/api/coupons',{method:'POST',body:input}),201);await json(await source.request('/api/coupons/'+coupon.id,{method:'PUT',body:{value:15}}));await json(await source.request('/api/coupons',{method:'POST',body:{...input,value:101}}),400);
  await source.restart();const state=await json(await source.request('/api/state'));assert.equal(state.coupons[0].value,15);assert.equal(state.products[0].price,12990);
  const backup=await (await source.request('/api/backup')).arrayBuffer(),restored=await json(await dest.request('/api/restore',{method:'POST',body:form(backup,'backup.zip')}));assert.equal(restored.coupons,1);const coupons=await json(await dest.request('/api/coupons'));assert.deepEqual(coupons[0].productIds,[existing.id]);assert.equal((await json(await dest.request('/api/state'))).products[0].price,12990);
  await json(await dest.request('/api/coupons/'+coupons[0].id,{method:'DELETE'}));assert.equal((await json(await dest.request('/api/coupons'))).length,0);
});
