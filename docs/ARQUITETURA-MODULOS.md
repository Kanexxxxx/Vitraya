# Arquitetura em módulos e regras das etapas em paralelo

Criado em 18/10/2026 pelo coordenador. Leia antes de trabalhar em qualquer etapa. Junto com este documento, leia `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, `docs/CONTRATO.md` e `docs/REFERENCIA-PROMIUM-PAINEL.md`, este último com as funções a reproduzir **do nosso jeito**, sem copiar marca, textos ou layout.

## Visão geral

- **Servidor:**
  - `server/app.mjs` é o núcleo: catálogo, importação, fila, conectores Telegram/Evolution, Shopee.
  - `server/modules/<etapa>.mjs` traz um módulo por etapa, registrado em `server/modules/index.mjs`.
- **Interface:**
  - `src/main.jsx` é a casca: menu por seções, troca de telas e o contexto comum.
  - `src/views/<Tela>.jsx` traz uma tela por item de menu, com CSS próprio em `src/views/<tela>.css`.
  - `src/ui.jsx` tem os componentes comuns (`api`, `PageHeading`, `Field`, `Modal`, `Empty`, `Market`, `download`, `dateTime`, `statusLabel`).
- **Dados:**
  - SQLite em `<dataDir>/vitraya.sqlite`.
  - Cada módulo cria as **próprias tabelas** com `ctx.store.ensureTable('nome')`. O nome segue o formato `^[a-z][a-z0-9_]*$` e deve começar com o prefixo da etapa (ex.: `wa_`, `auto_`, `sec_`, `link_`).

## Contrato de um módulo do servidor

```js
export const name='whatsapp';
export function create(ctx){
  return {
    name,
    async gate({req,res,path,method,target}){return true;}, // só a segurança: roda antes de toda rota; false = já respondeu
    async handle({req,res,path,method,target}){return false;}, // true = tratou a requisição
    state(){return {};},   // fragmento público em GET /api/state → state.modules.<nome> (NUNCA segredos)
    async start(){},       // depois que o servidor escuta (reconectar sessões, ligar agendador)
    async close(){},       // ao encerrar (fechar sockets e timers, gravar o que faltar)
  };
}
```

`ctx` (o mesmo para todos):

| Campo | Para quê |
| --- | --- |
| `store` | `all/get/save/remove/transaction/activity/ensureTable` |
| `dataDir`, `mediaDir`, `privateDir` | `privateDir` = `<dataDir>/private`: segredos só aqui, com `helpers.restrictPrivate` (ACL do usuário no Windows) |
| `connectors`, `shopee`, `saveProduct` | Recursos do núcleo (Telegram/Evolution, Shopee, gravar produto com dedupe por link) |
| `helpers` | `jsonBody, multipart, send, notFound, text, url, ApiError, id, now, restrictPrivate, requestGateway, sniffImage, productFingerprint` |
| `modules` | `Map` nome → módulo, para chamar outra etapa (ex.: `ctx.modules.get('whatsapp')`) |
| `options` | `createApp({moduleOptions:{<nome>:{...}}})`: os testes usam para injetar falsos (sem rede) |

A segurança do núcleo continua valendo para todas as rotas:
- o servidor só ouve em `127.0.0.1`;
- os cabeçalhos `Host` e `Origin` são validados;
- mutações exigem o cabeçalho `X-Vitraya-Client: 1`;
- o tamanho do corpo é limitado.

## Interfaces entre etapas (não mude sem o coordenador)

**WhatsApp** (`ctx.modules.get('whatsapp')`, etapa 1). A automação, o painel e o histórico usam:
- `status()` → `{instances:[{id,name,status:'disconnected'|'connecting'|'qr'|'connected'|'logged_out',phone:'•••1234'|'',updatedAt}]}`
- `destinations({activeOnly})` → `[{id,instanceId,jid,kind:'group'|'channel'|'contact',name,active}]`
- `sendProduct({productId,destinationIds,message,idempotencyKey,confirm:true})` → `{ok,results:[{destinationId,status:'sent'|'failed'|'skipped',deliveryId,messageId?,error?}]}`
- Cada envio fica registrado na tabela **`deliveries`** com o mesmo formato dos recibos do núcleo:
  - `{id,connectorId:'whatsapp',productId,channelId:<destinationId>,createdAt,status,messageIds,error?}`
  - `status` pode ser `sending|sent|partial|unconfirmed`.
  - O envio **nunca** se repete sozinho.

**Automação** (etapa 2): `state()` → `{enabled,dailyLimit,sentToday,window:{start,end},interval:{min,max},nextRunAt,paused}`. O painel (etapa 4) lê esse estado.

**Histórico** (etapa 4) junta `deliveries`, `campaigns` e o que a automação registrar, numa tabela própria da etapa 2, com campo `deliveryId`.

## Quem cuida de quê

| Etapa | Pode criar/editar | Observação |
| --- | --- | --- |
| 1 · WhatsApp | `server/modules/whatsapp.mjs`, `server/whatsapp/**`, `src/views/WhatsApp.jsx`, `src/views/whatsapp.css`, `src/Connectors.jsx` (opção WhatsApp no envio), `test/backend.whatsapp.mjs`, `test/e2e/whatsapp.spec.js` | Usa `baileys` e `qrcode`, já instalados |
| 2 · Automação 24 h | `server/modules/automation.mjs`, `server/automation/**`, `src/views/Automacao.jsx`, `src/views/automacao.css`, `scripts/` (arquivos novos), `test/backend.automation.mjs`, `test/e2e/automacao.spec.js` | Programa contra a interface do WhatsApp; nos testes, use um WhatsApp falso |
| 3 · Segurança | `server/modules/security.mjs`, `server/security/**`, `src/views/Seguranca.jsx`, `src/views/seguranca.css`, `.githooks/` (novo), `test/backend.security.mjs`, `test/e2e/seguranca.spec.js` | Pode editar **apenas** a linha de cabeçalhos de segurança (CSP) em `server/app.mjs` |
| 4 · Painel e conta | `server/modules/dashboard.mjs`, `src/views/Inicio.jsx`, `Historico.jsx`, `Perfil.jsx` (+ `.css`), `test/backend.dashboard.mjs`, `test/e2e/painel.spec.js` | Pode trocar **apenas** a tela inicial padrão em `src/main.jsx` (`useState('catalog')`) |
| 5 · Feed e links | `server/modules/links.mjs`, `server/marketplaces/**`, `server/shopee.mjs`, `src/views/Feed.jsx`, `src/views/feed.css`, `src/Shopee.jsx`, `test/backend.links.mjs`, `test/e2e/feed.spec.js`, `test/e2e/shopee.spec.js` | Junta a Shopee no feed único: nada de seção própria por loja |

Cada etapa também escreve **seu checkpoint** em `docs/execucao/ETAPA-<n>-<NOME>.md` e salva as capturas como `docs/screenshots/etapa<n>-*.png`.

**Ninguém edita**, a não ser pela exceção da tabela acima:
- `server/app.mjs`, `server/store.mjs`, `server/validation.mjs`, `server/imports.mjs` e `server/connectors.mjs`;
- `src/main.jsx`, `src/ui.jsx` e `src/styles.css`;
- `package.json` e `package-lock.json`;
- os testes que já existem.

Se precisar de algo num desses arquivos (ou de uma dependência nova), descreva no seu checkpoint, na seção **"Pedidos ao coordenador"**, e siga com o resto.

## Regras de trabalho

1. **Onde trabalhar:**
   - Só na sua cópia isolada `C:\Users\Kanex\VitrayaEtapas\<etapa>`, no seu ramo `etapa/<n>-<nome>`.
   - Nunca na pasta principal `Desktop\VitrayaStudio`, nunca nos dados reais (`%LOCALAPPDATA%\VitrayaStudio`) e nunca no projeto Nexa.
   - O terminal volta para outra pasta a cada comando: comece **todo** comando com `cd /c/Users/Kanex/VitrayaEtapas/<etapa> && ...`.
2. **Commits:** no seu ramo, com mensagens em português. **Não faça push.** Quem junta e publica é o coordenador, depois da aprovação do supervisor.
3. **Testes (tudo verde, sem pular nada):**
   - `npm test`: todos os testes, não só os seus.
   - `npx vite build`.
   - `npx playwright test --output=test-results/<etapa>`: todos os testes, **3 execuções seguidas** sem falha.
4. **Nada real:** nenhuma mensagem real, nenhuma credencial real, nenhuma chamada a serviço externo nos testes. O WhatsApp é simulado (socket falso via `moduleOptions`) e as APIs, por servidor HTTP falso em `127.0.0.1`.
5. **Segurança é prioridade 1:**
   - Segredos (sessão do WhatsApp, chaves, cookies, senhas) só em `privateDir`, com `restrictPrivate`, e nunca em `state`, logs, atividade, backup, exportação, capturas ou Git.
   - Valide toda entrada.
   - Chamadas de rede só por `helpers.requestGateway`, que bloqueia rede privada e redirecionamento.
   - Nada de `eval`; nenhum caminho de arquivo controlado pelo usuário sem confinamento.
   - Deixe a resposta de erro sem detalhe interno.
6. **Estilo:**
   - Siga o código ao redor: o servidor usa funções compactas; a interface usa componentes de função React.
   - Textos em português do Brasil, naturais e diretos.
   - Visual coerente com `DESIGN.md` e com as telas atuais (variáveis de `:root`, `panel`, `button`, `field`, `status-pill`).
   - Sem overflow em 390, 834 e 1440 px, com nomes acessíveis e alvos de toque de pelo menos 24 px.
7. **Pronto quando:**
   - os critérios de aceite da sua etapa foram cumpridos;
   - todos os testes estão verdes;
   - há capturas em 1440 e 390 px conferidas por você (abra as imagens);
   - o checkpoint está atualizado;
   - o commit está no seu ramo.
   - Então responda com: resumo, arquivos, resultados dos testes, capturas e lacunas.
8. **Supervisão:** o agente supervisor revisa o seu ramo e responde **APROVADO** ou **REPROVADO** com a lista de defeitos. Corrija tudo o que ele apontar.
