import { randomUUID } from 'node:crypto';

export const MARKETPLACES = ['shein', 'shopee', 'mercadolivre', 'tiktok', 'amazon', 'outro'];
export const CHANNEL_TYPES = ['whatsapp', 'telegram', 'instagram', 'tiktok', 'email', 'outro'];
export const PRODUCT_STATUSES = ['draft', 'ready', 'archived'];
export const CAMPAIGN_STATUSES = ['scheduled', 'ready', 'done', 'cancelled', 'sending', 'failed', 'unknown'];
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export class ApiError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function object(value) { if (!value || Array.isArray(value) || typeof value !== 'object') throw new ApiError('Esperado um objeto JSON.'); return value; }
export function text(value, name, max = 500, required = false) {
  if (value == null) value = '';
  if (typeof value !== 'string') throw new ApiError(`${name}: informe um texto.`);
  if (required && !value.trim()) throw new ApiError(`${name}: campo obrigatório.`);
  if (value.length > max) throw new ApiError(`${name}: limite de ${max} caracteres.`);
  if (value.includes('\0')) throw new ApiError(`${name}: caractere inválido.`);
  return value;
}
export function url(value, name = 'Link', required = false) {
  value = text(value, name, 4096, required);
  if (!value) return '';
  if (value !== value.trim() || /[\r\n\t]/.test(value)) throw new ApiError(`${name}: espaços externos ou controles inválidos.`);
  let parsed; try { parsed = new URL(value); } catch { throw new ApiError(`${name}: URL inválida.`); }
  if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new ApiError(`${name}: use uma URL HTTP ou HTTPS sem credenciais.`);
  return value; // Preserve exatamente o link afiliado fornecido.
}
export function money(value, name) {
  if (value == null || value === '') return 0;
  if (!Number.isSafeInteger(value) || value < 0 || value > 100_000_000_00) throw new ApiError(`${name}: informe centavos inteiros não negativos.`);
  return value;
}
export function validateImage(value) {
  value = text(value, 'Imagem', 250);
  if (value && !/^\/(?:media\/[a-f0-9-]+\.(?:png|jpg|webp)|demo\/(?:fone|bolsa|luminaria|tenis)\.svg)$/.test(value)) throw new ApiError('Imagem: envie um arquivo pelo aplicativo.');
  return value;
}
export function product(input) {
  object(input);
  const result = {
    title: text(input.title, 'Título', 300, true),
    marketplace: input.marketplace ?? 'outro',
    price: money(input.price, 'Preço'),
    originalPrice: money(input.originalPrice, 'Preço original'),
    coupon: text(input.coupon, 'Cupom', 150),
    affiliateUrl: url(input.affiliateUrl, 'Link afiliado'),
    image: validateImage(input.image),
    category: text(input.category, 'Categoria', 100),
    description: text(input.description, 'Descrição', 10000),
    tags: input.tags ?? [],
    status: input.status ?? 'draft',
  };
  if (!MARKETPLACES.includes(result.marketplace)) throw new ApiError('Marketplace inválido.');
  if (!PRODUCT_STATUSES.includes(result.status)) throw new ApiError('Status do produto inválido.');
  if (!Array.isArray(result.tags) || result.tags.length > 30) throw new ApiError('Tags: use uma lista com até 30 itens.');
  result.tags = [...new Set(result.tags.map(t => text(t, 'Tag', 60, true)))];
  if (result.status === 'ready' && (!result.affiliateUrl || result.price <= 0)) throw new ApiError('Produto pronto precisa de link afiliado e preço maior que zero.');
  if (result.originalPrice && result.originalPrice < result.price) throw new ApiError('Preço original deve ser maior ou igual ao preço atual.');
  return result;
}
export function channel(input) {
  object(input); const result = { name: text(input.name, 'Nome do canal', 120, true), type: input.type ?? 'whatsapp', url: url(input.url, 'Link do canal') };
  if (!CHANNEL_TYPES.includes(result.type)) throw new ApiError('Tipo de canal inválido.');
  return result;
}
export function template(input) { object(input); return { name: text(input.name, 'Nome do modelo', 120, true), body: text(input.body, 'Mensagem do modelo', 10000, true) }; }
export function settings(input) {
  object(input); const result = { brand: text(input.brand, 'Marca', 100, true), accent: input.accent ?? '#d96a43', signature: text(input.signature, 'Assinatura', 500) };
  if (!/^#[a-f\d]{6}$/i.test(result.accent)) throw new ApiError('Cor: use o formato #RRGGBB.');
  return result;
}
export function sniffImage(buffer) {
  const dimensions=(width,height)=>{if(!width||!height||width>20000||height>20000||width*height>60_000_000)throw new ApiError('Imagem tem dimensões inválidas ou excessivas (máximo de 60 megapixels e 20.000 pixels por lado).');return {width,height};};
  if (buffer.length >= 45 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.readUInt32BE(8)===13 && buffer.toString('ascii',12,16)==='IHDR' && buffer.toString('ascii',buffer.length-8,buffer.length-4)==='IEND') {
    return { ext:'png',mime:'image/png',...dimensions(buffer.readUInt32BE(16),buffer.readUInt32BE(20)) };
  }
  if (buffer.length >= 12 && buffer[0]===255 && buffer[1]===216 && buffer.at(-2)===255 && buffer.at(-1)===217) {
    let offset=2;
    while(offset+4<=buffer.length){
      if(buffer[offset]!==255)break;while(buffer[offset]===255)offset++;const marker=buffer[offset++];
      if(marker===0xd9||marker===0xda)break;
      if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
      if(offset+2>buffer.length)break;const size=buffer.readUInt16BE(offset);if(size<2||offset+size>buffer.length)break;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
        if(size<8)break;return {ext:'jpg',mime:'image/jpeg',...dimensions(buffer.readUInt16BE(offset+5),buffer.readUInt16BE(offset+3))};
      }
      offset+=size;
    }
    throw new ApiError('Imagem JPEG não contém dimensões válidas.');
  }
  if(buffer.length>=25 && buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP' && buffer.readUInt32LE(4)+8===buffer.length){
    const variant=buffer.toString('ascii',12,16);let width,height;
    if(variant==='VP8X'&&buffer.length>=30){width=buffer.readUIntLE(24,3)+1;height=buffer.readUIntLE(27,3)+1;}
    else if(variant==='VP8L'&&buffer[20]===0x2f){width=(buffer[21]|((buffer[22]&63)<<8))+1;height=((buffer[22]>>6)|(buffer[23]<<2)|((buffer[24]&15)<<10))+1;}
    else if(variant==='VP8 '&&buffer.length>=30&&buffer.subarray(23,26).equals(Buffer.from([0x9d,0x01,0x2a]))){width=buffer.readUInt16LE(26)&0x3fff;height=buffer.readUInt16LE(28)&0x3fff;}
    if(width&&height)return {ext:'webp',mime:'image/webp',...dimensions(width,height)};
  }
  throw new ApiError('Arquivo não é uma imagem PNG, JPEG ou WebP válida. SVG e HTML não são aceitos.');
}
export const integrations = [
  { id: 'shein', name: 'SHEIN', status: 'manual', description: 'Importe seu catálogo e preserve os links de afiliado. Conexão oficial ainda não configurada.', url: 'https://br.shein.com' },
  { id: 'shopee', name: 'Shopee', status: 'manual', description: 'Busca de ofertas, comissão e links de afiliado pela Open API oficial (em Ofertas Shopee), além da importação de planilha.', url: 'https://affiliate.shopee.com.br' },
  { id: 'mercadolivre', name: 'Mercado Livre', status: 'credentials_required', description: 'Catálogo manual disponível. API exige credenciais oficiais e implementação validada.', url: 'https://developers.mercadolivre.com.br' },
  { id: 'tiktok', name: 'TikTok Shop', status: 'manual', description: 'Organize ofertas e links fornecidos por você. Publicação manual.', url: 'https://seller-br.tiktok.com' },
  { id: 'whatsapp', name: 'WhatsApp', status: 'manual', description: 'Prepare e copie mensagens para publicar manualmente. Sem disparos automáticos.', url: 'https://web.whatsapp.com' },
];
