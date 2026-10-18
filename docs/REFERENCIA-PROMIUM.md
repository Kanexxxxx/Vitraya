# Promium — referência pública e comparação funcional

Verificado em **17/10/2026**, America/Sao_Paulo. Alvo confirmado pelo titular: [promium.space](https://promium.space/). O Vitraya Studio será usado **no navegador deste computador, para uso pessoal, sem hospedagem nem domínio**.

## O que a evidência permite concluir

O Promium anuncia um SaaS que transforma ofertas em mensagens e as distribui para WhatsApp/Telegram. A inspeção leu páginas públicas e capturou a homepage e sua demonstração ilustrativa; não acessou o painel autenticado nem comprovou envios, conversões ou integração real. O Vitraya Studio é uma implementação própria de parte desse fluxo. **Paridade completa com Promium não foi demonstrada.** [Página de apresentação](https://promium.space/), [sobre o produto](https://promium.space/sobre).

As funcionalidades descritas na coluna Promium abaixo são **declarações públicas do fornecedor**, exceto a demonstração visual que foi observada. A coluna Vitraya foi atualizada após os conectores/worker em `src/main.jsx`, `src/Workflow.jsx`, `src/Connectors.jsx`, `src/Coupons.jsx` e `server/`. Os 22 testes locais desta rodada passaram com provedores simulados; QA E2E final e conexão real têm estados próprios em [VALIDACAO.md](VALIDACAO.md).

## Evidência REA preservada

- Skill lida: `.agents/skills/reverse-engineer-anything/SKILL.md`; contrato de captura e guia de observação do REA também conferidos.
- `npx -y rea-agents@6.5.0 doctor --client codex --json` terminou com código 1: Node 24.20.0 válido, registro MCP com `config_drift`. Não foi executado setup nem alterada configuração global.
- `capture-browser-scenario` via CLI funcionou em Chrome instalado, modo headless com perfil temporário. Foram declaradas somente navegação inicial e espera de 1.500 ms; nenhum login, formulário, compra, conexão ou mensagem.
- Homepage: Evidence `ev_b38e3a3c58580308c60f920f644db2e2e5ae8402488a72a4c969ab5330e0adff`; URL `https://promium.space/`; DOM, acessibilidade, screenshot e URL capturados. SHA-256 da imagem: `a21da114682dc3936947b6a35e47344f4ce2df385476873175205f4c0f888a69`.
- Demonstração: Evidence `ev_b71ed681b88c58ccb4275e2b45440db607b2d577d7e8cbaa0b041bced6b9c76e`; URL `https://promium.space/#ver-fluxos`; acessibilidade, screenshot e URL capturados. SHA-256 da imagem: `4cfbfc30551f37c84db961fa6d30b91e82eaebea2ae154058e637c6604f70780`.
- Ambos retornaram completude das seções solicitadas e `cleanup: terminated-owned-process`. Isso não prova completude do aplicativo inteiro. Não foram capturados valores de storage, corpos de rede ou credenciais. Não houve extração/análise de código proprietário.
- Arquivos locais públicos em `referencias/promium/`, fora do Git: cenários JSON, Evidence JSON completos, `public-homepage.png`, `public-illustration.png` e texto de acessibilidade. As imagens foram abertas e conferidas. A demonstração contém a indicação de que suas telas e dados são ilustrativos; não é uma gravação de operação autenticada.

Limitações reportadas pelo REA: identidade de artefato executável não disponível, plataforma/arquitetura do host não observadas, ordem dos eventos não prova causalidade, recursos não selecionados não foram investigados. Não foi realizado teste do provedor WhatsApp ou de marketplace.

## Funções Promium versus Vitraya Studio

| Função | Promium: evidência pública | Vitraya: estado conferido no código | Acesso ou trabalho restante |
| --- | --- | --- | --- |
| Feed/catálogo | Cards editáveis, filtros, favoritos/fixados e criação por link. [Feed](https://ajuda.promium.space/artigo-feed-produtos.html) | Cadastro/edição/exclusão, cards, tags, favoritos, status e busca/filtros locais. | Sem ingestão só por link, fixados ou renovação/expiração automática de ofertas. |
| Planilhas | Fila aceita lista de links, incluindo coluna Offer Link/Links. [Fila](https://ajuda.promium.space/artigo-fila-promocoes.html) | Importa dados completos CSV/JSON/XLSX, com prévia, erros e dedupe pelo link exato. Exporta esses formatos. | Uma lista contendo só links não busca título, preço ou foto automaticamente. |
| Mensagem personalizada | Variáveis de produto, preço e CTA. [Apresentação](https://promium.space/#funcionalidades) | Modelos editáveis e substituição de título, preço, desconto, cupom, link, loja e assinatura. | CTA por IA não implementada; não há chamada de modelo nem custo de API de IA. |
| Foto e arte | Mensagem com foto ou preview de link; aceita imagem escolhida. [Envio Manual](https://ajuda.promium.space/artigo-envio-manual.html) | Upload PNG/JPEG/WebP e criativos Boutique, Oferta direta e Essencial. Saída PNG/JPG quadrada, feed ou story. | Não há vídeo/GIF nem alteração de preview remoto WhatsApp. Arte local não equivale a envio. |
| Kit de arquivos | Exportação integral equivalente de imagens/kit não foi comprovada. | Seleção de produtos gera ZIP com arte, legenda e JSON por oferta. Backup lógico inclui fotos. | Testar kit e restauração visualmente no QA local. |
| Campanha e agenda | Envio direto, manual e programado a destinos conectados. [Envio Manual](https://ajuda.promium.space/artigo-envio-manual.html) | Publicação manual e envio avulso por Telegram/Evolution com confirmação, recibo e idempotência. | Conta real não conectada; aceite da API não comprova entrega/leitura. Envio usa foto original, sem anexar arte Canvas automaticamente. |
| Fila automática | Intervalo, janela de horário e várias fontes de entrada. [Fila](https://ajuda.promium.space/artigo-fila-promocoes.html) | Worker local opt-in por campanha, bloqueio de mudanças após autorização e estados de falha/desconhecido. Seleção em lote cria agenda manual por intervalo. | Sem busca/captura externa, janela diária recorrente ou retry. Computador/servidor devem ficar ligados. |
| WhatsApp grupos/canais | Instância conectada por QR/código e seleção de destinos. [Primeiros passos](https://ajuda.promium.space/artigo-primeiros-passos.html) | Conector Evolution v2 para números/grupos, configuração e teste sem enviar. Canais WhatsApp têm preparação manual. | Gateway/instância precisam existir e ser configurados pelo titular. Não implementa QR próprio, listagem/monitoramento ou envio a Canais. Testes só com mocks. |
| Telegram | Bot administrador e vínculo de chats; alguns recursos de conta são condicionais. [Telegram](https://ajuda.promium.space/artigo-telegram.html) | Conector Bot API, teste de bot/permissões/destino e envio texto/foto implementados. | Token e destino autorizado precisam ser configurados; nenhum teste com conta real. Sem leitura de grupos ou conexão de conta pessoal. |
| Shopee afiliados | App ID/Secret e Sub_id opcional. [Credenciais](https://ajuda.promium.space/artigo-credenciais-api.html) | Importa produto e mantém link afiliado recebido. | Documentação oficial habilitada na conta, credenciais e conector específico; não copiar contrato de terceiros como API oficial. |
| Mercado Livre/SHEIN | Documentação descreve cookie de sessão para conversão. [Credenciais](https://ajuda.promium.space/artigo-credenciais-api.html) | Importa produto e mantém link recebido. | Sem coleta de cookie, extensão ou conversão. Sessão de navegador não é credencial da API pública de vendedor. |
| TikTok Shop | Recebe link já afiliado; não converte nem oferece busca por palavra-chave. [TikTok](https://promium.space/automacao-tiktok-shop-whatsapp) | Catálogo manual com preservação do link. | Extração de nome/foto/preço não implementada. Converter links não deve ser prometido como paridade com Promium. |
| Busca automática | Busca periódica em 11 lojas; filtros variam por loja. [Busca](https://ajuda.promium.space/artigo-busca-produtos.html) | Pesquisa apenas o catálogo já salvo. | Sem descoberta externa, consulta de preço ou atualização de estoque. Exige acesso por plataforma. |
| Cupons | Seleção de cupom e cálculo condicionado ao produto. [Cupons](https://promium.space/cupons-automaticos-para-afiliados) | Cadastro integrado, persistência/backup e simulador de códigos reais com mínimo/teto, validade e escopo; testes do motor passaram. O campo cupom do produto continua texto. | Não descobre cupons externos nem consulta elegibilidade na loja; simular não altera preço do catálogo. |
| Monitoramento/Clone | Lê origens e converte/recompõe ofertas; clone preserva mais do texto. [Monitoramento](https://ajuda.promium.space/artigo-monitoramento.html) | Não implementado; app não lê conversas, grupos ou contatos. | Depende de provedor e autorização de acesso a cada origem, conversão confiável e processamento de mídia. |
| Replicador | Copia texto, foto e vídeo sem converter links. [Replicador](https://ajuda.promium.space/artigo-replicador-mensagens.html) | Não implementado. | Captura e envio remotos não existem; kit baixado não equivale a replicador automático. |
| Extensão Chrome/Edge | Lê a página do produto e facilita conversão/fila/sessões. [Extensão](https://promium.space/extensao-para-afiliados) | Não há extensão instalada ou implementada. | Extensão própria, permissões e contratos de cada marketplace seriam trabalhos separados. |
| Vitrine pública/rotador | Página pública, link curto, distribuição entre grupos e métricas. [Vitrine](https://ajuda.promium.space/artigo-vitrine.html), [apresentação](https://promium.space/#funcionalidades) | Fora da entrega local pessoal; não há publicação, domínio ou rastreamento público. | Só reconsiderar se o titular mudar explicitamente o escopo. |
| Analytics | Histórico de envios e cliques da vitrine. [Privacidade](https://promium.space/politica-privacidade) | Atividade local, contagens, confirmação manual e recibos persistidos de aceite/falha dos conectores. | Não mede entrega/leitura, clique real, venda, comissão ou retorno financeiro. |

## Onboarding e acesso observado

A [página de login](https://promium.space/login) mostra acesso por e-mail/senha e verificação humana. Nenhuma credencial foi preenchida. O [guia inicial](https://ajuda.promium.space/artigo-primeiros-passos.html) orienta conectar número, cadastrar grupos/canais, configurar lojas, criar automação e postar o link no grupo de origem. Esse fluxo foi **lido na ajuda**, sem reprodução na conta de alguém.

O Vitraya segue o escopo pessoal: abrir localhost pelo atalho, importar/cadastrar produtos, enviar fotos, criar arte/legenda e publicar manualmente ou pelos conectores configurados. Os agendamentos automáticos exigem autorização prévia e computador/servidor ligados. As credenciais não foram fornecidas nesta execução; nenhum envio real ocorreu.

## Contratos e diferenças que afetam a implementação

Os [Termos de Uso](https://promium.space/termos-de-uso), atualizados em 20/09/2026, reservam direitos sobre código/design e restringem engenharia reversa, extração de código e automações não fornecidas pela plataforma. A pesquisa permaneceu na documentação e apresentação públicas; não foi usado login, bypass de verificação ou endpoint privado. O relatório descreve fluxos de produto, sem incorporar código, logotipo ou textos comerciais do Promium.

A [Política de Privacidade](https://promium.space/politica-privacidade), atualizada em 07/10/2026, declara WhatsApp por Z-API/Evolution, sessões de afiliados, Telegram Bot API e extração auxiliar de dados. Isso explica o que o fornecedor afirma operar; não concede ao Vitraya credenciais, autorização nem garantia de compatibilidade. Consulte também [INTEGRACOES.md](INTEGRACOES.md) para os limites conferidos nos próprios marketplaces e no WhatsApp.

Há uma divergência material: a [página TikTok](https://promium.space/automacao-tiktok-shop-whatsapp) anuncia monitoramento, enquanto a [ajuda de Monitoramento](https://ajuda.promium.space/artigo-monitoramento.html) exclui TikTok expressamente. A disponibilidade real está **não resolvida** sem esclarecimento do fornecedor ou acesso autorizado ao painel. Não escolher uma das declarações como fato confirmado.

## Pendências exatas

1. Consolidar a rodada E2E final no checkpoint QA e em VALIDACAO.md, separadamente de testes unitários/API e leitura de código.
2. Configurar/testar Telegram ou Evolution com acesso do titular quando ele decidir conectar uma conta; não foi realizado envio real. Para marketplace, implementar o acesso específico antes de prometer busca, preço ou conversão.
3. Para paridade adicional de interface, usar screenshots ou navegação da conta do próprio titular sem compartilhar cookies/senhas; o painel protegido não foi observado aqui. As telas ilustrativas públicas não bastam para certificar paridade.
4. Manter a entrega identificada como aplicativo web local de catálogo/criação, publicação manual e conectores opcionais de envio/agendamento. A referência Promium está identificada; as funções de descoberta, conversão e monitoramento continuam fora da implementação atual.
