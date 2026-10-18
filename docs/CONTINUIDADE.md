# Continuidade — Vitraya Studio

## 17/10/2026 — execução inicial

- Pedido: aplicativo de afiliados inspirado nos fluxos do app referido como “Pro Mil”, com catálogo de SHEIN, Shopee, Mercado Livre e TikTok Shop, importação/exportação, imagens, mensagens e campanhas.
- Referência confirmada pelo titular: https://promium.space . O pedido atual é aplicativo web pessoal local, sem domínio ou hospedagem. Análise pública REA e comparação em REFERENCIA-PROMIUM.md; painel autenticado e paridade total não comprovados.
- Projeto isolado em `C:\Users\Kanex\OneDrive\Desktop\VitrayaStudio`; arquivos existentes da Nexakeep preservados.
- REA clonado em `referencias/rea` para inspeção. Nenhuma instalação global executada.
- Arquitetura: React + Vite, servidor HTTP Node 24, SQLite nativo, arquivos locais. Operação local sem dependência de nuvem.
- Catálogo, CRUD, importação CSV/JSON/XLSX com fotos por nome, exportação e kit ZIP, Estúdio Canvas (3 estilos/3 formatos), mensagens, canais, favoritos, fila em lote e preferências implementados.
- Cupons locais: regras de validade, mínimo, teto e escopo + simulador. Conectores Telegram/Evolution e fila automática opt-in em integração; credenciais sempre fora de estado público/backup.
- Primeiros testes API/domínio: 8/8; cupons isolados: 8/8. Build passou, audit produção zero após override UUID. QA de navegador desktop/tablet/mobile em andamento; não considerar testes novos concluídos sem checkpoint QA/BACKEND.
- Ambiente de agentes LOCAL: ECC 2.2.3 selecionado, REA, Taste v2 e image-to-code; fontes/licenças em TERCEIROS.md. Não houve instalação/alteração global.
- Limites: sem conexão de conta real, sem envio real. Catálogo aceita links fornecidos; geração/conversão automática e descoberta de preços das lojas dependem de acesso e implementação específicos. Canais WhatsApp por publicação manual; gateway implementa grupos/números.
- Próxima ação: concluir integração de conectores/fila/cupons, executar `npm run check`, `npm run test:e2e`, revisar screenshots limpos e atualizar os resultados finais aqui.

## 17/10/2026 — transferência para outro chat

- O titular pediu um pacote autocontido para reiniciar o trabalho em outra conversa. O escopo desta retomada é exclusivamente o Vitraya Studio.
- Prompt completo: [retomada/PROMPT-RETOMADA.md](retomada/PROMPT-RETOMADA.md). Instruções do arquivo ZIP: [retomada/LEIA-ME.md](retomada/LEIA-ME.md).
- A pasta atual permanece em `C:\Users\Kanex\OneDrive\Desktop\VitrayaStudio`. O ZIP de fonte não inclui dados locais, credenciais, dependências instaladas ou clones inteiros de terceiros.
- Ponto técnico prioritário registrado para o novo chat: pesquisar e implementar a API oficial Shopee Affiliate Brasil com credenciais privadas locais; a conta está aprovada pelo titular, mas não foi conectada nem testada.
- Evidência disponível: backend 13/13 em testes simulados; suite completa 22/22 anterior aos dois testes backend mais recentes; build posterior ao último ajuste do Estúdio passou; E2E precisa de nova execução pois os checkpoints atuais não registram resultado consolidado após a última mudança visual.
- Próxima ação exata: no novo chat, ler o prompt acima e os documentos citados; conferir o Git e os dados locais sem modificá-los; executar `npm test`, `npm run build` e `npm run test:e2e`; corrigir os checkpoints com resultados reais antes de avançar para Shopee.

## 18/10/2026 — retomada pelo Claude Code

- Lidos o prompt de retomada, contrato, validação e checkpoints. Git segue em `master` sem commits; nada foi commitado.
- `npm test` inicialmente **falhou 6/24** (todos os testes de conectores): no Git Bash o PATH resolve `whoami.exe` para o coreutils do Git, que não aceita `/user`, e a gravação de credenciais retornava 500. Corrigido em `server/connectors.mjs` usando `%SystemRoot%\System32\whoami.exe`/`icacls.exe` (SID em cache; `restrictPrivate` agora exportada para reuso).
- Depois disso, falha intermitente no upload acima de 10 MB: sair do `for await` destruía o socket e o 413 não chegava ao cliente (no navegador viraria erro de rede). Corrigido em `server/app.mjs` (`readBody` descarta o excedente até 64 MB e só então responde 413).
- Limpeza das pastas temporárias dos testes no Windows dava `ENOTEMPTY` ocasional (arquivo ainda aberto por antivírus/SQLite); `fs.rm` dos testes agora usa `maxRetries`.
- Resultado atual: `npm test` **24/24 em 12 execuções seguidas**; `npm run build` passou; `npm run test:e2e` **7/7**.
- Próxima ação: pesquisar a documentação oficial da Shopee Affiliate Open API (Brasil) e implementar o conector com segredo local privado e testes com transporte simulado. Checkpoint próprio: `docs/execucao/SHOPEE.md`.
- **Shopee Affiliate Open API implementada** (18/10): back-end `server/shopee.mjs`, rotas `/api/shopee*`, tela Ofertas Shopee, 6 testes de API com mock que recalcula a assinatura, 2 E2E. Contrato conferido contra o endpoint real sem credencial; nenhuma chamada com AppID real. Checkpoint: `docs/execucao/SHOPEE.md`.
- Estado ao fim desta etapa: `npm test` 30/30, build ok, `npm run test:e2e` 9/9. Git continua sem commits (nada commitado).
- **Próxima ação exata:** o titular roda `npm run build` e `npm start` (ou `Abrir Vitraya.cmd`), configura AppID/chave em Ofertas Shopee, clica em Testar conexão e faz uma busca; o resultado (ou a mensagem de erro) decide se `FIELDS` precisa de ajuste. Depois: Mercado Livre, SHEIN e TikTok Shop, cada um pela documentação oficial própria.

## 18/10/2026 — repositório e separação do Nexa

- Publicado em https://github.com/Kanexxxxx/Vitraya (público), ramo `main`. O primeiro commit é `43ef6ff`; os ZIPs de retomada, `data/`, `referencias/`, `node_modules/` e `dist/` ficam fora.
- O histórico de afiliados que estava na pasta Nexa veio para `docs/historico/`. Agora o Nexa só tem a Nexakeep.
- Para trabalhar no Vitraya, abra o VS Code **nesta pasta** (`Desktop\VitrayaStudio`), não na pasta Nexa.
- A automação PAD (`Desktop\VITRAYA`) ainda não tem Git: outro chat estava mexendo no Linktree. Ela tem dados reais em `saida/`, que não podem ir para um repositório público.
- Em andamento: conversão por cookie e por tag (Mercado Livre, SHEIN, Amazon etc.). Checkpoint em `docs/execucao/COOKIES-TAGS.md`.

## 18/10/2026 — T1, parte 1: importação com fotos

- O titular importou 326 produtos e eles entraram **sem foto, com preço R$ 0 e como "outro"**. O leitor recusava os arquivos reais da VITRAYA: `Situacao` (CONCLUIDO) era lida como status inválido, e `PrecoBRL`, `PrecoOriginalBRL` e `Nome do produto` não eram reconhecidas.
- Corrigido em `server/imports.mjs`:
  - novos nomes de coluna; situações de automação mapeadas (o que for desconhecido vira rascunho, não erro);
  - loja fora da lista vira "outro" e o nome dela vira etiqueta; gênero vira etiqueta;
  - títulos acima de 300 caracteres são encurtados na última palavra inteira;
  - um aviso-resumo por assunto, em vez de um aviso por linha.
- Na importação, dá para escolher **a pasta de fotos inteira** (`webkitdirectory`). As fotos são casadas pelo nome do arquivo e **reduzidas no navegador** (`shrinkImage`: lado maior até 1.080 px, JPEG 0,82), sem dependência nova e sem nada sair do computador. Reimportar a mesma planilha preenche a foto de produto existente que não tinha nenhuma.
- Catálogo: filtro **Sem foto** e **Excluir selecionados** (`POST /api/products/delete`, uma transação, remove também as campanhas).
- Testes: `npm test` **33/33**; `npm run test:e2e` **9/9 em 3 execuções**. O E2E prova a redução: 1600×1200 vira JPEG de 1080×810. Corrigida uma corrida nos testes: `nav()` decidia abrir o menu do celular antes de o app carregar.
- **Dados reais (pedido do titular):**
  1. backup em `%LOCALAPPDATA%\VitrayaStudio\backups\antes-de-limpar-sem-foto-2026-10-18.zip` (326 produtos);
  2. os 326 sem foto foram removidos;
  3. reimportação pela própria tela do app, com `Documentos\VITRAYA\Catalogo\produtos.csv` e a pasta `Fotos`.
  - Resultado: **326 produtos, 325 com foto, todos SHEIN, preços certos**; fotos com média de 116 KB e máximo de 255 KB.
  - O único sem foto já vinha marcado `PENDENTE_FOTO` e ficou como rascunho.
- Mapa de funções do painel de referência, feito a partir dos prints do titular: [REFERENCIA-PROMIUM-PAINEL.md](REFERENCIA-PROMIUM-PAINEL.md).
- Segurança: um print expôs a Secret Key da Shopee; o titular confirmou que **revogou e trocou** a chave. Nenhum valor foi gravado.
- **Próxima ação (T1, parte 2): WhatsApp.**
  1. Conectar por **QR Code** na própria tela, como no painel de referência.
  2. Listar grupos e canais da instância.
  3. Envio em massa com limite diário (6 a 10) e **intervalo aleatório de 2 a 5 min**, no número de teste.
