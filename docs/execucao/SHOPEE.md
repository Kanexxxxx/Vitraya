# Shopee Affiliate Open API — checkpoint

Responsável: Claude Code (retomada de 18/10/2026). Escopo: conector oficial de afiliados Shopee Brasil no Vitraya Studio.

## Marco 1 — contrato conferido (18/10/2026)

O portal oficial (`affiliate.shopee.com.br/open_api`) é um aplicativo JavaScript e não renderiza a documentação para leitura automática. O contrato foi montado cruzando a resposta do próprio servidor com duas referências de terceiros que concordam entre si.

**Evidência direta do servidor** (requisições sem credencial real, só com valores falsos):

| Requisição para `https://open-api.affiliate.shopee.com.br/graphql` | Resposta |
| --- | --- |
| Sem `Authorization` | `10020 Invalid Authorization Header` |
| `HMAC Credential=1` | `10020 Unsupported Auth Type` |
| `SHA256 Credential=123456, Timestamp=1, Signature=0…` | `10020 Request Expired` |
| `SHA256 Credential=123456, Timestamp=<agora>, Signature=0…` | `10035 You currently do not have access to the Shopee Affiliate Open API Platform` |
| Mesmo cabeçalho com os campos em outra ordem | `10035` (a ordem não importa) |

**Contrato adotado:**

- POST GraphQL em `https://open-api.affiliate.shopee.com.br/graphql`, `Content-Type: application/json`.
- `Authorization: SHA256 Credential={AppID}, Timestamp={unix em segundos}, Signature={hex}`.
- `Signature = SHA256(AppID + Timestamp + Payload + Secret)`, em hexadecimal minúsculo, onde `Payload` é exatamente o corpo JSON enviado. O conector assina e envia o mesmo buffer.
- Operações usadas: `productOfferV2` (busca de ofertas, `limit` até 50) e `mutation generateShortLink(input:{originUrl, subIds})`.
- Códigos de erro tratados: `10020` (cabeçalho, assinatura ou relógio), `10035` (conta sem acesso à Open API), `10030`/HTTP 429 (limite de requisições). Não há número oficial de limite por hora confirmado; o conector faz uma chamada por vez e não repete sozinho.

**Referências de terceiros usadas só para cruzar** (não são contrato oficial):

- [snja/shopee-affiliate-openapi](https://github.com/snja/shopee-affiliate-openapi) (Python, arquivado): mesma fórmula de assinatura e `generateShortLink` com `subIds`.
- [Shopee.Affiliate no NuGet](https://www.nuget.org/packages/Shopee.Affiliate) (SDK .NET para o Brasil): mesmo endpoint `.com.br`, mesma fórmula, `productOfferV2` + `generateShortLink`, código `10030` como limite, `limit` máximo 50.

**Lacunas que só o primeiro teste real fecha:**

- Nomes exatos dos campos de `productOfferV2` (adotados: `itemId`, `productName`, `imageUrl`, `priceMin`, `priceMax`, `priceDiscountRate`, `commissionRate`, `sales`, `ratingStar`, `shopName`, `shopId`, `productLink`, `offerLink`, `periodEndTime`, `pageInfo{page limit hasNextPage}`). Se algum não existir, a Shopee devolve erro de validação GraphQL e o app mostra a mensagem.
- Escala de `commissionRate` (fração, como `0.08` = 8%, segundo as referências).
- O teste de conexão usa a consulta mínima `productOfferV2(limit:1){nodes{itemId}}`: prova credencial e acesso, mas não os demais campos.

## Próxima ação

Implementar `server/shopee.mjs` (segredo em `private/shopee.json` com ACL restrita, variáveis de ambiente com precedência), rotas `/api/shopee*`, tela no front-end e testes com servidor HTTP simulado em loopback. Nenhuma chamada com credencial real até o titular configurar a conta pelo app.

## Marco 2 — back-end e testes (18/10/2026)

- `server/shopee.mjs`: `ShopeeAffiliate` com AppID/segredo em `private/shopee.json` (ACL do usuário via `restrictPrivate`), `VITRAYA_SHOPEE_APP_ID`/`VITRAYA_SHOPEE_SECRET` com precedência, chamadas em série, assinatura sobre o buffer exato, textos da busca escapados com `JSON.stringify` (literal GraphQL válido), preços em centavos sem ponto flutuante, cache de ofertas por 2 h (máx. 1.000) para a importação usar só dados devolvidos pela API.
- Rotas: `GET/PUT/DELETE /api/shopee`, `POST /api/shopee/test`, `/search` (palavra-chave, ordenação, página, até 50; aceita link de produto colado e extrai loja/item), `/link` (`generateShortLink`, só hosts `shopee.com.br`/`shope.ee`, até 5 subIds) e `/import` (até 50 IDs; baixa a foto só de `cf.shopee.com.br`/`*.susercontent.com`, valida bytes, deduplica por `shopee:<itemId>` e pelo link exato; preço original fica 0, nunca estimado).
- `GET /api/state` inclui `shopee` (estado sem segredo; AppID mascarado). CSP `img-src` liberou os dois hosts de imagem da Shopee para a tela de resultados.
- `requestGateway` ganhou `raw`/`maxBytes` (imagem binária com o mesmo bloqueio de rede privada e redirecionamento).
- Estado da conexão: `connected` só após resposta autenticada; erros de autenticação/acesso (`10020`, `10035`) viram `error`; limite (`10030`) e rede não mexem no estado.
- `test/backend.shopee.mjs`: **6/6**, com mock GraphQL em loopback que recalcula a assinatura e recusa cabeçalho, relógio ou chave errados. Teste de mutação: fórmula com a ordem trocada → 5 falhas; escape removido → 1 falha; arquivo restaurado idêntico (`cmp`).
- `npm test`: **30/30 em 3 execuções**. Nenhuma chamada com credencial real.

Próxima ação: tela "Ofertas Shopee" no front-end (credenciais, busca, importação, conversor de link) e E2E sem rede externa.

## Marco 3 — tela, E2E e documentação (18/10/2026)

- `src/Shopee.jsx` (view **Ofertas Shopee**, 2º item do menu): credenciais com orientação do portal, estado da conexão, busca com 5 ordenações e "carregar mais", cartões com comissão/vendas/avaliação/validade, seleção só das ofertas novas, importação com relatório por item, "No catálogo" para o que já foi importado, conversor de link com identificador. Reaproveita as classes do catálogo; CSS novo no fim de `styles.css`. Card da Shopee em Integrações mostra o estado real da Open API.
- `test/e2e/shopee.spec.js`: **2/2** (1440 e 390 px) com Shopee simulada que confere a assinatura: conectar, testar, segredo fora do `/api/state`, buscar com ordenação, importar (produto com link exato, preço em centavos, foto baixada para `/media`), converter link, abrir o catálogo, sem erro de console e sem overflow. Capturas em `docs/screenshots/shopee-*.png` (dados fictícios), conferidas visualmente; ajustado o alinhamento do conversor.
- Revisão própria achou: no modo variáveis de ambiente, o resultado do teste se perdia ao reiniciar. Corrigido; o teste novo falha sem a correção (5/6) e passa com ela.
- Resultado final: `npm test` **30/30**, build ok, `npm run test:e2e` **9/9**. Guia em `docs/USO.md` (seção Ofertas Shopee), README e `docs/VALIDACAO.md` atualizados.

## Pendências

- **Teste real pelo titular** (única forma de fechar as lacunas do marco 1): `npm run build`, `npm start`, abrir Ofertas Shopee, salvar AppID/chave, **Testar conexão**, buscar uma palavra e importar 1 oferta. Se aparecer "Cannot query field …", ajustar `FIELDS` em `server/shopee.mjs` para o nome que a Shopee indicar.
- Conferir no primeiro resultado real se `commissionRate` vem como fração; a tela já trata os dois formatos.
- Limite oficial de requisições por hora ainda não confirmado.
