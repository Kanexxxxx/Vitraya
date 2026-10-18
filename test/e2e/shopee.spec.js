import {test as base,expect} from '@playwright/test';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {isolatedServer} from '../../scripts/e2e-server.mjs';

const APP_ID='18300012345',SECRET='SEGREDO_FICTICIO_e2e_0123456789';
const shots=path.resolve('docs/screenshots');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');

// Shopee simulada em loopback: confere a assinatura de cada chamada; nenhuma rede externa.
async function fakeShopee(){
 const state={image:'',calls:0};
 const server=http.createServer(async(req,res)=>{
  const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString('utf8');
  const fields=Object.fromEntries(String(req.headers.authorization??'').replace(/^SHA256 /,'').split(',').map(p=>p.trim().split('=')));
  const ok=fields.Credential===APP_ID&&fields.Signature===createHash('sha256').update(fields.Credential+fields.Timestamp+body+SECRET).digest('hex');
  res.writeHead(200,{'Content-Type':'application/json'});
  if(!ok)return res.end(JSON.stringify({errors:[{message:'error [10020]: Invalid Signature',extensions:{code:10020,message:'Invalid Signature'}}]}));
  state.calls++;const query=JSON.parse(body).query;
  if(query.startsWith('mutation'))return res.end(JSON.stringify({data:{generateShortLink:{shortLink:'https://s.shopee.com.br/E2eLink?ref=1&x=2'}}}));
  const node=(itemId,productName,priceMin,commissionRate,sales)=>({itemId,shopId:900,productName,imageUrl:state.image,priceMin,priceMax:priceMin,priceDiscountRate:25,commissionRate,sales,ratingStar:'4.7',shopName:'Loja Fictícia de Testes',productLink:`https://shopee.com.br/produto-i.900.${itemId}`,offerLink:`https://s.shopee.com.br/Of${itemId}?utm=e2e&b=2`,periodEndTime:1893456000});
  res.end(JSON.stringify({data:{productOfferV2:{nodes:[node(7001,'Tênis casual branco · oferta fictícia','149.9','0.08',2310),node(7002,'Bolsa transversal de couro sintético com alça regulável · oferta fictícia','89.9','0.12',12850)],pageInfo:{page:1,limit:20,hasNextPage:false}}}}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {state,url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})};
}
const test=base.extend({
 shopee:async({},use)=>{const fake=await fakeShopee();try{await use(fake);}finally{await fake.close();}},
 appServer:async({shopee},use)=>{const instance=await isolatedServer(0,{shopeeOptions:{apiBase:shopee.url+'/graphql',imageHosts:['127.0.0.1']}});try{await use(instance);}finally{await instance.close();}},
 baseURL:async({appServer},use)=>use(appServer.url),
});
// Espera o app sair da tela de carregamento: isVisible() não espera, e no celular o menu ainda não existiria.
async function nav(page,label){await page.locator('.app-shell').waitFor();const menu=page.getByRole('button',{name:'Abrir navegação',exact:true});if(await menu.isVisible())await menu.click();await page.locator('.sidebar').getByRole('button',{name:new RegExp('^'+label+'(?:\\s|$)')}).click();}
async function noOverflow(page){const d=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));expect(d.scroll).toBeLessThanOrEqual(d.width+1);}
async function shot(page,name){await mkdir(shots,{recursive:true});const close=page.getByRole('button',{name:'Fechar aviso',exact:true});if(await close.isVisible())await close.click();await page.evaluate(()=>{scrollTo(0,0);document.activeElement?.blur();});await page.screenshot({path:path.join(shots,name+'.png'),fullPage:true});}

for(const width of [1440,390])test('Ofertas Shopee: conectar, buscar, importar com foto e converter link sem rede externa em '+width+'px',async({page,shopee,appServer})=>{
 await page.setViewportSize({width,height:width===390?844:1000});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 // Foto servida pelo próprio app, para o navegador exibir (CSP 'self') e o servidor baixar pela lista permitida.
 const upload=await (await page.request.post('/api/media',{headers:{'X-Vitraya-Client':'1'},multipart:{file:{name:'oferta.png',mimeType:'image/png',buffer:png}}})).json();
 shopee.state.image=appServer.url+upload.url;
 await page.goto('/');await nav(page,'Buscar e colar links');
 await expect(page.getByRole('heading',{name:'Achados da Shopee, já com o seu link.'})).toBeVisible();await noOverflow(page);await shot(page,'shopee-conectar-'+width);
 await page.getByLabel('AppID').fill(APP_ID);await page.getByLabel('Chave secreta').fill(SECRET);await page.getByRole('button',{name:'Salvar credenciais'}).click();
 await expect(page.locator('.status-pill',{hasText:'Teste a conexão'})).toBeVisible();
 await page.getByRole('button',{name:'Testar conexão'}).click();await expect(page.locator('.status-pill',{hasText:'Conexão testada'})).toBeVisible();
 const stateText=JSON.stringify(await (await page.request.get('/api/state')).json());expect(stateText).not.toContain(SECRET);expect(stateText).not.toContain(APP_ID);
 await page.getByLabel('Buscar ofertas na Shopee').fill('tênis "branco"');await page.getByLabel('Ordenar ofertas').selectOption('commission');await page.getByRole('button',{name:'Buscar ofertas'}).click();
 const cards=page.locator('.offer-card');await expect(cards).toHaveCount(2);await expect(cards.first()).toContainText('Comissão 8%');await expect(cards.first()).toContainText('R$ 149,90');await expect(cards.nth(1)).toContainText('13 mil vendidos');
 await noOverflow(page);await shot(page,'shopee-resultados-'+width);
 await page.getByLabel('Selecionar Tênis casual branco · oferta fictícia').check();await page.getByRole('button',{name:'Trazer para o catálogo'}).click();
 await expect(cards.first()).toContainText('No catálogo');await expect(page.getByRole('status').filter({hasText:'1 oferta(s) importada(s).'})).toBeVisible();
 const products=(await (await page.request.get('/api/state')).json()).products;expect(products).toHaveLength(1);
 expect(products[0]).toMatchObject({title:'Tênis casual branco · oferta fictícia',marketplace:'shopee',price:14990,originalPrice:0,affiliateUrl:'https://s.shopee.com.br/Of7001?utm=e2e&b=2',status:'ready'});expect(products[0].image).toMatch(/^\/media\/[a-f0-9-]+\.png$/);expect(products[0].image).not.toBe(upload.url);
 await page.getByLabel('Link da Shopee').fill('https://shopee.com.br/produto-i.900.7002');await page.getByLabel('Identificador (opcional)').fill('whatsapp');await page.getByRole('button',{name:'Gerar link'}).click();
 await expect(page.locator('.converter-result')).toContainText('https://s.shopee.com.br/E2eLink?ref=1&x=2');await noOverflow(page);
 await page.getByRole('button',{name:'Ver no catálogo'}).click();await expect(page.locator('.product-card')).toHaveCount(1);await expect(page.locator('.product-card')).toContainText('Tênis casual branco');
 expect(shopee.state.calls).toBe(3);expect(errors).toEqual([]);
});
