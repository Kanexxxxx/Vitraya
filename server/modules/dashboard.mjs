// Etapa 4 (painel e conta): indicadores do início, histórico de envios com filtros e perfil/configurações.
// Arquivo do agente da etapa 4. Contrato: docs/ARQUITETURA-MODULOS.md.
export const name='dashboard';
export function create(ctx){
  return {
    name,
    async handle(){return false;},
    state(){return {};},
  };
}
