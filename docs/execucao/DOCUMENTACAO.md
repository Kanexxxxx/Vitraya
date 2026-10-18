# Documentação — 17/10/2026

- Responsável: agente de pesquisa de marketplaces/documentação. Escopo exclusivo: `README.md`, `docs/USO.md`, `docs/INTEGRACOES.md`, `public/exemplos/` e este checkpoint.
- Lidos AGENTS.md, docs/CONTINUIDADE.md, CONTRATO.md e checkpoints BACKEND/COORDENACAO. Nenhum dado real importado e nenhuma conta conectada.
- Marco 1: relatório de integrações copiado de `Nexa/docs/execucao/AFILIADOS-INTEGRACOES.md` para `docs/INTEGRACOES.md`; o original foi movido para `docs/historico/` em 18/10/2026.
- Situação de validação: instalação/build/testes pertencem às outras frentes e ainda não foram conferidos por este agente. Não declarar integração de produção disponível.
- Próxima ação exata: criar guias e exemplos fictícios; conferir contrato real de importação com backend; validar exemplos por leitura e pelo parser disponível; revisar os guias após implementação.

## Marco 2 — guias e exemplos preparados

- Criados `README.md`, `docs/USO.md`, `public/exemplos/catalogo.csv` e `public/exemplos/catalogo.json`; integração documentada em `docs/INTEGRACOES.md`.
- Confirmados com backend e leitura do parser: porta 4317, `VITRAYA_DATA_DIR`, dados padrão `data/`, JSON array ou `{products}`, `price` numérico em centavos, CSV `preco` em reais, export CSV `price_cents`, backup lógico com mídia e restauração aditiva.
- Os quatro exemplos usam `example.test`, status rascunho e imagens vazias; nenhum link comercial nem arquivo real do titular foi usado.
- Verificação executada: `previewImport` real sobre CSV e JSON, com assertions de quatro linhas, zero erros/avisos, preços `[8990,12990,7450,17990]`, origem fictícia, status e igualdade de dados entre formatos. Resultado: PASS.
- Documentado: fila não envia mensagens; cópia/download/abertura do destino não significa publicação; APIs de vendedores não equivalem à API de afiliados; sincronização da pasta por OneDrive é independente do aplicativo.
- Pendência: conferir nomes finais dos controles da interface e executar QA de uso quando o app estiver disponível. Build/testes globais não executados por esta frente.
- `git diff --check` não foi aplicável: a pasta ainda não é um repositório Git. O erro de uso não representa verificação aprovada.
- Verificação alternativa de texto executada em Node: os seis arquivos desta frente não contêm espaços no fim das linhas nem marcadores de conflito. Resultado: PASS.
- Próxima ação exata: receber endereço local pronto do responsável, testar os exemplos em desktop/mobile, revisar fidelidade do guia e registrar resultados neste checkpoint.

## Marco 3 — referência Promium confirmada pelo titular

- Alvo confirmado: `https://promium.space/`. Uso pretendido do Vitraya Studio: web local pessoal, sem hospedagem ou domínio.
- Skill local `.agents/skills/reverse-engineer-anything/SKILL.md` e referências de recuperação, observação e contrato CLI lidas. Consultadas páginas públicas de produto, ajuda, login, TikTok Shop, termos e privacidade; sem login ou envio de dados.
- REA CLI 6.5.0 disponível via `npx`. Doctor retornou código 1 e `registration:codex = config_drift`; nenhuma configuração foi alterada. A CLI de captura pública funcionou independentemente do registro MCP.
- Captura pública homepage: Evidence `ev_b38e3a3c58580308c60f920f644db2e2e5ae8402488a72a4c969ab5330e0adff`, URL `https://promium.space/`, DOM/acessibilidade/screenshot/URL capturados; browser temporário encerrado pelo provedor.
- Captura pública ilustração: Evidence `ev_b71ed681b88c58ccb4275e2b45440db607b2d577d7e8cbaa0b041bced6b9c76e`, URL `https://promium.space/#ver-fluxos`, acessibilidade/screenshot/URL capturados; browser temporário encerrado. A própria página identifica o painel demonstrado como ilustrativo.
- Artefatos públicos em `referencias/promium/` (fora do Git). Nenhum cookie, storage, corpo de rede ou credencial solicitado à captura. Não houve extração ou análise do código proprietário.
- Achados: Promium declara WhatsApp por Z-API/Evolution; Mercado Livre/SHEIN usam sessão de afiliado segundo sua documentação; TikTok não tem conversão automática. A página TikTok e a ajuda de monitoramento divergem sobre TikTok no monitoramento — registrar como pendente, sem assumir suporte.
- Próxima ação exata: concluir `docs/REFERENCIA-PROMIUM.md` com fontes e tabela de funções versus código local; comunicar lacunas ao responsável. QA da interface local continua pendente nesta frente.

## Marco 4 — comparação pública documentada

- Criado `docs/REFERENCIA-PROMIUM.md`: 19 linhas de comparação funcional, fontes primárias do próprio Promium, onboarding público, diferenças de acesso, limites contratuais e evidências REA preservadas. README atualizado para o alvo agora confirmado.
- Comparação local feita por leitura de `src/main.jsx`, `src/domain.js` e contratos/arquivos backend. Não declarar QA de UI ou envio real a partir disso.
- Texto do relatório e checkpoint conferidos por script Node: sem espaços no fim das linhas nem marcadores de conflito. Resultado PASS. Capturas PNG públicas abertas e visualmente conferidas.
- Solicitação independente do backend: verificar contrato oficial Evolution API v2 em código aberto; endpoints e DTOs encontrados no repositório oficial, sem chamada autenticada nem envio. A versão do servidor que o titular usar continua sendo dependência de teste real.
- Pendência nova: backend iniciou conectores adicionais a pedido do responsável. A matriz retrata o snapshot antes dessas adições e deve ser atualizada após conferência dos contratos finais; credenciais não significam integração testada.
- Próxima ação exata: receber contrato final dos conectores, alinhar README/USO/REFERENCIA e executar QA local se solicitado. Preservar a distinção implementação/configuração/teste real.

## Marco 5 — documentação alinhada à implementação integrada

- Lidos `server/connectors.mjs`, `app.mjs`, `index.mjs`, `limits.mjs`, `store.mjs`, `src/Connectors.jsx`, `Workflow.jsx`, trechos finais de `main.jsx` e launcher. A documentação agora descreve os envios implementados e não mantém a afirmação antiga de ausência total de envio.
- Atualizados README, USO, CONTRATO, INTEGRACOES, REFERENCIA-PROMIUM e CUPONS; criado `docs/VALIDACAO.md` com matriz funcional, três direções de criativo, testes reais e limites.
- Atalho documentado: `Abrir Vitraya.cmd` chama `scripts/open.mjs`, inicia/reutiliza servidor e abre navegador na porta 4317. Uso web local pessoal; não é hospedagem nem requer domínio.
- Storage final do CLI conferido: `%LOCALAPPDATA%\VitrayaStudio\data` no Windows; override `VITRAYA_DATA_DIR`, sem migração automática. Backup lógico até 50 MB, erro prévio acima do limite, alternativa de exportar tabela/guardar mídia e cópia integral do diretório com servidor fechado.
- Telegram/Evolution documentados como implementados e testados com mocks: acesso/destino, confirmação por envio, recibo/idempotência, worker opt-in por campanha, sem retry, mudança de produto/configuração bloqueia, reinício de envio fica desconhecido. Canais WhatsApp continuam manuais. Foto enviada pelo conector é a original; Canvas é baixado separadamente.
- Cupons integrados, favoritos por tag e fila em lote manual conferidos no código. Geração/conversão de link, preços externos, descoberta de cupons e monitoramento seguem ausentes, identificados por função.
- A coordenação informou **22 testes aprovados** na rodada integrada. QA E2E final ainda pendente no checkpoint lido; documento não o apresenta como concluído. Nenhum teste com conta real ou envio real.
- Próxima ação exata: conferir textos/links e receber o resultado final do agente QA; então atualizar somente o aceite em VALIDACAO e preservar os limites de operação real.
