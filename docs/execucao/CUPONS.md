# Cupons locais — 17/10/2026

- Responsável: agente de cupons; escopo `server/coupons.mjs`, `test/coupons.test.mjs`, `src/Coupons.jsx`, documentação deste recurso. Não alterar `main.jsx`, CSS, Store ou rotas compartilhadas.
- Lidos AGENTS, continuidade, contrato e checkpoint backend. A implementação é independente das páginas/credenciais do Promium.
- Contrato alinhado ao backend: `validateCoupon(input)` devolve campos normalizados sem ID; `bestCoupon(product,coupons,now)` devolve `null` ou `{coupon,discount,finalPrice}`. Erro próprio `CouponValidationError` com status 400, pois o módulo precisa ser importável no browser sem dependência de Node.
- Escopo: lista de IDs ou categoria, mutuamente exclusivos; ambos vazios significam todos os produtos do marketplace, escolhidos explicitamente no formulário. Dinheiro em centavos; percentual inteiro; início inclusivo/fim exclusivo; teto 0 significa sem teto; empate preserva a primeira oferta da lista; desconto nunca excede o preço.
- Próxima ação exata: escrever testes de elegibilidade/limites, implementar módulo puro, componente de cadastro/listagem/simulação e executar `node --test test/coupons.test.mjs`. Nenhum cupom externo será descoberto, nenhuma conta será conectada e nenhuma mensagem será enviada.

## Marco 1 — regras, interface isolada e testes

- Criados `server/coupons.mjs`, `test/coupons.test.mjs`, `src/Coupons.jsx` e `docs/CUPONS.md`; guia de uso e matriz Promium atualizados para o recurso local. Arquivos compartilhados de código preservados.
- Implementado: cadastro/edição com moeda BR, escopo escolhido explicitamente, lista com condições/estado, pausa por edição, confirmação inline de exclusão e simulador por produto/horário.
- Contrato do componente: named/default `Coupons({coupons,products,onSave,onDelete,notify,busy})`; `onSave(payload)` inclui ID somente ao editar; `onDelete(id)`; ambos aguardados. `notify(text,error=false)`. O módulo puro também é importado no browser.
- `node --test test/coupons.test.mjs` inicialmente falhou por módulo ainda inexistente; após implementação passou **8/8**, sem falhas/skips: validação, datas inválidas/fuso/limites inclusivo-exclusivo, origem, mínimo, escopo, teto, arredondamento, empate, não mutação e ausência de economia para dados inválidos.
- `node --check server/coupons.mjs` passou. Compilação isolada do JSX por `transformWithOxc` do Vite e renderização real por `react-dom/server` passaram nos estados vazio e produto fictício R$100,00 com cupom de 10% resultando em R$90,00. Isso não equivale a teste visual/interativo no navegador.
- Pendência: responsável montar componente na navegação/main, backend integrar persistência/rotas/backup e incluir o teste novo no script npm; agente não alterou main, CSS, Store ou app. A versão atual do npm test só inclui backend/domain.
- Limites: sem descoberta automática de cupons, sem consulta à loja, sem composição de descontos, sem frete/quantidade ou regras de conta/pagamento. Simulação não muda preço do produto nem faz publicação.
- Próxima ação exata: backend concluir contrato CRUD; responsável integrar componente e executar testes completos/build/QA no navegador, incluindo salvar percentual, simular teto e mínimo, editar pausa e excluir.

## Marco 2 — integração conferida por leitura

- Componente montado em `main.jsx` com menu e callbacks; script npm atualizado para incluir o teste de cupons. Backend implementou CRUD `/api/coupons`, estado público e backup/restauração com remapeamento de IDs de produtos.
- A coordenação informou execução de `npm test` com **22/22** aprovados nesta rodada, incluindo os oito testes de cupons. Não foi teste de cupom em loja nem integração de conta real.
- Documentação atualizada para a integração existente. Próxima ação exata: QA final no navegador; consolidar em `docs/execucao/QA.md` e `docs/VALIDACAO.md` sem confundir renderização/rotas com resgate real.
