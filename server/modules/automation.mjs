// Etapa 2 (automação): envios no piloto automático com limite diário, janela de horário,
// intervalo aleatório entre envios e funcionamento 24 h. Arquivo do agente da etapa 2.
// Envia pelo WhatsApp via ctx.modules.get('whatsapp').sendProduct(...). Contrato: docs/ARQUITETURA-MODULOS.md.
export const name='automation';
export function create(ctx){
  return {
    name,
    async handle(){return false;},
    state(){return {enabled:false};},
    async start(){},
    async close(){},
  };
}
