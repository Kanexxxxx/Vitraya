import React,{useEffect,useRef,useId} from 'react';
import {X,Package} from 'lucide-react';
import {markets} from './domain.js';

// Componentes e utilidades comuns a todas as telas. Cada etapa importa daqui, sem mexer no main.jsx.
export const statusLabel={draft:'Rascunho',ready:'Pronto',archived:'Arquivado',scheduled:'Agendado',done:'Publicado',cancelled:'Cancelado',sending:'Enviando',failed:'Falhou',unknown:'Conferir destino'};
export const dateTime=d=>new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(d));
export async function api(path,options={}){const headers={'X-Vitraya-Client':'1',...options.headers};if(options.body&&!(options.body instanceof FormData))headers['Content-Type']='application/json';const response=await fetch('/api'+path,{...options,headers,body:options.body instanceof FormData?options.body:options.body?JSON.stringify(options.body):undefined});const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível concluir a operação.');return result;}
export function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const Market=({id})=><span className={'market market-'+id}>{markets[id]||id}</span>;
export function PageHeading({eyebrow,title,description,children}){return <div className="page-heading"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p className="page-description">{description}</p>}</div><div className="heading-actions">{children}</div></div>;}
export function Empty({icon:Icon=Package,title,description,children}){return <div className="empty"><div className="empty-icon"><Icon size={30}/></div><h2>{title}</h2><p>{description}</p><div className="empty-actions">{children}</div></div>;}
export function Modal({title,description,children,onClose,wide=false}){const ref=useRef(null);const titleId=useId(),descriptionId=useId();useEffect(()=>{const previous=document.activeElement;ref.current?.showModal();return()=>previous?.focus();},[]);return <dialog ref={ref} aria-labelledby={titleId} aria-describedby={description?descriptionId:undefined} className={'dialog '+(wide?'wide':'')} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="dialog-header"><div><h2 id={titleId}>{title}</h2>{description&&<p id={descriptionId}>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Fechar janela"><X size={20}/></button></div>{children}</dialog>;}
export function Field({label,children,hint}){return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
