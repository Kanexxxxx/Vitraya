# Usar o Vitraya Studio

## Abrir

Na primeira instalação execute `npm ci --ignore-scripts` e `npm run build`. Depois, `npm start` abre o servidor local em [http://127.0.0.1:4317](http://127.0.0.1:4317). Os comandos rodam na pasta do projeto e requerem Node.js 24.15 ou superior. Internet é necessária para instalar pacotes; o catálogo local não depende de login em marketplace.

Para abrir no dia a dia, dê dois cliques em [Abrir Vitraya.cmd](<../Abrir Vitraya.cmd>). O atalho inicia o servidor e abre o navegador na porta 4317, ou reutiliza a instância já aberta. Mantenha a janela do servidor aberta enquanto usa o aplicativo ou seus agendamentos. `Ctrl+C` encerra o servidor e a fila automática.

## Catálogo e imagens

Cadastre título, marketplace, preço, preço anterior opcional, cupom, categoria e link afiliado. O link é preservado como fornecido, incluindo os parâmetros; não substitua por um link comum esperando atribuição de comissão. Produtos prontos precisam de preço positivo e link. Confira os dados da oferta antes de publicar, pois preços e disponibilidade não são atualizados automaticamente.

Faça upload de PNG, JPEG ou WebP de até 10 MB. O aplicativo não busca imagens de URLs externas. Use os arquivos que você tem autorização para divulgar. Na importação, `imagem` pode conter o nome do arquivo, como `bolsa.jpg`: selecione as fotos em **Adicionar as fotos da planilha** e o aplicativo associa os nomes. Caminhos `/media/...` já existentes também podem ser usados. Deixe vazio se for enviar a foto depois.

O botão de favorito marca o produto; o filtro **Favoritos** mostra essa seleção. A marca é preservada nas exportações por meio da tag `favorito`.

## Importar arquivos

Use CSV, JSON ou XLSX de até 10 MB e 5.000 produtos por importação. Salve CSV em UTF-8. A prévia mostra as linhas normalizadas e as falhas antes da confirmação; corrija os erros indicados. A confirmação informa quantos produtos foram importados, duplicados ignorados e erros; confira esses totais para distinguir uma importação parcial de uma completa. Links exatamente iguais são usados para identificar duplicatas. A importação não move nem apaga os arquivos originais.

Você pode testar com [catalogo.csv](../public/exemplos/catalogo.csv) ou [catalogo.json](../public/exemplos/catalogo.json). Todos os exemplos são fictícios, usam `example.test` e entram como rascunho; esses endereços não são ofertas para divulgação.

### CSV ou planilha

Os exemplos usam `;` como separador e preços em reais com vírgula decimal. Cabeçalhos aceitos incluem:

| Cabeçalho | Conteúdo |
| --- | --- |
| `titulo` | Nome do produto |
| `marketplace` | `shein`, `shopee`, `mercadolivre`, `tiktok`, `amazon` ou `outro` |
| `preco` | Valor em reais, como `129,90` |
| `preco_original` | Valor anterior em reais, como `159,90`; opcional |
| `cupom` | Código e condições do cupom; opcional |
| `link_afiliado` | Link completo, preservado literalmente |
| `imagem` | Nome da foto selecionada, como `bolsa.jpg`, ou caminho `/media/...png`; opcional |
| `categoria` | Categoria de organização; opcional |

### JSON e valores monetários

O JSON aceita um array de produtos ou um objeto com a propriedade `products`. No formato canônico, `price` e `originalPrice` são **inteiros em centavos**: `12990` significa R$ 129,90. Não escreva `129.90` nesse campo. Os aliases `preco` e `preco_original` do CSV representam valores em reais.

```json
[
  {
    "title": "Exemplo fictício — fone sem fio",
    "marketplace": "shopee",
    "price": 12990,
    "originalPrice": 15990,
    "coupon": "EXEMPLO10",
    "affiliateUrl": "https://example.test/ofertas/fone?ref=demo",
    "image": "",
    "category": "Eletrônicos",
    "status": "draft"
  }
]
```

## Preparar e publicar ofertas

Escolha os produtos, revise os dados e prepare a legenda e o criativo no Estúdio. As direções **Boutique**, **Oferta direta** e **Essencial** exportam PNG/JPG em 1080×1080, 1080×1350 ou 1080×1920. Em seleção múltipla, **Baixar kit de ofertas** cria uma pasta por produto com arte, legenda e JSON.

Na publicação manual, copie a legenda e baixe a arte, publique no destino e use **Confirmar publicação**. Copiar, baixar ou abrir o destino não registra envio. Canais WhatsApp usam este fluxo manual.

### Conexões e envio avulso

Em **Integrações → Conectar publicação**, configure somente um provedor que você controla. As credenciais são guardadas no servidor local, fora do estado público e do backup do catálogo.

| Conector | O que configurar | Destinos suportados |
| --- | --- | --- |
| Telegram Bot API | Token do bot e destino padrão; bot com permissão de mensagens | ID de chat ou `@nome` no padrão; canal cadastrado com link público `t.me/nome`. Canal Telegram exige bot administrador com permissão de publicar. |
| Evolution API v2 | Endereço do seu gateway, instância, chave e destino padrão | Número internacional sem `+` ou JID de grupo terminado em `@g.us`. Um canal cadastrado pode apontar para `wa.me/numero`. Canais WhatsApp e links de convite não são destinos automáticos. |

Use **Testar conexão**: Telegram confere identidade e permissões no destino escolhido; Evolution verifica se a instância está aberta e se o destino tem formato suportado. Esse teste não manda mensagens e não comprova entrega. O gateway Evolution deve existir previamente; o aplicativo não instala nem hospeda esse serviço.

No Estúdio, escolha o envio pelo conector, confira destino/legenda e marque a autorização. O envio usa **a foto original do produto**, quando houver, e a legenda. A arte personalizada do Canvas é baixada separadamente. Imagens fictícias SVG da demonstração não podem ser enviadas. No Telegram, legendas com mais de 1.024 caracteres seguem como texto separado da foto; confira as duas mensagens.

Um recibo aceito pelo provedor registra os IDs retornados. Isso não comprova leitura ou entrega a cada participante. Resultado parcial, timeout ou erro deve ser conferido no destino antes de uma nova tentativa; a mesma tentativa identificada não é enviada novamente automaticamente.

### Fila e agendamento

**Organizar fila**, na seleção de produtos, distribui a sequência da prévia por data inicial e intervalo de 1 a 1.440 minutos. Essa fila em lote é **manual**. Itens já salvos permanecem se ocorrer erro no restante; confira o total antes de repetir.

Para um agendamento automático, abra o produto no Estúdio, use **Adicionar à fila**, escolha Telegram ou Evolution em **Forma de publicação** e autorize explicitamente. É necessário testar a conexão e, no Telegram, as permissões do destino da campanha. Mantenha computador e servidor local ligados. A janela do navegador pode ser fechada enquanto o processo do servidor continuar aberto.

Se preço, link, foto, cupom, credencial ou destino mudar depois da autorização, a campanha falha para você revisar e criar outra. Falhas não são repetidas automaticamente. Se o aplicativo for interrompido durante o envio, a campanha reaparece como resultado desconhecido; confira o destino antes de agendar outra. Restaurar um backup coloca as campanhas em modo manual.

Cada marketplace tem regras próprias para os locais de divulgação e atribuição de comissão. O Mercado Livre restringe grupos privados; a Shopee restringe extração automatizada de seus materiais. Consulte [INTEGRACOES.md](INTEGRACOES.md) para as fontes, dependências de acesso e pendências reais.

## Ofertas Shopee (Open API oficial de afiliados)

1. No portal de afiliados da Shopee, abra **Open API** e copie o **AppID** e a **chave secreta**. A conta precisa ter o acesso à Open API liberado pela Shopee.
2. No app, abra **Ofertas Shopee**, cole os dois valores e clique em **Salvar credenciais**. Depois clique em **Testar conexão**. O selo só vira "Conexão testada" quando a própria Shopee aceita a chamada.
3. Busque por palavras ou cole o link de um produto da Shopee. Cada oferta mostra o preço, a comissão, as vendas e a avaliação que a Shopee informa. Nada entra no catálogo até você selecionar e clicar em **Trazer para o catálogo**.
4. A importação baixa a foto dos servidores de imagem da Shopee e cria o produto com o link de afiliado exatamente como a Shopee devolveu. O preço original fica vazio: o app não estima "de/por".
5. **Converter link da Shopee** gera o link curto com a sua comissão para qualquer produto, loja ou página. O identificador opcional (por exemplo `whatsapp`) ajuda a separar os relatórios da Shopee por canal.

As credenciais ficam em `private/shopee.json` dentro da pasta de dados, com acesso restrito ao seu usuário do Windows. Elas não aparecem na tela, no backup, nas exportações nem nos registros. Para usar variáveis de ambiente, defina `VITRAYA_SHOPEE_APP_ID` e `VITRAYA_SHOPEE_SECRET` antes de iniciar o servidor.

Mensagens comuns: "não tem acesso à Open API" (a Shopee ainda não liberou a conta), "recusou a autenticação" (AppID ou chave errados), "recusou o horário" (relógio do Windows fora de sincronia) e "limite de consultas" (aguarde alguns minutos). O app faz uma consulta por vez e nunca repete sozinho.

## Cupons cadastrados por você

O recurso de cupons permite informar códigos reais, marketplace, percentual ou valor fixo, compra mínima, teto, validade e escopo por produto ou categoria. O simulador mostra a maior economia elegível e o preço final sem alterar o catálogo. Não há descoberta externa nem validação na loja. Confira [as regras de cupons](CUPONS.md), inclusive condições de conta/pagamento que dependem da sua conferência.

## Exportar, backup e restauração

Exporte o catálogo em CSV, JSON ou XLSX para trabalhar com outros programas. A exportação CSV usa `price_cents` para evitar ambiguidade na reimportação: esse campo representa centavos, diferente do alias `preco` em reais.

Use o backup ZIP para levar os dados junto com as imagens. Ele contém o manifesto lógico e os arquivos de mídia. Guarde o arquivo fora do repositório. A restauração é aditiva e valida o conteúdo antes da inclusão; não substitui registros já existentes nem funciona como desfazer alterações.

O ZIP tem limite de **50 MB**. O gerador recusa previamente um catálogo acima do limite restaurável e preserva seus dados; não será oferecido um ZIP grande que o restaurador não aceita. Cada lista tem limite de 5.000 registros no backup; as mídias seguem o limite de 10 MB por arquivo. Para catálogos maiores, exporte CSV/JSON/XLSX e guarde a pasta `media/` separadamente. Para preservar toda a operação, incluindo banco e histórico, feche o servidor e copie a pasta de dados inteira.

O backup lógico inclui produtos, imagens, canais, modelos, cupons e campanhas. Credenciais e recibos de envio não entram nele; a restauração preserva preferências atuais e deixa campanhas restauradas em modo manual. Reconfigure e teste os conectores no computador de destino. A cópia integral da pasta de dados contém informações privadas e deve ser guardada em local restrito.

No Windows, o diretório padrão é `%LOCALAPPDATA%\VitrayaStudio\data`. O caminho efetivo aparece no terminal. `VITRAYA_DATA_DIR` pode selecionar outra base antes de iniciar; não migra os arquivos de uma base anterior. Se você escolher uma pasta sincronizada, o OneDrive pode enviar os dados para a conta configurada no Windows.

## Escopo da versão local

O servidor atende somente `127.0.0.1`; valida origem e acesso às alterações. Não há login de múltiplos usuários nem publicação do aplicativo na internet. Telegram/Evolution fazem requisições externas somente nas ações configuradas; catálogo e criação funcionam localmente. Marketplaces continuam com importação/preservação de links, sem descoberta de preços ou conversão automática. Os testes de conectores desta entrega usaram provedores simulados, sem conta ou mensagem real. Consulte [VALIDACAO.md](VALIDACAO.md) para o aceite atual.
