# Integrações de afiliados — pesquisa pública

Atualizado em 17/10/2026 (America/Sao_Paulo). Relatório copiado para o Vitraya Studio; o original está em [historico/AFILIADOS-INTEGRACOES-original-nexa.md](historico/AFILIADOS-INTEGRACOES-original-nexa.md). Projeto de ofertas separado da Nexakeep; nenhuma conta conectada, mensagem enviada ou configuração global alterada.

## Estado atual do aplicativo local

Telegram Bot API e Evolution API v2 estão **implementados**, com configuração local, teste sem envio, envio avulso confirmado, idempotência e agendamento automático autorizado por campanha. A validação desta entrega usa provedores simulados; não houve configuração de conta ou envio real. Telegram testa identidade e permissões do destino; Evolution testa estado aberto da instância e formato do destino, sem comprovar permissão ou entrega ao destinatário.

Evolution atende números e grupos `@g.us`, usando gateway do titular já existente. **Canais WhatsApp não são suportados pelo conector** e continuam com arte/legenda e publicação manual. O worker funciona enquanto computador/servidor estiverem ligados, não repete falhas e marca envios interrompidos como desconhecidos. Telegram pode enviar foto e texto separados quando a legenda ultrapassa 1.024 caracteres.

Credenciais ficam em arquivo privado do diretório de dados, com acesso restrito, ou em variáveis de ambiente; não são cifradas pelo aplicativo, não aparecem no estado público e não entram no backup lógico. Configuração via ambiente tem precedência e exige alteração no processo/reinício, não no formulário:

- Telegram: `VITRAYA_TELEGRAM_BOT_TOKEN`, `VITRAYA_TELEGRAM_CHAT_ID`.
- Evolution: `VITRAYA_EVOLUTION_URL`, `VITRAYA_EVOLUTION_API_KEY`, `VITRAYA_EVOLUTION_INSTANCE`, `VITRAYA_EVOLUTION_NUMBER`.

Os cartões de marketplace ainda representam importação e preservação de link. Busca de ofertas, conversão, comissão e estoque não são funções ativas. A pesquisa histórica abaixo fundamenta esses limites; os fluxos atuais estão em [USO.md](USO.md), o contrato em [CONTRATO.md](CONTRATO.md) e a validação em [VALIDACAO.md](VALIDACAO.md).

## Marco 1 — limites de integração conferidos

- A pesquisa original conferiu a continuidade da Nexakeep e seu histórico de WhatsApp; as decisões de agendamentos desse projeto não se aplicam automaticamente ao Vitraya Studio.
- TikTok Shop: [guia oficial Affiliate integration](https://partner.tiktokshop.com/docv2/page/affiliate-integration) confirma APIs específicas de afiliados, acesso inicialmente desativado e aprovação necessária. Autorização de criador e de vendedor são distintas. A habilitação e cobertura do Brasil precisam ser confirmadas na conta do titular.
- Mercado Livre: [tutorial oficial de geração de links](https://www.mercadolivre.com.br/l/afiliados-gere-seus-links) descreve Central, Gerador e Barra; uma API pública de geração de links de afiliado ainda não foi comprovada nesta pesquisa.
- Shopee: o [portal oficial Open API](https://affiliate.shopee.com.br/open_api) responde como aplicativo JavaScript. Em 18/10/2026 o contrato foi conferido contra o próprio endpoint `open-api.affiliate.shopee.com.br/graphql` e duas referências de terceiros; conector implementado. Detalhes e lacunas em [execucao/SHOPEE.md](execucao/SHOPEE.md).
- Marco concluído: matriz e orientação abaixo. A conclusão é sobre documentação pública; não representa homologação na conta do titular.

## Verificação desta rodada

- Consultas públicas de leitura via busca e abertura de páginas oficiais; sem execução de APIs autenticadas.
- Não há testes de integração real executados. Aceite local não comprova envio ou atribuição de comissão.

## Marco 2 — matriz de capacidades e dependências

| Plataforma | Evidência primária verificada | O que entregar localmente | Dependência para automação real |
| --- | --- | --- | --- |
| Shopee Brasil | [Portal Open API](https://affiliate.shopee.com.br/open_api) existe, mas o conteúdo depende de JavaScript e não foi acessado com login. [Ajuda de links](https://help.shopee.com.br/portal/10/article/128461-Como-gerar-links-de-produtos-ou-lojas) confirma criação pelo aplicativo e computador. | Importar CSV/JSON e imagens fornecidas, preservar link afiliado exato e permitir colar o link gerado no portal. | Obter acesso e documentação oficial da API no portal do titular; conferir credenciais, assinatura, schema, limites e permissões antes de implementar o conector. App ID/Secret citados por terceiros não foram confirmados em fonte primária acessível nesta rodada. |
| SHEIN Brasil | [Comunicado oficial](https://br.shein.com/campus--a-1500.html): programa antigo encerrado em 29/08/2024; programa novo requer cadastro e validação de rede social. [API de autorização](https://open.sheincorp.com/documents/apidoc/detail/3001520-1000012) atende lojas autorizadas. | Importação de catálogo e imagens locais, link e código da conta fornecidos pelo usuário, marcação de preço/data de revisão. | API pública específica para afiliados brasileiros não comprovada. App ID, assinatura e openKeyId/secretKey da Open Platform são de lojas; não anunciar como integração de afiliado. |
| Mercado Livre | [Gerador de links oficial](https://www.mercadolivre.com.br/l/afiliados-gere-seus-links) usa Central/Barra/Gerador. [Documentação de permissões](https://developers.mercadolivre.com.br/pt_br/permissoes-funcionais/) trata autorização e recursos de vendedor. | Preservar links existentes e importar catálogos; campo para etiqueta já gerada no programa. | API pública de geração/atribuição de links afiliados não comprovada. OAuth/Client ID/Secret da API de vendedor não concede essa capacidade automaticamente. |
| TikTok Shop | [Affiliate integration](https://partner.tiktokshop.com/docv2/page/affiliate-integration) confirma família Affiliate, aprovação de acesso e tokens distintos para criador/vendedor. | Catálogo importado com link já gerado; adapter futuro com capacidades explícitas. | Cadastro de parceiro/desenvolvedor, app e scopes aprovados, autorização do criador com state, App Key/Secret e token. Validar disponibilidade brasileira e versão vigente. O guia exemplifica um link para colaboração/vitrine de criador; isso não prova atribuição de venda externa no WhatsApp para esta conta. |
| WhatsApp Canais | [Meta descreve Canais separados dos chats](https://about.fb.com/news/2023/09/whatsapp-channels-global-launch/). Não foi localizado endpoint oficial de publicação em Canais nas fontes verificadas. | Copiar legenda, baixar imagem e pacote de posts; publicação feita pelo titular. Fila serve como agenda de preparação/lembrete. | Exigir documentação de endpoint oficial específico e acesso válido antes de prometer envio automático. Não confundir endpoint de mensagens com Canais. |
| WhatsApp mensagens diretas | [Coleção oficial Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api) documenta WABA/número e envio para destinatário. [Política oficial](https://whatsappbusiness.com/policy/) exige opt-in; fora da janela de atendimento de 24 h, template aprovado. | Adapter separado e desabilitado até configuração e teste real. | App Meta/WABA/número, token e permissões, opt-in documentado, templates de marketing aprovados e orçamento de mensagens. Não tratar mensagens promocionais como lembretes de utilidade. |

### Regras dos programas que afetam o produto

- [Shopee, termos 2.2 e 4.3](https://help.shopee.com.br/portal/10/article/124094-Programa-de-Afiliados-Shopee-Termos-e-Condi%C3%A7%C3%B5es): a licença dos links é limitada; alteração sem autorização e extração automatizada de materiais da plataforma têm restrições expressas. A importação deve usar arquivos e links legitimamente obtidos pelo titular; não adicionar scraper de catálogo como se fosse integração homologada.
- [Mercado Livre, checklist](https://www.mercadolivre.com.br/l/checklist) e [direcionamento de visitas](https://www.mercadolivre.com.br/l/afiliados-direcionamento-de-visitas): divulgação tem canais permitidos e restrição a grupos privados; links devem vir das ferramentas do programa. Um redirecionador próprio para contar cliques precisa de validação das regras e não deve substituir o link por padrão.
- O [changelog TikTok Shop](https://partner.tiktokshop.com/docv2/page/r1wchdjn) lista alterações e descontinuação de versões de Affiliate. Não copiar endpoints antigos do guia sem conferir a referência vigente e mercado habilitado.

## Recomendação de implementação — decisões de engenharia

Estas decisões são recomendações para o aplicativo local, e não capacidades prometidas pelas plataformas:

1. Catálogo com origem, código externo, título, moeda, preço atual e anterior, cupom, URL original, link afiliado imutável, caminho da imagem, data de importação e última conferência. Comissão fica vazia até evidência da plataforma ou dado importado; nunca inventar um percentual.
2. Importar CSV/JSON com prévia e relatório de linhas rejeitadas; associar pasta/ZIP de imagens sem executar conteúdo; exportar os mesmos dados, imagens e legendas. Não alterar pastas originais do usuário.
3. Gerar criativos PNG e legendas para WhatsApp/Telegram/redes a partir dos dados locais. Exibir oferta expirada, imagem ausente e link pendente antes de preparar o post.
4. Capacidades independentes por adapter: importar, consultar preço, gerar link, consultar comissão, publicar. Estados: disponível localmente, não configurado, aguardando aprovação, não comprovado ou conectado e testado. Um cartão de marketplace não significa integração ativa.
5. Fila com estados rascunho, pronto, agendado para preparação, publicado manualmente e falhou. Copiar texto, baixar imagem ou abrir WhatsApp não comprova envio. Registrar publicado manualmente somente após ação explícita do titular.
6. Credenciais futuras somente no servidor e fora de exportações/backups compartilháveis; nunca guardar App Secret/token em HTML ou localStorage. Conectores reais devem guardar escopo/mercado/expiração, limitar repetição e registrar erros sem conteúdo privado.

## Pendências e próxima ação exata

- A entrega local pode concluir catálogo, importação/exportação, criativos, legendas e organização da publicação com dados do titular.
- Automação real continua dependente de contas/credenciais/aprovação/documentação por fornecedor e de teste externo com autorização; nenhum teste externo ocorreu nesta pesquisa.
- Próxima ação exata do responsável: aplicar a matriz de capacidades à interface e ao README; testar importação/exportação e imagem com catálogo fictício e preservar os links; oferecer conectores reais somente após validar a documentação e acesso da conta.
- Retomada: abrir este arquivo, conferir a versão dos documentos oficiais, obter no portal do titular a documentação habilitada e criar teste de contrato sanitizado do adapter antes de conectá-lo à fila.
- Esta pesquisa não alterou código, serviço, conta ou configuração global. A documentação de uso do Vitraya Studio tem checkpoint próprio em `docs/execucao/DOCUMENTACAO.md`.
