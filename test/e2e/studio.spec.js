import {test as base,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import {isolatedServer} from '../../scripts/e2e-server.mjs';

const shots=path.resolve('docs/screenshots');
const test=base.extend({
 appServer:async({},use)=>{const instance=await isolatedServer();try{await use(instance);}finally{await instance.close();}},
 baseURL:async({appServer},use)=>use(appServer.url),
});

async function nav(page,label){
 // Espera o app sair da tela de carregamento: isVisible() não espera, e no celular o menu ainda não existiria.
 await page.locator('.app-shell').waitFor();
 const menu=page.getByRole('button',{name:'Abrir navegação',exact:true});
 if(await menu.isVisible())await menu.click();
 await page.locator('.sidebar').getByRole('button',{name:new RegExp('^'+label+'(?:\\s|$)')}).click();
}
async function state(page){return (await page.request.get('/api/state')).json();}
async function imageFixture(page){
 const data=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=500;canvas.height=500;const ctx=canvas.getContext('2d');ctx.fillStyle='#d6f6e4';ctx.fillRect(0,0,500,500);ctx.fillStyle='#5143c7';ctx.fillRect(140,160,220,220);ctx.strokeStyle='#29264c';ctx.lineWidth=18;ctx.beginPath();ctx.arc(250,160,75,Math.PI,0);ctx.stroke();return canvas.toDataURL('image/png');});
 return Buffer.from(data.split(',')[1],'base64');
}
async function downloadBytes(page,action){const pending=page.waitForEvent('download');await action();const item=await pending;return {name:item.suggestedFilename(),buffer:await readFile(await item.path())};}
async function screenshot(page,name){await mkdir(shots,{recursive:true});const close=page.getByRole('button',{name:'Fechar aviso',exact:true});if(await close.isVisible())await close.click();await page.evaluate(()=>{scrollTo(0,0);document.activeElement?.blur();});await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode();})));await page.screenshot({path:path.join(shots,name+'.png'),fullPage:true,animations:'disabled'});}
async function assertNoOverflow(page){const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width+1);}
async function canvasReady(page,width=1080,height=1080){await expect(page.locator('.render-status')).toHaveCount(0);await expect.poll(()=>page.locator('canvas').evaluate(c=>[c.width,c.height])).toEqual([width,height]);}

test('fluxo pessoal: CRUD, importação com foto, mensagens, fila sem duplicar, persistência e exportações',async({page,appServer})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Boas ofertas começam aqui.'})).toBeVisible();
 await page.getByRole('button',{name:'Novo produto',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Um novo achado'});
 await expect(dialog).toHaveAccessibleName('Um novo achado');
 await dialog.getByLabel('Nome do produto',{exact:true}).fill('Bolsa fictícia QA');
 await dialog.getByLabel('Preço atual (R$)',{exact:true}).fill('1.234');
 await dialog.getByLabel('Preço original (R$)',{exact:true}).fill('1.500,00');
 const affiliate='https://example.com/bolsa?b=2&a=1%2F2';
 await dialog.getByLabel('Link de afiliado').fill(affiliate);
 await dialog.getByLabel('Cupom',{exact:true}).fill('QA20');
 await dialog.getByRole('combobox',{name:/^Status/}).selectOption('ready');
 const png=await imageFixture(page);
 await dialog.locator('input[type=file]').setInputFiles({name:'bolsa-qa.png',mimeType:'image/png',buffer:png});
 await expect(dialog.locator('.photo-upload img')).toHaveAttribute('src',/^\/media\//);
 await dialog.getByRole('button',{name:'Salvar produto',exact:true}).click();
 await expect(dialog).toHaveCount(0);
 let data=await state(page);expect(data.products[0].price).toBe(123400);expect(data.products[0].affiliateUrl).toBe(affiliate);
 await page.getByRole('button',{name:'Editar Bolsa fictícia QA',exact:true}).click();
 const edit=page.getByRole('dialog',{name:'Editar produto'});
 await edit.getByLabel('Nome do produto',{exact:true}).fill('Bolsa revisada QA');
 await edit.getByLabel('Preço atual (R$)',{exact:true}).fill('1.299,90');
 await edit.getByRole('button',{name:'Salvar produto',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Bolsa revisada QA',exact:true})).toBeVisible();
 expect((await state(page)).products[0].price).toBe(129990);

 await page.getByRole('button',{name:'Importar catálogo',exact:true}).click();
 const importer=page.getByRole('dialog',{name:'Seu catálogo, sem retrabalho'});
 const csv='titulo;marketplace;preço;preço original;link afiliado;imagem;categoria\r\nImportado fictício QA;Shopee;89,90;129,90;https://example.com/importado?x=1&y=2;foto-qa.png;Moda\r\nInválido;Shopee;preço ruim;;https://example.com/invalido;;\r\n';
 await importer.locator('.import-drop input').setInputFiles({name:'qa.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await expect(importer.getByText('1 produto(s) válidos',{exact:true})).toBeVisible();
 await expect(importer.getByText('1 erro(s)',{exact:true})).toBeVisible();
 // Foto grande de propósito: a importação precisa reduzi-la para o tamanho de WhatsApp.
 const bigPng=Buffer.from((await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=1200;const x=c.getContext('2d');x.fillStyle='#e8d6f6';x.fillRect(0,0,1600,1200);x.fillStyle='#5143c7';x.fillRect(400,300,800,600);return c.toDataURL('image/png');})).split(',')[1],'base64');
 await importer.locator('.image-association input:not([webkitdirectory])').setInputFiles({name:'foto-qa.png',mimeType:'image/png',buffer:bigPng});
 await expect(importer.getByText('1 foto(s) na pasta · 1 de 1 produto(s) com foto',{exact:true})).toBeVisible();
 await importer.getByRole('button',{name:'Importar 1 produto(s)',exact:true}).click();
 await expect(importer.getByRole('heading',{name:'Catálogo atualizado'})).toBeVisible();
 await importer.getByRole('button',{name:'Ver meu catálogo',exact:true}).click();
 data=await state(page);expect(data.products).toHaveLength(2);expect(data.products.find(p=>p.title==='Importado fictício QA').image).toMatch(/^\/media\//);
 const importedImage=data.products.find(p=>p.title==='Importado fictício QA').image;expect(importedImage).toMatch(/\.jpg$/);
 const importedSize=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();return [i.naturalWidth,i.naturalHeight];},importedImage);expect(importedSize).toEqual([1080,810]);

 await nav(page,'Canais');
 await page.getByLabel('Nome',{exact:true}).fill('Canal fictício QA');
 await page.getByLabel('Endereço do canal').fill('https://example.com/canal-qa');
 await page.getByRole('button',{name:'Salvar canal',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Canal fictício QA',exact:true})).toBeVisible();
 await nav(page,'Mensagens');
 await page.getByLabel('Nome do modelo',{exact:true}).fill('Modelo fictício QA');
 await page.getByRole('textbox',{name:/^Mensagem/}).fill('{titulo}\nPor {preco}\n{link}\nPublicidade · QA');
 await page.getByRole('button',{name:'Salvar modelo',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Modelo fictício QA',exact:true})).toBeVisible();
 await nav(page,'Estúdio criativo');
 data=await state(page);const product=data.products.find(p=>p.title==='Bolsa revisada QA');
 await page.getByRole('combobox',{name:/^Produto/}).selectOption(product.id);
 await page.getByRole('combobox',{name:/^Modelo de legenda/}).selectOption(data.templates.find(t=>t.name==='Modelo fictício QA').id);
 await canvasReady(page);
 await expect(page.getByRole('textbox',{name:/^Legenda da publicação/})).toHaveValue('Bolsa revisada QA\nPor R$ 1.299,90\n'+affiliate+'\nPublicidade · QA');
 await page.getByRole('button',{name:'Adicionar à fila',exact:true}).click();
 const schedule=page.getByRole('dialog',{name:'Organizar publicação'});
 await schedule.getByLabel('Data e horário (neste computador)',{exact:true}).fill('2027-01-15T14:30');
 await schedule.getByRole('button',{name:'Salvar na fila',exact:true}).click({clickCount:2});
 await expect(schedule).toHaveCount(0);expect((await state(page)).campaigns).toHaveLength(1);
 await nav(page,'Fila de publicação');
 await expect(page.locator('.queue-item')).toHaveCount(1);
 await page.getByRole('button',{name:'Confirmar publicação',exact:true}).click();
 await page.getByRole('button',{name:'Sim, marcar como publicada',exact:true}).click();
 await page.getByRole('button',{name:'Publicadas',exact:true}).click();
 await expect(page.locator('.queue-item')).toHaveCount(1);expect((await state(page)).campaigns[0].status).toBe('done');

 await nav(page,'Preferências');
 await page.getByLabel('Nome nas artes',{exact:true}).fill('Curadoria fictícia QA');
 await page.getByLabel('Assinatura da mensagem').fill('Apenas dados fictícios de teste');
 await page.getByRole('button',{name:'Salvar preferências',exact:true}).click();
 for(const format of ['csv','json','xlsx']){
  const file=await downloadBytes(page,()=>page.getByRole('link',{name:format.toUpperCase(),exact:true}).click());
  expect(file.name).toMatch(new RegExp('\\.'+format+'$'));
  if(format==='json'){const rows=JSON.parse(file.buffer);expect(rows).toHaveLength(2);expect(rows.find(p=>p.id===product.id).affiliateUrl).toBe(affiliate);}
  if(format==='csv'){expect(file.buffer.toString('utf8')).toContain(affiliate);expect(file.buffer.toString('utf8')).toContain('129990');}
  if(format==='xlsx'){const book=new ExcelJS.Workbook();await book.xlsx.load(file.buffer);expect(book.worksheets[0].rowCount).toBe(3);}
 }
 const backup=await downloadBytes(page,()=>page.getByRole('link',{name:'Baixar backup com fotos',exact:true}).click());
 const zip=await JSZip.loadAsync(backup.buffer);const manifest=JSON.parse(await zip.file('manifest.json').async('string'));expect(manifest.products).toHaveLength(2);expect(manifest.campaigns).toHaveLength(1);expect(Object.keys(zip.files).filter(n=>/^media\/.+\.(?:png|jpg|webp)$/.test(n))).toHaveLength(2);expect(Object.keys(zip.files).some(n=>/^media\/.+\.jpg$/.test(n))).toBe(true);
 await appServer.restart();await page.reload();
 await expect(page.getByRole('heading',{name:'Boas ofertas começam aqui.'})).toBeVisible();
 expect((await state(page)).products).toHaveLength(2);expect((await state(page)).settings.brand).toBe('Curadoria fictícia QA');
 await page.getByLabel('Selecionar Bolsa revisada QA',{exact:true}).check();
 const kit=await downloadBytes(page,()=>page.getByRole('button',{name:'Baixar kit de ofertas',exact:true}).click());
 const kitZip=await JSZip.loadAsync(kit.buffer);expect(Object.keys(kitZip.files).some(n=>n.endsWith('/arte.png'))).toBe(true);expect(Object.keys(kitZip.files).some(n=>n.endsWith('/mensagem.txt'))).toBe(true);
 await page.getByRole('button',{name:'Editar Bolsa revisada QA',exact:true}).click();
 await page.getByRole('dialog',{name:'Editar produto'}).getByRole('button',{name:'Excluir',exact:true}).click();
 await page.getByRole('button',{name:'Excluir produto',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Bolsa revisada QA',exact:true})).toHaveCount(0);
 data=await state(page);expect(data.products).toHaveLength(1);expect(data.campaigns).toHaveLength(0);expect(errors).toEqual([]);
});

test('Canvas: três direções, três formatos e arquivos PNG/JPG com dimensões reais',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Explorar com exemplos fictícios',exact:true}).click();
 await expect(page.locator('.product-card')).toHaveCount(4);await nav(page,'Estúdio criativo');
 const styles=[['Boutique','boutique'],['Oferta direta','direta'],['Essencial','essencial']];
 const formats=[['quadrado',1080],['feed',1350],['story',1920]];
 const colors=[];
 for(const [label,id] of styles){
  await page.locator('.style-option').filter({hasText:label}).click();
  for(const [format,height] of formats){await page.getByRole('combobox',{name:/^Formato/}).selectOption(format);await canvasReady(page,1080,height);const pixel=await page.locator('canvas').evaluate(c=>[...c.getContext('2d').getImageData(0,0,1,1).data].slice(0,3).join(','));colors.push({id,format,pixel,width:1080,height});const art=await downloadBytes(page,()=>page.getByRole('button',{name:'Baixar arte',exact:true}).click());expect(art.buffer.readUInt32BE(16)).toBe(1080);expect(art.buffer.readUInt32BE(20)).toBe(height);await mkdir(shots,{recursive:true});await writeFile(path.join(shots,`arte-${id}-1080x${height}.png`),art.buffer);}
  await page.getByRole('combobox',{name:/^Formato/}).selectOption('quadrado');await canvasReady(page);
  const file=await downloadBytes(page,()=>page.getByRole('button',{name:'Baixar arte',exact:true}).click());expect(file.buffer.readUInt32BE(16)).toBe(1080);expect(file.buffer.readUInt32BE(20)).toBe(1080);
  await screenshot(page,'studio-'+id+'-1440');
  await page.setViewportSize({width:390,height:844});await screenshot(page,'studio-'+id+'-390');await page.setViewportSize({width:1440,height:1000});
 }
 expect(new Set(colors.map(x=>x.pixel)).size).toBe(3);
 await page.getByRole('combobox',{name:/^Arquivo/}).selectOption('jpg');
 const jpg=await downloadBytes(page,()=>page.getByRole('button',{name:'Baixar arte',exact:true}).click());
 const jpgSize=await page.evaluate(async bytes=>{const b=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/jpeg'}));return [b.width,b.height];},[...jpg.buffer]);expect(jpgSize).toEqual([1080,1080]);
 await mkdir(shots,{recursive:true});await writeFile(path.join(shots,'canvas-dimensoes.json'),JSON.stringify({colors,jpgSize},null,2));expect(errors).toEqual([]);
});

test('cupons, favoritos e conexões não configuradas pelo UI, sem envio real',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'Explorar com exemplos fictícios',exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(4);
 await page.getByRole('button',{name:'Favoritar Fone sem fio · exemplo',exact:true}).click();
 await page.getByRole('combobox',{name:'Filtrar status',exact:true}).selectOption('favorites');await expect(page.locator('.product-card')).toHaveCount(1);
 expect((await state(page)).products.find(p=>p.title.startsWith('Fone')).tags).toContain('favorito');
 await nav(page,'Cupons');
 await page.getByLabel('Código do cupom',{exact:true}).fill('QA20');
 await page.getByLabel('Desconto (% inteiro)',{exact:true}).fill('20');
 await page.getByLabel('Compra mínima (R$)',{exact:true}).fill('100,00');
 await page.getByLabel('Teto de desconto (R$)',{exact:true}).fill('20,00');
 await page.getByRole('combobox',{name:/^Onde este cupom vale/}).selectOption('all');
 await page.getByRole('button',{name:'Salvar cupom',exact:true}).click();
 await expect(page.getByRole('heading',{name:'QA20 · 20%',exact:true})).toBeVisible();
 const data=await state(page);const phone=data.products.find(p=>p.title.startsWith('Fone'));
 await page.getByRole('combobox',{name:/^Produto da simulação/}).selectOption(phone.id);
 await expect(page.getByText('QA20: R$ 109,90',{exact:true})).toBeVisible();
 expect(data.coupons.find(c=>c.code==='QA20')).toMatchObject({value:20,minSpend:10000,maxDiscount:2000});
 await page.getByRole('button',{name:'Editar cupom',exact:true}).click();
 await page.getByLabel('Desconto (% inteiro)',{exact:true}).fill('10');await page.getByRole('button',{name:'Salvar cupom',exact:true}).click();
 await expect(page.getByRole('heading',{name:'QA20 · 10%',exact:true})).toBeVisible();
 await screenshot(page,'cupons-simulacao-1440');
 await page.getByRole('button',{name:'Excluir cupom',exact:true}).click();await page.getByRole('button',{name:'Confirmar exclusão de QA20',exact:true}).click();
 await expect(page.getByRole('heading',{name:'QA20 · 10%',exact:true})).toHaveCount(0);expect((await state(page)).coupons).toHaveLength(0);
 await nav(page,'Integrações');await expect(page.getByRole('heading',{name:'Conectar publicação',exact:true})).toBeVisible();
 const connectors=await (await page.request.get('/api/connectors')).json();expect(connectors).toHaveLength(2);expect(connectors.every(c=>!c.configured)).toBe(true);
 await expect(page.locator('.connections-section')).not.toContainText('Conectado');
 await nav(page,'Estúdio criativo');await canvasReady(page);await page.getByRole('button',{name:'Enviar por conexão',exact:true}).click();
 const send=page.getByRole('dialog',{name:'Publicar oferta'});await expect(send).toBeVisible();await expect(send.getByRole('button',{name:'Enviar oferta agora',exact:true})).toBeDisabled();
 await send.getByRole('button',{name:'Voltar',exact:true}).click();expect(errors).toEqual([]);
 await nav(page,'Canais');await page.getByLabel('Nome',{exact:true}).fill('Fila fictícia QA');await page.getByLabel('Endereço do canal').fill('https://example.com/fila-qa');await page.getByRole('button',{name:'Salvar canal',exact:true}).click();await expect(page.getByRole('heading',{name:'Fila fictícia QA',exact:true})).toBeVisible();
 await nav(page,'Catálogo');await page.getByLabel('Selecionar Fone sem fio · exemplo',{exact:true}).check();await page.getByLabel('Selecionar Bolsa urbana · exemplo',{exact:true}).check();await page.getByRole('button',{name:'Organizar fila',exact:true}).click();
 const bulk=page.getByRole('dialog',{name:'Uma oferta de cada vez'});await bulk.getByLabel('Começar em',{exact:true}).fill('2027-01-15T12:00');await bulk.getByLabel('Intervalo entre ofertas (minutos)',{exact:true}).fill('15');await expect(bulk.locator('.batch-preview li')).toHaveCount(2);await bulk.getByRole('button',{name:'Organizar fila',exact:true}).click();await expect(bulk).toHaveCount(0);
 const campaigns=(await state(page)).campaigns.sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt));expect(campaigns).toHaveLength(2);expect(campaigns.every(c=>c.deliveryMode==='manual')).toBe(true);expect(Date.parse(campaigns[1].scheduledAt)-Date.parse(campaigns[0].scheduledAt)).toBe(15*60_000);
});

test('Canvas mantém título, marca, cupom e assinatura longos dentro dos nove formatos',async({page})=>{
 await page.addInitScript(()=>{window.__qaText=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){const width=this.measureText(text).width;const left=this.textAlign==='center'?x-width/2:['right','end'].includes(this.textAlign)?x-width:x;window.__qaText.push({text,left,right:left+width,y,width:this.canvas.width,height:this.canvas.height});return original.call(this,text,x,y,...args);};});
 await page.goto('/');
 const product=await page.request.post('/api/products',{headers:{'X-Vitraya-Client':'1'},data:{title:'W'.repeat(200),price:129990,originalPrice:159990,coupon:'W'.repeat(60),marketplace:'shein',affiliateUrl:'https://example.com/long-qa',status:'ready'}});expect(product.status()).toBe(201);
 await page.request.put('/api/settings',{headers:{'X-Vitraya-Client':'1'},data:{brand:'W'.repeat(40),accent:'#5143c7',signature:'W'.repeat(200)}});await page.reload();await nav(page,'Estúdio criativo');await canvasReady(page);
 for(const label of ['Boutique','Oferta direta','Essencial'])for(const [format,height] of [['quadrado',1080],['feed',1350],['story',1920]]){await page.locator('.style-option').filter({hasText:label}).click();await page.getByRole('combobox',{name:/^Formato/}).selectOption(format);await canvasReady(page,1080,height);}
 const outOfBounds=await page.evaluate(()=>window.__qaText.filter(t=>t.left<-.5||t.right>t.width+.5||t.y<0||t.y>t.height));expect(outOfBounds).toEqual([]);
 await mkdir(shots,{recursive:true});await writeFile(path.join(shots,'canvas-texto-longo.json'),JSON.stringify(await page.evaluate(()=>({drawCalls:window.__qaText.length,outOfBounds:window.__qaText.filter(t=>t.left<-.5||t.right>t.width+.5||t.y<0||t.y>t.height)})),null,2));
});

for(const width of [1440,834,390])test('QA visual e navegação sem overflow em '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:width===390?844:1000});
 const errors=[];const failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.goto('/');await page.getByRole('button',{name:'Explorar com exemplos fictícios',exact:true}).click();
 await expect(page.locator('.product-card')).toHaveCount(4);await assertNoOverflow(page);await screenshot(page,'catalogo-'+width);
 const diagnostics=[];
 for(const label of ['Ofertas Shopee','Estúdio criativo','Fila de publicação','Canais','Mensagens','Cupons','Integrações','Preferências']){
  await nav(page,label);if(label==='Estúdio criativo')await canvasReady(page);
  await assertNoOverflow(page);
  const layout=await page.evaluate(()=>{const els=[...document.querySelectorAll('main button,main input,main select,main textarea,main a')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden');return {scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,unnamed:els.filter(e=>!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.closest('label')).map(e=>e.outerHTML.slice(0,180)),tinyTargets:els.filter(e=>{const r=e.getBoundingClientRect();return r.width<24||r.height<24;}).map(e=>({text:e.textContent.trim().slice(0,50),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))};});diagnostics.push({screen:label,...layout});expect(layout.unnamed).toEqual([]);
  if(['Estúdio criativo','Integrações','Cupons'].includes(label))await screenshot(page,(label==='Estúdio criativo'?'studio':label==='Cupons'?'cupons':'integracoes')+'-'+width);
 }
 await nav(page,'Catálogo');await page.getByRole('button',{name:'Novo produto',exact:true}).click();const modal=page.getByRole('dialog',{name:'Um novo achado'});await expect(modal).toBeVisible();await expect(modal).toHaveAccessibleName('Um novo achado');await assertNoOverflow(page);await screenshot(page,'produto-dialogo-'+width);await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
 await mkdir(shots,{recursive:true});await writeFile(path.join(shots,'layout-'+width+'.json'),JSON.stringify({width,diagnostics,errors,failed},null,2));expect(errors).toEqual([]);expect(failed).toEqual([]);
});
