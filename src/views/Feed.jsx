import React from 'react';
import {ShopeeOffers} from '../Shopee.jsx';
import './feed.css';

// Etapa 5 (feed e links): buscar ofertas e colar links de qualquer loja. Arquivo do agente desta etapa.
// Ponto de partida: a busca Shopee que já existia.
export function Feed(props){return <ShopeeOffers {...props} openCatalog={()=>props.navigate('catalog')}/>;}
