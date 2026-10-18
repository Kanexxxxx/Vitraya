import JSZip from 'jszip';
import { ApiError } from './validation.mjs';

export async function validateZipStructure(buffer,options={}) {
  const {maxTotal=100*1024*1024,maxEntries=5000,maxSingle=10*1024*1024}=options;
  let zip;try{zip=await JSZip.loadAsync(buffer,{checkCRC32:false,createFolders:false});}catch{throw new ApiError('Arquivo ZIP inválido.');}
  const entries=Object.values(zip.files);if(entries.length>maxEntries)throw new ApiError('ZIP tem arquivos demais.');
  let total=0;
  for(const entry of entries){
    const name=entry.unsafeOriginalName??entry.name;
    if(name!==entry.name || name.includes('\\') || name.startsWith('/') || name.split('/').some(s=>s==='..'||s==='.') || /[\x00-\x1f:]/.test(name))throw new ApiError('ZIP contém um caminho inseguro.');
    if(entry.dir)continue;const size=entry._data?.uncompressedSize,compressed=entry._data?.compressedSize;
    if(!Number.isSafeInteger(size)||size<0||size>maxSingle)throw new ApiError('ZIP contém um arquivo excessivo.');
    total+=size;if(total>maxTotal || (size>1024*1024 && size/Math.max(1,compressed)>100))throw new ApiError('ZIP excede os limites de descompressão.');
  }
  return zip;
}
