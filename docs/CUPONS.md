# Cupons cadastrados por você

Cadastre o código real, marketplace, desconto percentual inteiro ou valor fixo em reais, compra mínima e teto opcional. Valores vazios de mínimo/teto significam zero; teto zero não impõe limite adicional. Defina início e expiração no horário deste computador quando a oferta tiver validade.

Escolha explicitamente o escopo: todos os produtos daquele marketplace, uma lista de produtos ou uma categoria exata. A categoria aceita diferença entre maiúsculas e minúsculas, mas não aproxima nomes. Um cupom de outra loja, pausado, futuro, expirado ou fora do escopo não participa da simulação.

O simulador escolhe um único cupom com a maior economia válida; empates mantêm a ordem da lista. Percentuais são arredondados para baixo em centavos. O teto é respeitado e o desconto nunca ultrapassa o preço. O preço final é uma simulação, sem modificar o catálogo nem publicar a oferta.

O cálculo considera um produto e as regras que você informou. Confira na loja condições de pagamento, primeira compra, conta, frete, quantidade e estoque. O aplicativo não descobre cupons externos, não consulta elegibilidade na loja e não comprova resgate. Cadastrar um código não o torna automaticamente válido.

Implementação integrada: a área **Cupons** usa as regras de `server/coupons.mjs`, o formulário/lista/simulador de `src/Coupons.jsx` e CRUD persistido no banco local. O backup lógico inclui os cupons e remapeia seus produtos na restauração. Os testes do motor passaram; a rodada visual/interativa final é consolidada em `docs/execucao/QA.md`.
