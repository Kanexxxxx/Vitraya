import React from 'react';
import {PageHeading} from '../ui.jsx';
import './seguranca.css';

// Etapa 3 (segurança): bloqueio do app, senha local e configurações de segurança. Arquivo do agente desta etapa.
// SecurityGate envolve o app inteiro (main.jsx). Enquanto não houver senha configurada, o app fica aberto como hoje.
export function SecurityGate({children}){return children;}
export function Seguranca(){return <PageHeading eyebrow="ETAPA EM ANDAMENTO" title="Segurança" description="Bloqueio do app com senha local e proteção dos dados. Em construção."/>;}
