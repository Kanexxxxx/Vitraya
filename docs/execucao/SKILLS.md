# Skills locais — 17/10/2026

- Responsável: agente `skills_audit`.
- Escopo: instruções locais de desenvolvimento; sem instalação global, alteração de `package.json` ou código de produto.
- Lidos: `AGENTS.md`, `docs/CONTINUIDADE.md`, `docs/execucao/COORDENACAO.md`, `docs/execucao/BACKEND.md` e skill REA do clone local.
- ECC 2.2.3 conferido no cache npm já existente. Copiados os quatro agentes `architect`, `code-reviewer`, `security-reviewer`, `e2e-runner` e as duas skills `frontend-design-direction`, `loop-design-check` para `.claude/` local. Sem hooks, MCP, setup ou runtime ECC.
- README oficial Taste conferido em 17/10/2026: nomes `design-taste-frontend` e `image-to-code`; diretórios `skills/taste-skill` e `skills/image-to-code-skill`. A Taste padrão é destinada a páginas públicas; não forçar seu fluxo de landing page no painel de operação.
- Taste oficial clonado em `referencias/taste-skill`, commit `f624f37a8c650b9cc550253104925efe4c8de246`. Instruções Taste, README e referências copiadas para `.claude/skills/design-taste-frontend`; image-to-code copiada para `.claude/skills/image-to-code`. Nenhum script foi copiado para a árvore ativa nem executado; nota local explica que os comandos upstream resolvem `<skill>` para o clone oficial.
- REA local copiado integralmente com suas seis referências para `.agents/skills/reverse-engineer-anything`; commit do clone `f5fcf5216ffb3a266b8c00f6d9a0943051084ab5`, pacote 6.5.0/skill metadata 42. Isso não registra MCP nem prova inspeção do aplicativo alvo.
- Criados `CLAUDE.md`, `docs/TERCEIROS.md`, três licenças MIT integrais em `docs/licencas/`. Relatório anterior `AFILIADOS-SKILLS.md` copiado para este projeto; a cópia idêntica que restava na pasta Nexa foi para a Lixeira em 18/10/2026.
- ECC reviewer aplicado à revisão independente de `src/main.jsx`, `src/domain.js` e integração com o backend: linhas e falhas concretas, chamadores/validações conferidos, somente achados de alta confiança. Vercel Web Interface Guidelines atuais buscadas em 17/10/2026 e aplicadas.
- Resultado em `docs/execucao/REVISAO.md`: dois P1 e quatro P2, com provas focalizadas em Node/Edge/API temporária. Nenhuma edição de código de produto nesta frente. Próxima ação: coordenador corrigir os achados e solicitar revalidação das correções.

## Verificação local

- SHA-256: 14 arquivos copiados conferidos contra ECC, REA e image-to-code upstream; todos idênticos. Taste inclui somente a nota de resolução local documentada.
- Árvores ativas `.claude/` e `.agents/`: zero arquivos executáveis.
- Links Markdown relativos nessas árvores: zero destinos ausentes.
- Licenças MIT integrais preservadas para ECC, REA e Taste.
- `src/` estava vazio na verificação inicial das cópias. Na etapa seguinte o código foi disponibilizado, e a revisão independente foi executada e registrada em `REVISAO.md`.
