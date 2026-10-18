// Etapa 5 (feed e links): colar links de qualquer loja, converter para afiliado (API, tag ou sessão),
// trazer foto/preço quando houver fonte permitida e buscar ofertas. Arquivo do agente da etapa 5.
// Contrato: docs/ARQUITETURA-MODULOS.md.
export const name='links';
export function create(ctx){
  return {
    name,
    async handle(){return false;},
    state(){return {};},
  };
}
