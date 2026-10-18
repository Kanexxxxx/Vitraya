import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCoupon, bestCoupon, CouponValidationError } from '../server/coupons.mjs';

const instant = Date.parse('2026-10-17T15:00:00.000Z');
const product = {id:'produto-a',marketplace:'shopee',price:19990,category:'Eletrônicos'};
const valid = (changes={}) => ({code:'TESTE10',marketplace:'shopee',type:'percent',value:10,minSpend:0,maxDiscount:0,startsAt:'',expiresAt:'',productIds:[],category:'',active:true,...changes});

test('normaliza campos explícitos e preserva a identidade do código', () => {
  const input = valid({code:'  Teste10  ',productIds:[' produto-a ','produto-a'],category:' '});
  const result = validateCoupon(input);
  assert.equal(result.code,'Teste10');
  assert.deepEqual(result.productIds,['produto-a']);
  assert.equal(result.category,'');
  assert.equal(Object.hasOwn(result,'id'),false);
  assert.deepEqual(input.productIds,[' produto-a ','produto-a']);
});

test('rejeita percentuais e dinheiro ambíguos ou fora do limite', () => {
  for(const changes of [{value:0},{value:101},{value:1.5},{value:'10'},{type:'fixed',value:0},{type:'fixed',value:-1},{type:'fixed',value:1.2},{minSpend:-1},{maxDiscount:-1},{maxDiscount:1.2},{value:Number.MAX_SAFE_INTEGER+1}]) {
    assert.throws(()=>validateCoupon(valid(changes)),CouponValidationError);
  }
});

test('rejeita cupom sem origem, ativação ou escopo válido e não amplia escopo silenciosamente', () => {
  for(const changes of [{marketplace:'qualquer'},{code:''},{code:'DUAS PALAVRAS'},{active:'true'},{productIds:['']},{productIds:['produto-a'],category:'Eletrônicos'},{productIds:null}]) {
    assert.throws(()=>validateCoupon(valid(changes)),CouponValidationError);
  }
  const missing = valid(); delete missing.category;
  assert.throws(()=>validateCoupon(missing),CouponValidationError);
});

test('valida datas com fuso e ordem, início inclusivo e expiração exclusiva', () => {
  assert.throws(()=>validateCoupon(valid({startsAt:'2026-10-17T12:00'})),CouponValidationError);
  assert.throws(()=>validateCoupon(valid({expiresAt:'2026-02-30T00:00:00Z'})),CouponValidationError);
  assert.throws(()=>validateCoupon(valid({startsAt:'2026-10-18T00:00:00Z',expiresAt:'2026-10-17T00:00:00Z'})),CouponValidationError);
  const coupon = valid({startsAt:'2026-10-17T12:00:00-03:00',expiresAt:'2026-10-17T16:00:00Z'});
  assert.equal(validateCoupon(coupon).startsAt,'2026-10-17T15:00:00.000Z');
  assert.equal(bestCoupon(product,[coupon],instant-1),null);
  assert.equal(bestCoupon(product,[coupon],instant).discount,1999);
  assert.equal(bestCoupon(product,[coupon],Date.parse('2026-10-17T16:00:00Z')),null);
});

test('filtra marketplace, compra mínima, ativação e escopo por ID/categoria exatos', () => {
  for(const coupon of [valid({marketplace:'shein'}),valid({minSpend:19991}),valid({active:false}),valid({productIds:['produto-b']}),valid({category:'Casa'}),valid({category:'Eletrônico'})]) {
    assert.equal(bestCoupon(product,[coupon],instant),null);
  }
  assert.ok(bestCoupon(product,[valid({minSpend:19990,productIds:['produto-a']})],instant));
  assert.ok(bestCoupon(product,[valid({category:' eletrônicos '})],instant));
  assert.equal(bestCoupon({...product,category:'Eletronicos'},[valid({category:'Eletrônicos'})],instant),null);
});

test('seleciona a maior economia com teto e arredondamento conservador', () => {
  const result = bestCoupon(product,[valid({id:'percentual',value:30,maxDiscount:2500}),valid({id:'fixo',code:'FIXO30',type:'fixed',value:3000})],instant);
  assert.equal(result.coupon.id,'fixo');
  assert.equal(result.discount,3000);
  assert.equal(result.finalPrice,16990);
  assert.equal(bestCoupon({...product,price:101},[valid({value:10})],instant).discount,10);
  assert.equal(bestCoupon(product,[valid({type:'fixed',value:3000,maxDiscount:1000})],instant).discount,1000);
});

test('desconto limitado ao preço e empate mantém ordem original sem mutações', () => {
  const coupons = Object.freeze([Object.freeze(valid({id:'primeiro',type:'fixed',value:50000})),Object.freeze(valid({id:'segundo',value:100}))]);
  const result = bestCoupon(Object.freeze({...product}),coupons,instant);
  assert.equal(result.coupon.id,'primeiro');
  assert.equal(result.discount,19990);
  assert.equal(result.finalPrice,0);
  assert.equal(coupons[0].value,50000);
});

test('não fabrica economia para dados inválidos, centavos insuficientes ou sem cupons', () => {
  assert.equal(bestCoupon(product,[],instant),null);
  assert.equal(bestCoupon(product,[{code:'INVÁLIDO'}],instant),null);
  assert.equal(bestCoupon({...product,price:0},[valid()],instant),null);
  assert.equal(bestCoupon({...product,price:1},[valid({value:1})],instant),null);
  assert.equal(bestCoupon({...product,price:'19990'},[valid()],instant),null);
  assert.equal(bestCoupon(product,[valid()],NaN),null);
  assert.equal(bestCoupon(null,[valid()],instant),null);
});
