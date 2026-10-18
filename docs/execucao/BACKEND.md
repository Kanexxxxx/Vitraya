# Backend — 17/10/2026

- Responsável: agente backend; escopo `server/**` e `test/backend*.mjs`.
- Contrato lido; implementação iniciada em Node 24 + SQLite local.
- Marco 1: implementados SQLite, CRUD catálogo/canais/modelos/campanhas/configuração, fila manual, importação CSV/JSON/XLSX e confirmação revalidada, upload local, exportação e backup/restauração aditiva.
- Segurança implementada: loopback, Host/Origin, cabeçalho obrigatório nas mutações, limites, imagens verificadas por assinatura, validação de caminhos ZIP antes de descompressão. Ainda exige testes.
- Verificação executada: `node --check server/app.mjs` e `node --check server/imports.mjs` passaram.
- Nenhum dado real lido/importado; exemplos apenas por `POST /api/demo` em catálogo vazio.
- Marco 2 / testes reais: `node --test test/backend*.mjs` passou 5/5, zero falhas. Bases isoladas em diretórios temporários, removidas ao término. Cobertura de persistência após reinício; CRUD e relações; CSV brasileiro e erros por linha; JSON/CSV/XLSX round-trip; dedupe; upload e limite de 10 MB; backup com mídia e vínculos; restauração repetida sem duplicação; ZIP slip/bomb; Host/Origin/cabeçalho e demo opt-in.
- Revisão adicional: limpeza de imagens não utilizadas após restauração é tolerante a falhas, evitando desfazer mídia já referenciada depois de COMMIT.
- Contrato exportado: `createApp({dataDir,staticDir,allowedOrigins})` retorna `{server,store,start(port),close}`; `start(0)` fornece `{port,url}`; `startServer({port,...})` agrega o endereço. CLI padrão porta 4317 e `./data`, opção `VITRAYA_DATA_DIR`.
- Marco 3 / revisão concluída: origem de desenvolvimento alinhada a `http://127.0.0.1:4318` e localhost:4318; confirmação de importação usa Set de links; campos explícitos *_cents exigem inteiros; restauração preserva IDs para não duplicar rascunhos sem URL.
- Verificação após alterações: `node --test test/backend*.mjs` novamente passou 5/5, incluindo regressões de origem dev e restauração repetida de rascunhos. Resultado final sem falhas/skips.
- Entrega: backend pronto para integração e revisão do responsável. Nenhuma API remota ou envio real foi implementado/simulado.
- Próxima ação exata: responsável executar `npm run check` e E2E da interface; comunicar qualquer divergência do contrato ao agente backend.

## Expansão solicitada pelo responsável

- Corrigido backup: limites compartilhados em `server/limits.mjs`, preflight antes de montar ZIP, armazenamento STORE que não viola razão de expansão do restaurador, teto de 50 MB com erro explícito e nenhuma alteração de dados. Acrescentados validação estrutural/dimensões JPEG, PNG e WebP.
- Telegram Bot API e Evolution API v2 implementados em `server/connectors.mjs` com transporte HTTP real, sem chamadas externas nos testes. APIs consultadas na documentação oficial Telegram; formas v2 Evolution confirmadas pelo agente de pesquisa na fonte oficial. Fontes e limites em `docs/CONECTORES.md`.
- Credenciais isoladas em `private/connectors.json` com ACL atual usuário no Windows e modo 0600/0700 Unix; configuração por env tem precedência e é bloqueada para edição pela UI. Credenciais não entram em state/backup/atividade. Configuração mostrada como conectada só após teste verificado e vinculada a fingerprint das credenciais.
- Gateways: HTTPS público ou loopback; DNS validado e fixado na conexão; bloqueio de redes privadas remotas/metadados/redirect. Não há fetch remoto de imagem. Destinos selecionados inválidos são rejeitados sem fallback ao padrão. Canais WhatsApp não implementados.
- Envios exigem `confirm: true`; `idempotencyKey` persistente evita repetição de tentativa. Foto + texto longo Telegram preservam o texto/link; parcial/ambíguo não é repetido automaticamente. Aceite do provedor não equivale a entrega.
- Fila automática opt-in: `deliveryMode: manual|telegram|evolution` e `confirmAutomatic: true`. Exige teste do conector/destino; worker marca sending antes da rede, done com receipt de aceite, failed sem retry; reinício sending vira unknown. Campanhas restauradas ficam manuais. Dedup de campanha considera conteúdo/canal/produto/horário/modelo/modo.
- Cupons integrados: tabela, GET/POST/PUT/DELETE e state; validação pura do módulo do agente de pesquisa. Incluídos em backup/restauração aditiva, com remapeamento seguro de IDs de produto.
- Testes após expansão: `node --test test/backend*.mjs` passou **11/11**, zero falhas/skips. Inclui servidores HTTP mock loopback, ACL/reinício, multipart/base64, long caption parcial, idempotência, destinos inválidos, bloqueios de rede, fila opt-in/falha sem retry/restart e limites de backup/dimensão. Nenhuma mensagem real nem credencial real usada.
- Fingerprint dos dados do produto bloqueia campanha auto se preço/foto/link/título/cupom mudarem após autorização; CLI agora usa `%LOCALAPPDATA%\VitrayaStudio\data` fora OneDrive (pasta antiga preservada), com override `VITRAYA_DATA_DIR`.
- Revisão concorrência: havia janela antes de ler mídia em que duas tentativas com a mesma chave podiam passar. Corrigido com segunda checagem local e claim SQLite em `BEGIN IMMEDIATE` com fresh read + reserva após qualquer await de preparação. Worker também faz claim transacional fresh antes da rede. PID do processo evita classificar envio de uma segunda instância viva como reinício interrompido.
- Verificação final desta expansão: `node --test test/backend*.mjs` passou **13/13**, zero falhas/skips. Acrescentadas regressões de mudança do produto antes do envio, CRUD/persistência/backup de cupons e duas instâncias no mesmo SQLite com uma chamada por tentativa/campanha. Testes somente contra mocks HTTP loopback e bases temporárias.
- Próxima ação exata: responsável executar `npm test`, build e E2E completos após integrar a interface; frontend deve tratar status502/result.ok false como parcial/ambíguo e mostrar aceite como aceite, sem afirmar entrega/leitura.
