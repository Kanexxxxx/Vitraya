// Encaixe das etapas: cada módulo cuida das próprias rotas, tabelas, estado e encerramento.
// Contrato e responsáveis: docs/ARQUITETURA-MODULOS.md. A ordem importa: segurança primeiro (gate).
import * as security from './security.mjs';
import * as whatsapp from './whatsapp.mjs';
import * as automation from './automation.mjs';
import * as dashboard from './dashboard.mjs';
import * as links from './links.mjs';

export const modules=[security,whatsapp,automation,dashboard,links];
