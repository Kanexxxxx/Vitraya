# Validação do Vitraya Studio

Atualizado em 18/10/2026, America/Sao_Paulo. Entrega: **um aplicativo web local de uso pessoal**, acessível no navegador por `127.0.0.1:4317`, com dados locais e conectores opcionais. A Nexakeep permanece em seu projeto próprio.

## Resultado verificado e aceite pendente

| Verificação | Resultado real desta rodada | Limite da evidência |
| --- | --- | --- |
| `npm test` (unitários + API) | **30/30 passaram, em 12 execuções seguidas antes da Shopee e 3 depois** (18/10): 6 integração, 7 conectores/fila/limites, 6 Shopee, 8 cupons, 3 domínio. | Provedores Telegram/Evolution/Shopee simulados em loopback, bases temporárias. |
| Build | `npm run build` passou em 18/10, depois da última alteração (Vite 8.3.4). | — |
| E2E (Playwright, Edge) | **9/9 passaram** (18/10): fluxo pessoal completo, Canvas 3×3, cupons/conexões sem envio, textos longos, QA visual sem overflow em 1440/834/390 px (agora incluindo Ofertas Shopee) e o fluxo Shopee em 1440 e 390 px. | Servidor em pasta temporária; Shopee simulada que confere a assinatura. |
| Shopee real | **Não testado.** O endpoint oficial respondeu às sondagens sem credencial (formato do cabeçalho confirmado), mas nenhuma chamada com AppID real foi feita. | Nomes dos campos de `productOfferV2` só se confirmam no primeiro teste do titular. |
| Referência Promium | Documentação pública lida e duas capturas REA preservadas; screenshots abertas e conferidas. | Painel autenticado e operação real do Promium não observados. |
| Conta/envio real | **Não realizado.** Nenhuma credencial real configurada nesta execução. | Testes com mocks não comprovam compatibilidade da conta, instância ou destino do titular. |

Resultados e screenshots consolidados em [execucao/QA.md](execucao/QA.md) e [execucao/SHOPEE.md](execucao/SHOPEE.md). O aceite do envio real permanece separado, mesmo depois de os testes locais passarem.

## Matriz funcional da implementação

| Recurso | O que existe | Verificação e limite |
| --- | --- | --- |
| Catálogo | Criar, editar, excluir, preço BR, marketplace, categoria, tags, favoritos, busca e filtros. | Persistência e regras API testadas; favoritos são a tag `favorito`. |
| Importação | CSV/JSON/XLSX, UTF-8, prévia com erros/avisos, dedupe e associação de fotos pelo nome. | Testes de parser/round-trip e fluxo parcial QA; não consulta produtos por uma lista só de links. |
| Arquivos | Exportação CSV/JSON/XLSX e kit ZIP de artes/legendas/dados por produto. | Exportação API testada; confirmar kit e downloads no E2E final. |
| Estúdio | Três direções de criativo, três formatos e PNG/JPG. | Domínio valida dimensões; imagem final e interação entram no QA visual. |
| Mensagens | Modelos, variáveis de produto e legenda editável, preservando o link original. | Testes de domínio validam link e dados sem inventar cupom/desconto. |
| Cupons | Cadastro, edição, exclusão, validade, mínimo/teto, escopo e maior economia por produto. | Oito testes de regras; sem descoberta externa, composição ou verificação na loja. |
| Ofertas Shopee | Credenciais privadas, teste de conexão, busca por palavra ou link de produto, comissão/vendas/avaliação, importação com foto e link exato, conversor de link com identificador. | Mock com assinatura recalculada, testes de mutação, E2E sem rede externa. Conta real pendente. |
| Canais | Cadastro e abertura de destinos, publicação manual, seleção em campanhas. | Cadastrar URL não conecta a conta. Convites/Canais WhatsApp não viram destinos Evolution. |
| Fila em lote | Seleção, data inicial, intervalo e prévia; cria campanhas manuais. | Mantém itens já salvos se o lote interromper; conferir totais. |
| Envio avulso | Telegram Bot API e Evolution v2; foto original local ou texto, confirmação e recibo com IDs. | Testes com mocks cobrem idempotência, destino, parcial, segredo e falhas; sem envio real. |
| Fila automática | Opt-in por campanha, conexão testada, worker local, fingerprints, sem retry e recuperação de envio interrompido como desconhecido. | Cenários de mock cobrem autorização, dedupe, falha e reinício. Computador/servidor precisam ficar ligados. |
| Backup | ZIP lógico com mídia, cupons e relações; restauração aditiva/manual. | Testes de isolamento e arquivos inválidos; limite restaurável de 50 MB verificado antes da geração. |
| Credenciais | Arquivo privado com acesso restrito ou variáveis de ambiente; estado/backup sem segredo. | Testes verificam não exposição em respostas e ZIP. Configuração real continua a cargo do titular. |
| Abertura | `Abrir Vitraya.cmd` inicia/reutiliza servidor na porta padrão e abre o navegador. | Código do launcher conferido; depende de Node, dependências e build local prontos. |

## As três direções de criativo

São estilos de arte dentro deste aplicativo:

| Direção | Proposta visual | Saídas |
| --- | --- | --- |
| Boutique | Composição editorial para moda e beleza. | PNG/JPG em 1080×1080, 1080×1350 ou 1080×1920. |
| Oferta direta | Contraste forte para preço e promoção. | Os mesmos três formatos. |
| Essencial | Composição clara para casa e tecnologia. | Os mesmos três formatos. |

As artes são geradas localmente. O conector envia a imagem original associada ao produto e a legenda; a arte do Estúdio pode ser baixada para publicar manualmente.

## Limites conhecidos

- Canais WhatsApp permanecem manuais. Evolution suporta números/grupos; Telegram depende de bot autorizado no destino.
- Fora da Shopee, não há busca externa de ofertas nem geração/conversão de links. Também não há atualização de preço/estoque, descoberta automática de cupons, extensão de navegador ou monitoramento/replicação de grupos.
- Aceite do provedor não significa entrega/leitura. Em falha, parcial ou resultado desconhecido, conferir o destino antes de criar outra tentativa. O worker não repete automaticamente.
- O backup ZIP é limitado a 50 MB, 5.000 registros por lista e limites de mídia. Para catálogos maiores, exportar a tabela e guardar `media/`; para preservar a operação completa, copiar o diretório de dados com o servidor fechado.
- Sem hospedagem, domínio, login multiusuário ou disponibilidade de servidor em nuvem. O padrão Windows é `%LOCALAPPDATA%\VitrayaStudio\data`.
