import ExcelJS from 'exceljs';
import { ApiError, product } from './validation.mjs';

const key = value => String(value).replace(/^\uFEFF/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
  title: ['title', 'titulo', 'nome', 'produto', 'nomeproduto', 'nomeproduto'],
  marketplace: ['marketplace', 'loja', 'plataforma', 'origem'],
  price: ['price', 'pricecents', 'preco', 'valor', 'precopromocional', 'precovenda'],
  originalPrice: ['originalprice', 'originalpricecents', 'precooriginal', 'precoantigo', 'precode'],
  affiliateUrl: ['affiliateurl', 'link', 'url', 'linkafiliado', 'linkafiliados', 'linkproduto', 'linkdeafiliado'],
  image: ['image', 'imagem', 'foto', 'imageurl', 'imagemurl'],
  coupon: ['coupon', 'cupom', 'codigocupom'],
  category: ['category', 'categoria'],
  description: ['description', 'descricao'],
  tags: ['tags', 'etiquetas'],
  status: ['status', 'situacao'],
};
const reverse = new Map(Object.entries(aliases).flatMap(([field, names]) => names.map(name => [name, field])));
const marketplaces = { shein:'shein', shopee:'shopee', mercadolivre:'mercadolivre', ml:'mercadolivre', tiktok:'tiktok', tiktokshop:'tiktok', amazon:'amazon', outro:'outro', outros:'outro' };
const statuses = { draft:'draft', rascunho:'draft', ready:'ready', pronto:'ready', ativo:'ready', archived:'archived', arquivado:'archived' };

export function parseMoney(value, canonical = false) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ApiError('Preço inválido.');
    return canonical ? value : Math.round((value + Number.EPSILON) * 100);
  }
  let str = String(value).trim().replace(/^R\$\s*/i, '').replace(/\s+/g, '');
  if (!str) return 0;
  if (canonical) { if(/^\d+$/.test(str))return Number(str); throw new ApiError('Preço em centavos precisa ser um número inteiro.'); }
  if (str.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(str)) throw new ApiError(`Preço inválido: ${String(value).slice(0,40)}.`);
    str = str.replace(/\./g,'').replace(',','.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(str)) str = str.replace(/\./g,'');
  else if (!/^\d+(?:\.\d{1,2})?$/.test(str)) throw new ApiError(`Preço inválido: ${String(value).slice(0,40)}.`);
  return Math.round((Number(str) + Number.EPSILON) * 100);
}

export function parseCsv(content) {
  const data = content.replace(/^\uFEFF/,'');
  if (data.includes('\0')) throw new ApiError('CSV contém bytes inválidos. Salve em UTF-8.');
  let delimiter = ',', counts = { ',': 0, ';': 0, '\t': 0 }, quoted = false;
  for (let i = 0; i < data.length; i++) { const c=data[i]; if(c==='"') { if(quoted&&data[i+1]==='"') i++; else quoted=!quoted; } else if(!quoted) { if(c==='\n'||c==='\r') break; if(c in counts) counts[c]++; } }
  delimiter = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
  const rows=[]; let row=[], field='', inQuote=false, afterQuote=false, line=1, rowLine=1;
  const addRow=()=>{ row.push(field); if(row.some(v=>v.trim()!=='')) rows.push({values:row,line:rowLine}); row=[];field='';afterQuote=false;rowLine=line; };
  for(let i=0;i<data.length;i++) {
    const c=data[i];
    if(inQuote) { if(c==='"') { if(data[i+1]==='"'){field+='"';i++;}else{inQuote=false;afterQuote=true;} } else {field+=c;if(c==='\n')line++;} continue; }
    if(c==='"'&&!field&&!afterQuote){inQuote=true;continue;}
    if(c===delimiter){row.push(field);field='';afterQuote=false;continue;}
    if(c==='\r'||c==='\n'){if(c==='\r'&&data[i+1]==='\n')i++;line++;addRow();continue;}
    if(afterQuote && c !== ' ' && c !== '\t') throw new ApiError(`CSV: caractere inesperado após aspas na linha ${line}.`);
    if(!afterQuote) {if(c==='"')throw new ApiError(`CSV: aspas inválidas na linha ${line}.`);field+=c;}
  }
  if(inQuote)throw new ApiError('CSV contém aspas não fechadas.');
  if(field||row.length)addRow();
  if(rows.length<2)throw new ApiError('O arquivo precisa de cabeçalho e pelo menos um produto.');
  const headers=rows.shift().values;
  const normalized=headers.map(key);if(new Set(normalized).size!==normalized.length)throw new ApiError('Cabeçalho CSV contém colunas repetidas.');
  return rows.map(r=>({raw:Object.fromEntries(headers.map((h,i)=>[h,r.values[i]??''])),line:r.line, extra:r.values.length>headers.length}));
}

function normalize(raw, line, warnings) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ApiError('Linha precisa ser um objeto de produto.');
  const result={};
  for(const [original,value] of Object.entries(raw)) {
    const k=key(original), field=reverse.get(k); if(!field)continue;
    if(Object.hasOwn(result,field))throw new ApiError(`Colunas repetidas para ${field}.`);
    if(field==='price'||field==='originalPrice')result[field]=parseMoney(value, /cents$/.test(k) || (['price','originalprice'].includes(k) && typeof value==='number'));
    else result[field]=value;
  }
  if(result.marketplace!=null&&result.marketplace!=='')result.marketplace=marketplaces[key(result.marketplace)]??key(result.marketplace);
  else result.marketplace='outro';
  if(result.status!=null&&result.status!=='')result.status=statuses[key(result.status)]??result.status;else result.status='draft';
  if(typeof result.tags==='string')result.tags=result.tags.split(/[;,|]/).map(s=>s.trim()).filter(Boolean);
  let imageName='';
  if(result.image && !/^\/(?:media|demo)\//.test(result.image)) {imageName=String(result.image).split(/[\\/]/).at(-1).split(/[?#]/)[0];warnings.push({row:line,message:'Imagem externa não foi baixada. Associe um arquivo local na biblioteca de imagens.'});result.image='';}
  for(const f of ['title','coupon','affiliateUrl','image','category','description']) if(result[f]!=null && typeof result[f]!=='string')result[f]=String(result[f]);
  return {...product(result),_rowNumber:line,...(imageName?{_imageName:imageName}:{})};
}

export async function previewImport(buffer, filename) {
  const extension=filename.toLowerCase().split('.').pop();let source;
  if(extension==='csv') {
    let content;try{content=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{throw new ApiError('CSV precisa estar em UTF-8.');}
    source=parseCsv(content);
  } else if(extension==='json') {
    let parsed;try{parsed=JSON.parse(buffer.toString('utf8'));}catch{throw new ApiError('JSON inválido.');}
    const values=Array.isArray(parsed)?parsed:parsed?.products;
    if(!Array.isArray(values))throw new ApiError('JSON precisa conter uma lista ou o campo products.');
    source=values.map((raw,i)=>({raw,line:i+1}));
  } else if(extension==='xlsx') {
    if(buffer[0]!==80||buffer[1]!==75)throw new ApiError('Arquivo XLSX inválido.');
    // Limite pelo diretório ZIP antes da descompressão do workbook.
    const {validateZipStructure}=await import('./zip.mjs');await validateZipStructure(buffer,{maxTotal:50*1024*1024,maxEntries:1500,maxSingle:20*1024*1024});
    const workbook=new ExcelJS.Workbook();try{await workbook.xlsx.load(buffer);}catch{throw new ApiError('Não foi possível ler a planilha XLSX.');}
    const sheet=workbook.worksheets[0];if(!sheet)throw new ApiError('Planilha vazia.');
    const headers=[]; sheet.getRow(1).eachCell({includeEmpty:true},(cell,col)=>{headers[col]=String(cell.text??'');});
    if(new Set(headers.slice(1).filter(Boolean).map(key)).size!==headers.slice(1).filter(Boolean).length)throw new ApiError('Cabeçalho XLSX contém colunas repetidas.');
    source=[];sheet.eachRow((row,line)=>{if(line===1)return;const raw={};for(let i=1;i<headers.length;i++)if(headers[i]) {const v=row.getCell(i).value;raw[headers[i]]=typeof v==='object'&&v!==null ? (v.result??v.text??(v.richText?.map(t=>t.text).join(''))??row.getCell(i).text):v;}source.push({raw,line});});
  } else throw new ApiError('Importe um arquivo CSV, JSON ou XLSX.');
  if(source.length>5000)throw new ApiError('Limite de 5.000 produtos por importação.');
  if(!source.length)throw new ApiError('Nenhum produto encontrado no arquivo.');
  const rows=[],errors=[],warnings=[];const links=new Set();
  for(const item of source)try{
    if(item.extra)throw new ApiError('Linha tem mais valores do que o cabeçalho.');
    const normalized=normalize(item.raw,item.line,warnings);if(normalized.affiliateUrl&&links.has(normalized.affiliateUrl))warnings.push({row:item.line,message:'Link duplicado no arquivo; a confirmação irá ignorar a repetição.'});
    if(normalized.affiliateUrl)links.add(normalized.affiliateUrl);rows.push(normalized);
  }catch(error){errors.push({row:item.line,message:error.message});}
  return {rows,errors,warnings};
}

const exportFields=['title','marketplace','price_cents','original_price_cents','coupon','affiliateUrl','image','category','description','tags','status'];
export function exportRows(products){return products.map(p=>[p.title,p.marketplace,p.price,p.originalPrice,p.coupon,p.affiliateUrl,p.image,p.category,p.description,p.tags.join(' | '),p.status]);}
export function csvExport(products){const escape=value=>{let str=String(value??'');if(/^[\s]*[=+@-]/.test(str))str="'"+str;return '"'+str.replace(/"/g,'""')+'"';};return '\uFEFF'+[exportFields,...exportRows(products)].map(row=>row.map(escape).join(';')).join('\r\n');}
export async function xlsxExport(products){const book=new ExcelJS.Workbook();book.creator='Vitraya Studio';const sheet=book.addWorksheet('Produtos');sheet.addRow(exportFields);for(const row of exportRows(products))sheet.addRow(row);sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];sheet.columns.forEach(c=>c.width=22);return Buffer.from(await book.xlsx.writeBuffer());}
