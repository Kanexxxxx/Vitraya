import test from 'node:test';
import assert from 'node:assert/strict';
import {cents,messageFor,dimensions,discount} from '../src/domain.js';
test('preços manuais brasileiros preservam milhares e rejeitam ambiguidades',()=>{
 for(const [input,expected] of [['1.234',123400],['1.234,56',123456],['R$ 89,90',8990],['89.90',8990],['0,01',1],['1234',123400]])assert.equal(cents(input),expected,input);
 for(const invalid of ['', '1,234','12.34.56','-10','Infinity','1e3'])assert.ok(Number.isNaN(cents(invalid)),invalid);
});
test('legenda preserva integralmente link com parâmetros e não inventa desconto ou cupom',()=>{
 const p={title:'Meu achado',marketplace:'shein',price:8990,originalPrice:0,coupon:'',affiliateUrl:'https://example.test/a?tag=MEU&x=%2F+a#v'};
 const msg=messageFor(p);assert.ok(msg.includes(p.affiliateUrl));assert.ok(msg.includes('R$'));assert.ok(!msg.includes('Cupom:'));assert.ok(!msg.includes('desconto'));assert.ok(!msg.includes('{link}'));assert.equal(discount(p),0);
});
test('formatos de exportação têm dimensões de publicação completas',()=>{assert.deepEqual(dimensions,{quadrado:[1080,1080],feed:[1080,1350],story:[1080,1920]});});
