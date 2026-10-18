import React,{useId,useState} from 'react';
import {Plus,Ticket,Trash2,Edit3,Calculator,CheckCircle2,Clock} from 'lucide-react';
import {markets,money} from './domain.js';
import {validateCoupon,bestCoupon} from '../server/coupons.mjs';

const emptyForm=()=>({code:'',marketplace:'shopee',type:'percent',value:'',minSpend:'',maxDiscount:'',startsAt:'',expiresAt:'',productIds:[],category:'',active:true,scope:''});
const displayCents=value=>value?new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100):'';
function brCents(value,label) {
  const cleaned=String(value).trim().replace(/^R\$\s*/i,'');
  if(!cleaned) return 0;
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(cleaned)) throw new Error(`${label}: use reais no formato 29,90.`);
  const [integer,fraction='']=cleaned.replace(/\./g,'').split(',');
  const result=Number(integer)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(result)) throw new Error(`${label}: valor fora do limite.`);
  return result;
}
function localDate(value) {
  if(!value) return '';
  const date=new Date(value),pad=value=>String(value).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function toIso(value,label) {
  if(!value) return '';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime())) throw new Error(`${label}: data inválida.`);
  return date.toISOString();
}
const dateLabel=value=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));
const scopeLabel=coupon=>coupon.productIds?.length?`${coupon.productIds.length} produto(s) específico(s)`:coupon.category?`Categoria: ${coupon.category}`:'Todos os produtos deste marketplace';
const discountLabel=coupon=>coupon.type==='percent'?`${coupon.value}%`:money(coupon.value);
function conditions(coupon) {
  return [scopeLabel(coupon),coupon.minSpend?`Mínimo: ${money(coupon.minSpend)}`:'Sem compra mínima',coupon.maxDiscount?`Teto: ${money(coupon.maxDiscount)}`:'Sem teto adicional',coupon.startsAt?`Início: ${dateLabel(coupon.startsAt)}`:'Sem início definido',coupon.expiresAt?`Expira: ${dateLabel(coupon.expiresAt)}`:'Sem expiração definida'].join(' · ');
}
function couponState(coupon) {
  if(!coupon.active) return 'Pausado';
  if(coupon.expiresAt&&Date.parse(coupon.expiresAt)<=Date.now()) return 'Expirado';
  if(coupon.startsAt&&Date.parse(coupon.startsAt)>Date.now()) return 'Aguardando início';
  return 'Ativo';
}

/** onSave(payload including id only on edit), onDelete(id): both may be async. */
export function Coupons({coupons=[],products=[],onSave,onDelete,notify=()=>{},busy=false}) {
  const [form,setForm]=useState(emptyForm),[editingId,setEditingId]=useState(''),[error,setError]=useState(''),[working,setWorking]=useState(false),[pendingDelete,setPendingDelete]=useState(''),[productId,setProductId]=useState(''),[simulationAt,setSimulationAt]=useState('');
  const categoryListId=useId();
  const disabled=busy||working;
  const update=(field,value)=>setForm(current=>({...current,[field]:value}));
  const relevantProducts=products.filter(product=>product.marketplace===form.marketplace);
  const categories=[...new Set(relevantProducts.map(product=>product.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const selectedProduct=products.find(product=>product.id===productId)||products[0];
  const simulationInstant=simulationAt?new Date(simulationAt).getTime():Date.now();
  const result=selectedProduct?bestCoupon(selectedProduct,coupons,simulationInstant):null;
  const reset=()=>{setForm(emptyForm());setEditingId('');setError('');};

  async function save(event) {
    event.preventDefault();setError('');
    try {
      if(!form.scope) throw new Error('Escolha explicitamente onde o cupom vale.');
      if(form.scope==='products'&&!form.productIds.length) throw new Error('Selecione pelo menos um produto para o escopo específico.');
      if(form.scope==='category'&&!form.category.trim()) throw new Error('Informe a categoria em que o cupom vale.');
      if(form.type==='percent'&&!/^\d{1,3}$/.test(form.value.trim())) throw new Error('Desconto percentual: use um número inteiro de 1 a 100.');
      const payload=validateCoupon({code:form.code,marketplace:form.marketplace,type:form.type,value:form.type==='percent'?Number(form.value):brCents(form.value,'Desconto'),minSpend:brCents(form.minSpend,'Compra mínima'),maxDiscount:brCents(form.maxDiscount,'Teto'),startsAt:toIso(form.startsAt,'Início'),expiresAt:toIso(form.expiresAt,'Expiração'),productIds:form.scope==='products'?form.productIds:[],category:form.scope==='category'?form.category:'',active:form.active});
      if(typeof onSave!=='function') throw new Error('O cadastro de cupons ainda não está conectado à base local.');
      setWorking(true);
      await onSave({...payload,...(editingId?{id:editingId}:{})});
      reset();notify('Cupom salvo com as condições informadas.');
    } catch(error) { setError(error.message);notify(error.message,true); }
    finally { setWorking(false); }
  }

  function edit(coupon) {
    setEditingId(coupon.id);setError('');setPendingDelete('');
    setForm({code:coupon.code,marketplace:coupon.marketplace,type:coupon.type,value:coupon.type==='percent'?String(coupon.value):displayCents(coupon.value),minSpend:displayCents(coupon.minSpend),maxDiscount:displayCents(coupon.maxDiscount),startsAt:localDate(coupon.startsAt),expiresAt:localDate(coupon.expiresAt),productIds:[...(coupon.productIds||[])],category:coupon.category||'',active:coupon.active,scope:coupon.productIds?.length?'products':coupon.category?'category':'all'});
  }

  async function remove(coupon) {
    if(typeof onDelete!=='function') return notify('A exclusão de cupons ainda não está conectada à base local.',true);
    setWorking(true);
    try { await onDelete(coupon.id);setPendingDelete('');if(editingId===coupon.id) reset();notify('Cupom excluído.'); }
    catch(error) { notify(error.message,true); }
    finally { setWorking(false); }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">DESCONTO COM CONDIÇÕES CLARAS</p><h1>Seus cupons, conferidos por você.</h1><p className="page-description">Cadastre as regras e simule a maior economia para cada produto do catálogo.</p></div></div>
    <div className="notice"><Ticket size={19}/><span>Os cupons vêm do seu cadastro. A simulação usa as condições informadas e não consulta validade, estoque ou elegibilidade na loja.</span></div>
    <div className="two-column">
      <section className="panel">
        <h2>{editingId?'Editar cupom':'Cadastrar cupom'}</h2>
        <form onSubmit={save}>
          <label className="field"><span>Código do cupom</span><input required maxLength={80} value={form.code} onChange={event=>update('code',event.target.value)} placeholder="Cole o código que você conferiu"/></label>
          <div className="form-row">
            <label className="field"><span>Marketplace do cupom</span><select value={form.marketplace} onChange={event=>setForm(current=>({...current,marketplace:event.target.value,productIds:[],category:'',scope:''}))}>{Object.entries(markets).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Tipo de desconto</span><select value={form.type} onChange={event=>setForm(current=>({...current,type:event.target.value,value:''}))}><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></label>
          </div>
          <div className="form-row">
            <label className="field"><span>{form.type==='percent'?'Desconto (% inteiro)':'Desconto (R$)'}</span><input required inputMode={form.type==='percent'?'numeric':'decimal'} value={form.value} onChange={event=>update('value',event.target.value)} placeholder={form.type==='percent'?'Ex.: 15':'Ex.: 20,00'}/></label>
            <label className="field"><span>Compra mínima (R$)</span><input inputMode="decimal" value={form.minSpend} onChange={event=>update('minSpend',event.target.value)} placeholder="Vazio ou 0 = sem mínimo"/></label>
          </div>
          <label className="field"><span>Teto de desconto (R$)</span><input inputMode="decimal" value={form.maxDiscount} onChange={event=>update('maxDiscount',event.target.value)} placeholder="Vazio ou 0 = sem teto adicional"/></label>
          <div className="form-row">
            <label className="field"><span>Válido a partir de</span><input type="datetime-local" value={form.startsAt} onChange={event=>update('startsAt',event.target.value)}/><small>Opcional · horário deste computador.</small></label>
            <label className="field"><span>Expira em</span><input type="datetime-local" value={form.expiresAt} onChange={event=>update('expiresAt',event.target.value)}/><small>Opcional · deixa de valer neste instante.</small></label>
          </div>
          <label className="field"><span>Onde este cupom vale?</span><select required value={form.scope} onChange={event=>update('scope',event.target.value)}><option value="">Escolha o escopo confirmado</option><option value="all">Todos os produtos deste marketplace</option><option value="products">Somente os produtos selecionados</option><option value="category">Somente uma categoria</option></select></label>
          {form.scope==='category'&&<label className="field"><span>Categoria exata</span><input required list={categoryListId} maxLength={100} value={form.category} onChange={event=>update('category',event.target.value)} placeholder="Ex.: Eletrônicos"/><datalist id={categoryListId}>{categories.map(category=><option key={category} value={category}/>)}</datalist><small>A categoria inteira deve coincidir. Maiúsculas e minúsculas são equivalentes.</small></label>}
          {form.scope==='products'&&<fieldset className="field"><legend>Produtos elegíveis · {form.productIds.length} selecionado(s)</legend>{!relevantProducts.length?<p className="muted">Cadastre um produto desse marketplace para selecioná-lo aqui.</p>:<div style={{maxHeight:220,overflowY:'auto',display:'grid',gap:10}}>{relevantProducts.map(product=><label key={product.id} style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" style={{width:'auto'}} checked={form.productIds.includes(product.id)} onChange={event=>update('productIds',event.target.checked?[...form.productIds,product.id]:form.productIds.filter(id=>id!==product.id))}/><span>{product.title} · {money(product.price)}</span></label>)}</div>}{form.productIds.some(id=>!relevantProducts.some(product=>product.id===id))&&<p className="muted">Há IDs de produtos ausentes do catálogo. Eles não ampliam o escopo do cupom.</p>}</fieldset>}
          <label style={{display:'flex',alignItems:'center',gap:10,margin:'18px 0'}}><input type="checkbox" style={{width:'auto'}} checked={form.active} onChange={event=>update('active',event.target.checked)}/><span>Cupom ativo nas simulações</span></label>
          {error&&<p className="text-error" role="alert">{error}</p>}
          <div className="inline-actions"><button className="button primary" disabled={disabled}><Plus size={16}/>{disabled?'Aguarde…':'Salvar cupom'}</button>{editingId&&<button type="button" className="button" disabled={disabled} onClick={reset}>Cancelar edição</button>}</div>
        </form>
      </section>
      <section>
        <div className="panel">
          <h2><Calculator size={19}/> Simular um produto</h2>
          {!products.length?<p className="muted">Adicione um produto ao catálogo para simular os cupons.</p>:<>
            <label className="field"><span>Produto da simulação</span><select value={selectedProduct?.id||''} onChange={event=>setProductId(event.target.value)}>{products.map(product=><option key={product.id} value={product.id}>{product.title} · {money(product.price)}</option>)}</select></label>
            <label className="field"><span>Data e horário para simular</span><input type="datetime-local" value={simulationAt} onChange={event=>setSimulationAt(event.target.value)}/><small>Vazio usa o momento atual deste computador.</small></label>
            {result?<div className="notice"><CheckCircle2 size={20}/><div><strong>{result.coupon.code}: {money(result.finalPrice)}</strong><p>De {money(selectedProduct.price)} · economia de {money(result.discount)}.</p><p className="small-text">{conditions(result.coupon)}</p></div></div>:<div className="notice"><Clock size={18}/><span>Nenhum cupom elegível para esse produto e horário pelas regras cadastradas. Preço: {money(selectedProduct.price)}.</span></div>}
            <p className="muted small-text">Aplica um único cupom. O mínimo é comparado ao preço deste produto, sem frete ou quantidade. Condições de conta, pagamento e primeira compra devem ser conferidas por você na loja. A simulação não altera o preço do catálogo.</p>
          </>}
        </div>
        <div className="section-title"><h2>Cupons cadastrados <span>{coupons.length}</span></h2></div>
        {!coupons.length?<div className="panel"><p className="muted">Seu cadastro está vazio. Adicione apenas cupons reais que você tem autorização para divulgar.</p></div>:coupons.map(coupon=><article className="template-card" key={coupon.id}>
          <div><h3>{coupon.code} · {discountLabel(coupon)}</h3><span className="status-pill manual">{couponState(coupon)}</span></div>
          <p>{markets[coupon.marketplace]||coupon.marketplace}</p><p className="muted small-text">{conditions(coupon)}</p>
          <div className="inline-actions"><button className="button small" disabled={disabled} onClick={()=>edit(coupon)}><Edit3 size={15}/>Editar cupom</button>{pendingDelete===coupon.id?<><button className="button small danger" disabled={disabled} onClick={()=>remove(coupon)}>Confirmar exclusão de {coupon.code}</button><button className="button small" disabled={disabled} onClick={()=>setPendingDelete('')}>Voltar</button></>:<button className="button small" disabled={disabled} onClick={()=>setPendingDelete(coupon.id)}><Trash2 size={15}/>Excluir cupom</button>}</div>
        </article>)}
      </section>
    </div>
  </>;
}

export default Coupons;
