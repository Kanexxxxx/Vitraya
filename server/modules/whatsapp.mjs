// Etapa 1 (WhatsApp): conexão por QR Code (Baileys), números, grupos, canais e envio.
// Arquivo do agente da etapa 1. Contrato: docs/ARQUITETURA-MODULOS.md.
export const name='whatsapp';
export function create(ctx){
  const {ApiError}=ctx.helpers;
  return {
    name,
    async handle(){return false;},
    state(){return {instances:[],destinations:0};},
    // ---- Interface pública usada por outras etapas (não mude a assinatura sem combinar) ----
    // status() -> {instances:[{id,name,status:'disconnected'|'connecting'|'qr'|'connected'|'logged_out',phone:'•••1234'|'',updatedAt}]}
    status(){return {instances:[]};},
    // destinations({activeOnly}) -> [{id,instanceId,jid,kind:'group'|'channel'|'contact',name,active}]
    destinations(){return [];},
    // sendProduct({productId,destinationIds,message,idempotencyKey,confirm:true})
    //   -> {ok:boolean,results:[{destinationId,status:'sent'|'failed'|'skipped',deliveryId,messageId?,error?}]}
    // Grava cada envio na tabela 'deliveries' (connectorId:'whatsapp'), sem repetição automática.
    async sendProduct(){throw new ApiError('Conexão de WhatsApp ainda não disponível.',501);},
  };
}
