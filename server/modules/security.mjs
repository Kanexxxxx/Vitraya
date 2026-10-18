// Etapa 3 (segurança): bloqueio do app com senha local, sessão, auditoria e cofre de segredos.
// Arquivo do agente da etapa 3. Contrato: docs/ARQUITETURA-MODULOS.md.
export const name='security';
export function create(ctx){
  return {
    name,
    // Roda antes de qualquer rota. Devolva false se já respondeu (ex.: 401 bloqueado).
    // Enquanto não houver senha configurada, o app continua aberto (os testes das outras etapas dependem disso).
    async gate(){return true;},
    async handle(){return false;},
    state(){return {};},
  };
}
