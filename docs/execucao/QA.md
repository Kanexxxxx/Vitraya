# QA independente — 17/10/2026

- Responsável: agente `skills_audit`.
- Escopo: testes Playwright Edge em servidor próprio criado por `createApp`, com SQLite e mídia em pasta temporária. Nenhum acesso ao diretório real `data/`.
- Criados `playwright.config.js`, `scripts/e2e-server.mjs` e `test/e2e/studio.spec.js`.
- Testes planejados: CRUD e preço brasileiro; importação CSV com foto e erro por linha; canais, mensagens e fila com duplo clique; persistência após reinício; CSV/JSON/XLSX/backup ZIP/kit; três direções e formatos Canvas; desktop 1440, tablet 834 e celular 390; capturas e diagnóstico de overflow/console/acessibilidade.
- Primeira execução: localizadores exatos dos testes não consideravam texto das opções de select/textarea, badge numérico da navegação e prefixo visual `Aa` das direções. Corrigidos nos testes; não foram classificados como falhas do produto.
- Rodada parcial seguinte: **3/3 testes visuais passaram** em 1440, 834 e 390 px, sem overflow horizontal, erros de página/console ou respostas 4xx/5xx nos fluxos existentes. Os dois testes funcionais ficaram incompletos por localizadores, já ajustados; nenhum resultado parcial foi apresentado como aprovação completa.
- Fluxo funcional alcançado antes do localizador: criar/editar produto com `1.234` → 123400 centavos e `1.299,90` → 129990, preservar link, importar CSV com erro por linha e associar foto, criar canal/modelo, adicionar à fila com duplo clique → uma campanha.
- Capturas corrigidas para `scrollTo(0,0)`, blur, fechamento do aviso transitório e espera de decode das imagens. Evidências em `docs/screenshots/`; imagens são exemplos fictícios.
- CSS e novas views estão sendo concluídos pelo coordenador. Próxima ação: aguardar build atualizado e executar `npm run test:e2e`; depois ampliar QA para conexões/cupons sem envio real quando backend estiver pronto.

## Reexecução consolidada — 18/10/2026 (Claude Code, retomada)

- `npm run test:e2e` (Playwright 1.64.1, Edge headless, servidor próprio em pasta temporária): **7/7 passaram** em 29,5 s — fluxo pessoal completo (CRUD, importação com foto, mensagens, fila sem duplicar, persistência, exportações), Canvas 3 direções × 3 formatos PNG/JPG, cupons/favoritos/conexões não configuradas sem envio, textos longos nos nove formatos, QA visual sem overflow em 1440/834/390 px.
- Esta execução é posterior a todas as alterações visuais registradas até 17/10. Substitui o "E2E final pendente" acima.
- Nenhum envio real, nenhuma credencial real, nenhum acesso a `%LOCALAPPDATA%\VitrayaStudio\data`.
- 18/10, depois do conector Shopee: `npm run test:e2e` **9/9** (os 7 acima, agora com Ofertas Shopee no QA visual, mais `shopee.spec.js` em 1440 e 390 px). Detalhes em `SHOPEE.md`.
