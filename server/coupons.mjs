// Pure and browser-compatible: prices and monetary limits are integer cents.
const MARKETPLACES = ['shein','shopee','mercadolivre','tiktok','amazon','outro'];
const MAX_CENTS = 10_000_000_000;

export class CouponValidationError extends Error {
  constructor(message) { super(message); this.name='CouponValidationError'; this.status=400; }
}
const fail = message => { throw new CouponValidationError(message); };
const plainText = (value,label,max,required=false) => {
  if(typeof value!=='string') fail(`${label}: informe um texto.`);
  const result=value.trim();
  if((required&&!result)||result.length>max||/[\u0000-\u001f\u007f]/.test(result)) fail(`${label}: conteúdo inválido${required?' ou vazio':''}.`);
  return result;
};
const cents = (value,label) => {
  if(!Number.isSafeInteger(value)||value<0||value>MAX_CENTS) fail(`${label}: informe centavos inteiros não negativos.`);
  return value;
};
function isoDate(value,label) {
  if(value==null||value==='') return '';
  if(typeof value!=='string') fail(`${label}: informe uma data com fuso horário.`);
  const match=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/);
  if(!match) fail(`${label}: informe uma data ISO com fuso horário.`);
  const [year,month,day,hour,minute,second]=match.slice(1,7).map(Number);
  const leap=year%4===0&&(year%100!==0||year%400===0);
  const monthDays=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  const instant=Date.parse(value);
  if(month<1||month>12||day<1||day>monthDays[month-1]||hour>23||minute>59||(second||0)>59||!Number.isFinite(instant)) fail(`${label}: data inválida.`);
  return new Date(instant).toISOString();
}

/** Canonical coupon fields, excluding identity (owned by the persistence layer).
 * Scope is explicit: an ID list or a category; both empty means this marketplace.
 * maxDiscount=0 means no additional cap. Expiration is exclusive.
 */
export function validateCoupon(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)) fail('Cupom: informe um objeto.');
  const code=plainText(input.code,'Código do cupom',80,true);
  if(/\s/u.test(code)) fail('Código do cupom: não use espaços.');
  if(!MARKETPLACES.includes(input.marketplace)) fail('Cupom: marketplace inválido.');
  if(!['percent','fixed'].includes(input.type)) fail('Cupom: escolha percentual ou valor fixo.');
  const value=cents(input.value,'Desconto');
  if(value<=0||(input.type==='percent'&&value>100)) fail('Desconto: percentual de 1 a 100 ou valor fixo positivo em centavos.');
  const minSpend=cents(input.minSpend??0,'Compra mínima');
  const maxDiscount=cents(input.maxDiscount??0,'Teto de desconto');
  const startsAt=isoDate(input.startsAt,'Início');
  const expiresAt=isoDate(input.expiresAt,'Expiração');
  if(startsAt&&expiresAt&&Date.parse(startsAt)>=Date.parse(expiresAt)) fail('A expiração precisa ocorrer depois do início.');
  if(!Array.isArray(input.productIds)||input.productIds.length>5000) fail('Escopo: informe uma lista com até 5.000 IDs.');
  const productIds=[...new Set(input.productIds.map(value=>plainText(value,'ID do produto',100,true)))];
  const category=plainText(input.category,'Categoria',100);
  if(productIds.length&&category) fail('Escopo: escolha produtos específicos ou categoria, não ambos.');
  if(typeof input.active!=='boolean') fail('Cupom: informe se está ativo.');
  return {code,marketplace:input.marketplace,type:input.type,value,minSpend,maxDiscount,startsAt,expiresAt,productIds,category,active:input.active};
}

const categoryKey = value => value.trim().normalize('NFC').toLocaleLowerCase('pt-BR');

/** Returns the greatest eligible saving; ties retain input order. No stacking.
 * Invalid coupons are ineligible. Evaluation covers only the supplied rules and
 * a single product price, excluding shipping, quantity, account and payment rules.
 */
export function bestCoupon(product,coupons,now=Date.now()) {
  if(!product||!Number.isSafeInteger(product.price)||product.price<=0||product.price>MAX_CENTS||!MARKETPLACES.includes(product.marketplace)||!Array.isArray(coupons)) return null;
  const instant=now instanceof Date?now.getTime():typeof now==='number'?now:typeof now==='string'?Date.parse(now):NaN;
  if(!Number.isFinite(instant)) return null;
  let best=null;
  for(const input of coupons) {
    let coupon;
    try { coupon=validateCoupon(input); } catch { continue; }
    if(!coupon.active||coupon.marketplace!==product.marketplace||product.price<coupon.minSpend) continue;
    if((coupon.startsAt&&instant<Date.parse(coupon.startsAt))||(coupon.expiresAt&&instant>=Date.parse(coupon.expiresAt))) continue;
    if(coupon.productIds.length&&!coupon.productIds.includes(product.id)) continue;
    if(coupon.category&&(typeof product.category!=='string'||categoryKey(coupon.category)!==categoryKey(product.category))) continue;
    let saving=coupon.type==='percent'?Math.floor(product.price*coupon.value/100):coupon.value;
    if(coupon.maxDiscount>0) saving=Math.min(saving,coupon.maxDiscount);
    saving=Math.min(saving,product.price);
    if(saving>0&&(!best||saving>best.discount)) best={coupon:{...coupon,...(typeof input.id==='string'?{id:input.id}:{})},discount:saving,finalPrice:product.price-saving};
  }
  return best;
}
