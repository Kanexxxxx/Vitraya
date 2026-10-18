export const markets = {shein:'SHEIN',shopee:'Shopee',mercadolivre:'Mercado Livre',tiktok:'TikTok Shop',amazon:'Amazon',outro:'Outro'};
export const money = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((value||0)/100);
export function cents(value) { const str=String(value).replace(/R\$|\s/g,''); if(!str)return NaN;let normalized;if(/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(str))normalized=str.replace(/\./g,'').replace(',','.');else if(/^\d+(,\d{1,2}|\.\d{1,2})?$/.test(str))normalized=str.replace(',','.');else return NaN;const n=Number(normalized);return Number.isSafeInteger(Math.round(n*100))?Math.round(n*100):NaN; }
export const discount = p => p.originalPrice>p.price?Math.round((1-p.price/p.originalPrice)*100):0;
export const slug = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'oferta';
export const defaultBody = '✨ {titulo}\n\n{preco_original}💰 Por {preco}\n{desconto}{cupom}\n🛍️ Aproveite aqui:\n{link}\n\n{assinatura}\nPublicidade · link de afiliado. Preço e disponibilidade sujeitos à loja.';
// Reduz a foto no navegador para ficar leve no WhatsApp (lado maior <= max, JPEG). Sem dependência nem envio externo.
export async function shrinkImage(file,max=1080,quality=0.82){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Imagem inválida: '+(file.name||'arquivo')));i.src=url;});
  const scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
  const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
  if(!blob)throw new Error('Não foi possível processar '+(file.name||'a imagem'));
  return blob;
 }finally{URL.revokeObjectURL(url);}
}
export function messageFor(product,body=defaultBody,signature='') { const vars = {titulo:product.title,preco:money(product.price),preco_original:product.originalPrice>product.price?`De ${money(product.originalPrice)}\n`:'',desconto:discount(product)?`${discount(product)}% de desconto\n`:'',cupom:product.coupon?`🎟️ Cupom: ${product.coupon}\n`:'',link:product.affiliateUrl,loja:markets[product.marketplace]||product.marketplace,assinatura:signature};return body.replace(/\{([a-z_]+)\}/g,(all,key)=>vars[key]??all).replace(/\n{3,}/g,'\n\n').trim(); }
export const dimensions = {'quadrado':[1080,1080],'feed':[1080,1350],'story':[1080,1920]};
function fit(ctx,text,width){let value=String(text);if(ctx.measureText(value).width<=width)return value;while(value&&ctx.measureText(value+'…').width>width)value=value.slice(0,-1);return value+'…';}
function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=3) {const words=String(text).split(/\s+/);const lines=[];let line='';for(const word of words){const candidate=line?`${line} ${word}`:word;if(ctx.measureText(candidate).width>maxWidth&&line){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);lines.slice(0,maxLines).forEach((s,i)=>ctx.fillText(fit(ctx,s+(i===maxLines-1&&lines.length>maxLines?'…':''),maxWidth),x,y+i*lineHeight));return Math.min(lines.length,maxLines)*lineHeight;}
function rounded(ctx,x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
export async function renderCreative(canvas,product,{style='boutique',format='quadrado',brand='VITRAYA',accent='#5143c7',signature=''}={}) {
 if(style==='direta'||style==='essencial')return renderAlternate(canvas,product,{style,format,brand,accent,signature});
 const [w,h]=dimensions[format]||dimensions.quadrado;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');const direct=style==='direta';const clean=style==='essencial';const bg=direct?'#ffda3c':clean?'#f4f7fb':'#eee8f5';const ink=direct?'#171717':clean?'#17394e':'#302443';const primary=direct?'#171717':clean?'#17688b':accent;
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.textAlign='left';ctx.fillStyle=ink;ctx.font='700 28px "Segoe UI", sans-serif';ctx.fillText(fit(ctx,brand.toUpperCase(),650),64,78);ctx.font='500 23px "Segoe UI", sans-serif';ctx.textAlign='right';ctx.fillText(markets[product.marketplace]||'Oferta',w-64,78);ctx.textAlign='left';
 const photoY=126; const photoH=h===1920?930:h===1350?610:440;rounded(ctx,48,photoY,w-96,photoH,clean?12:32,clean?'#ffffff':direct?'#fff5c2':'#ffffffb8');
 if(product.image){const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('A imagem não pôde ser aberta. Reenvie a foto do produto.'));im.src=product.image;});const scale=Math.min((w-180)/img.width,(photoH-64)/img.height);ctx.drawImage(img,(w-img.width*scale)/2,photoY+(photoH-img.height*scale)/2,img.width*scale,img.height*scale);}else{ctx.fillStyle='#9b91a8';ctx.font='28px "Segoe UI", sans-serif';ctx.textAlign='center';ctx.fillText('Adicione a foto do produto',w/2,photoY+photoH/2);ctx.textAlign='left';}
 const pct=discount(product);if(pct){rounded(ctx,w-245,photoY+24,170,64,32,primary);ctx.fillStyle='#fff';ctx.font='700 27px "Segoe UI", sans-serif';ctx.textAlign='center';ctx.fillText(`${pct}% OFF`,w-160,photoY+66);ctx.textAlign='left';}
 let y=photoY+photoH+66;ctx.fillStyle=ink;ctx.font=direct?'900 47px "Segoe UI", sans-serif':clean?'600 45px "Segoe UI", sans-serif':'48px Georgia, serif';y+=wrap(ctx,product.title,64,y,w-128,58,2)+24;
 if(product.originalPrice>product.price){ctx.font='28px "Segoe UI", sans-serif';ctx.fillStyle='#6b6470';const str=`De ${money(product.originalPrice)}`;ctx.fillText(str,64,y);const tw=ctx.measureText(str).width;ctx.fillRect(64,y-10,tw,2);y+=74;}else y+=28;
 ctx.fillStyle=primary;ctx.font='800 83px "Segoe UI", sans-serif';ctx.fillText(money(product.price),60,y);y+=54;
 if(product.coupon){rounded(ctx,64,y-22,w-128,64,12,direct?'#fff4bf':clean?'#daeaf2':'#e0d6f0');ctx.fillStyle=ink;ctx.font='600 25px "Segoe UI", sans-serif';ctx.fillText(fit(ctx,`CUPOM  ${product.coupon}`,w-176),88,y+20);}
 ctx.fillStyle=ink;ctx.font='600 24px "Segoe UI", sans-serif';ctx.fillText(fit(ctx,signature||'Confira o link na mensagem',w-128),64,h-93);ctx.fillStyle='#635f68';ctx.font='19px "Segoe UI", sans-serif';ctx.fillText('Publicidade · link de afiliado. Confira preço e estoque na loja.',64,h-47);return canvas;
}

async function renderAlternate(canvas,p,{style,format,brand,signature}){
 const [w,h]=dimensions[format]||dimensions.quadrado;canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');const direct=style==='direta',tall=h===1920;
 const ink=direct?'#171717':'#17394e',bg=direct?'#ffda3c':'#f4f7fb';ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=ink;ctx.font='700 27px "Segoe UI",sans-serif';ctx.fillText(fit(ctx,brand.toUpperCase(),640),64,70);ctx.font='500 23px "Segoe UI",sans-serif';ctx.textAlign='right';ctx.fillText(markets[p.marketplace]||'Oferta',1016,70);ctx.textAlign='left';
 let imageBox;
 if(direct){ctx.fillStyle=ink;ctx.font='900 49px "Segoe UI",sans-serif';wrap(ctx,p.title,64,156,952,57,2);imageBox={x:48,y:280,w:984,h:h-650};rounded(ctx,imageBox.x,imageBox.y,imageBox.w,imageBox.h,0,'#fff9df');}
 else{imageBox=tall?{x:48,y:130,w:984,h:1020}:{x:48,y:150,w:530,h:h-350};rounded(ctx,imageBox.x,imageBox.y,imageBox.w,imageBox.h,12,'#fff');ctx.fillStyle='#17688b';ctx.fillRect(48,108,984,3);}
 if(p.image){const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('A imagem não pôde ser aberta. Reenvie a foto do produto.'));image.src=p.image;});const scale=Math.min((imageBox.w-60)/img.width,(imageBox.h-60)/img.height);ctx.drawImage(img,imageBox.x+(imageBox.w-img.width*scale)/2,imageBox.y+(imageBox.h-img.height*scale)/2,img.width*scale,img.height*scale);}else{ctx.fillStyle='#857d8b';ctx.font='24px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.fillText('Adicione a foto do produto',imageBox.x+imageBox.w/2,imageBox.y+imageBox.h/2);ctx.textAlign='left';}
 const pct=discount(p);
 if(direct){
  if(pct){ctx.fillStyle='#171717';ctx.beginPath();ctx.arc(927,343,64,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffda3c';ctx.font='900 34px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.fillText(`${pct}%`,927,344);ctx.font='700 19px "Segoe UI",sans-serif';ctx.fillText('OFF',927,372);ctx.textAlign='left';}
  const bandY=h-320;ctx.fillStyle='#171717';ctx.fillRect(48,bandY,984,220);ctx.fillStyle='#fff';if(p.originalPrice>p.price){ctx.font='25px "Segoe UI",sans-serif';const original=`De ${money(p.originalPrice)}`;ctx.fillText(original,78,bandY+46);ctx.fillRect(78,bandY+38,ctx.measureText(original).width,2);}
  drawPrice(ctx,money(p.price),77,bandY+143,920,103,'#fff');if(p.coupon){ctx.fillStyle='#ffda3c';ctx.font='700 24px "Segoe UI",sans-serif';ctx.fillText(fit(ctx,'CUPOM  '+p.coupon,910),78,bandY+190);}
 }else{
  const tx=tall?64:624,tw=tall?952:392,titleY=tall?1255:218;ctx.fillStyle=ink;ctx.font='600 42px "Segoe UI",sans-serif';wrap(ctx,p.title,tx,titleY,tw,54,tall?2:3);const priceY=tall?1550:520;
  if(p.originalPrice>p.price){ctx.font='24px "Segoe UI",sans-serif';ctx.fillStyle='#617485';const original=`De ${money(p.originalPrice)}`;ctx.fillText(original,tx,priceY-88);ctx.fillRect(tx,priceY-96,ctx.measureText(original).width,2);}
  drawPrice(ctx,money(p.price),tx,priceY,tw,tall?88:66,'#17688b');if(pct){ctx.font='600 23px "Segoe UI",sans-serif';ctx.fillStyle='#17688b';ctx.fillText(`${pct}% de desconto`,tx,priceY+54);}if(p.coupon){rounded(ctx,tx,priceY+93,tw,65,7,'#dcecf3');ctx.fillStyle=ink;ctx.font='600 21px "Segoe UI",sans-serif';ctx.fillText(fit(ctx,'CUPOM '+p.coupon,tw-30),tx+15,priceY+134);}
 }
 ctx.fillStyle=ink;ctx.font='600 23px "Segoe UI",sans-serif';ctx.fillText(fit(ctx,signature||'Confira o link na mensagem',952),64,h-62);ctx.fillStyle='#5f6370';ctx.font='18px "Segoe UI",sans-serif';ctx.fillText('Publicidade · link de afiliado. Confira preço e estoque na loja.',64,h-27);return canvas;
}
function drawPrice(ctx,value,x,y,width,fontSize,color){ctx.fillStyle=color;do{ctx.font=`800 ${fontSize}px "Segoe UI",sans-serif`;fontSize-=1;}while(ctx.measureText(value).width>width&&fontSize>18);ctx.fillText(value,x,y);}
