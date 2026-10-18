# Checkpoint — auditoria de skills para o app de afiliados

- Responsável: subagente Codex `skills_audit`.
- Data: 17/10/2026.
- Escopo: leitura do ambiente Claude Code/Codex; nenhuma instalação ou configuração global alterada.
- Continuidade lida: `docs/CONTINUIDADE.md`, `docs/execucao/SITES-DESIGN.md` e `docs/execucao/INTEGRACAO.md`.

## Resultado verificado

- Não foi encontrada skill com nome `Globalize` ou `globalizer` nos nomes de arquivo ou nos frontmatters de `C:\Users\Kanex\.claude\skills`, `C:\Users\Kanex\.agents\skills` e `C:\Users\Kanex\Claude-Hub`.
- Existe `C:\Users\Kanex\.claude\GLOBAL\SKILLS_INDEX.md`: documentação da central global, sem efeito de runtime. O índice registra uma auditoria antiga de 21/08/2026; suas contagens não substituem o inventário atual.
- `frontend-design` e `web-design-guidelines` estão presentes nas árvores `.claude/skills` e `.agents/skills`. Arquivos lidos; `web-design-guidelines` informa versão 1.0.0 e exige buscar a regra atual no upstream a cada revisão.
- Taste Skill e `image-to-code` não apareceram nas buscas de arquivos das três árvores. O checkpoint anterior `SITES-DESIGN.md` relata leitura de Taste na fonte, sem instalação.
- O `settings.json` atual do Claude não tem `enabledPlugins` nem `extraKnownMarketplaces`; nenhum segredo foi impresso. A presença de cópia `settings.json.antes-ecc-2026-10-17` não comprova instalação.
- `SITES-DESIGN.md` registra ECC 2.2.3 conferido e setup em dry-run, deixando instalação real pendente. A presença local do pacote foi confirmada em `C:\Users\Kanex\AppData\Local\npm-cache\_npx\75937596e609f96e\node_modules\ecc-universal` (`package.json` e `.claude-plugin/plugin.json`: versão 2.2.3, repositório `affaan-m/ECC`, licença MIT).
- O pacote em cache disponibiliza os agentes `architect`, `planner`, `code-reviewer`, `security-reviewer`, `e2e-runner`, `gan-planner`, `gan-generator` e `gan-evaluator`, além das skills `frontend-design-direction`, `loop-design-check`, `gan-style-harness` e `taste-application`. Cache npm não equivale a plugin habilitado.
- Foram lidas as instruções ECC de `frontend-design-direction`, `loop-design-check` e `gan-evaluator`. Regras úteis: interface de operação densa e escaneável, primeira tela com o fluxo real, revisão independente e teste da aplicação interativa; degradar explicitamente para screenshot/código se navegador não estiver disponível. `loop-design-check` não recomenda criar loop para tarefa única.
- A skill ECC `taste-application` é distinta da Taste Skill de `Leonxlnx/taste-skill` citada no anexo.
- Também existe `skills/taste/SKILL.md` dentro do pacote ECC, mas a leitura confirmou que é direção criativa de vídeos/música (angelcore/cloud-trance/hyperpop), sem relação com a Taste Skill de frontend pedida. Não usar como substituta por colisão de nome.
- Não existem atualmente `C:\Users\Kanex\.claude\agents`, `.claude\hooks`, `.claude\rules`, `.claude\plugins\cache` ou `.claude\plugins\installed_plugins.json`. Junto às chaves ausentes no `settings.json`, isso sustenta que o ECC está disponível em cache para leitura, mas não configurado como plugin global do Claude.
- Inventário superficial atual: 467 diretórios imediatos em cada árvore `.claude/skills` e `.agents/skills`. A contagem inclui diretórios auxiliares e não foi apresentada como número de skills válidas.
- `create-design-md` e `anti-ui-slop` também foram lidas e estão disponíveis. A primeira limita sua própria execução a `DESIGN.md`; não deve impedir que outro agente faça a implementação sob outra skill. A segunda orienta contrato de design e referências de fluxos reais, sem copiar identidade ou conteúdo proprietário.

## Próxima ação exata

Auditoria concluída. Coordenador pode reutilizar as skills globais instaladas e ler seletivamente os agentes/skills ECC do cache como instruções, registrando esse uso sem alegar instalação. Se usar `web-design-guidelines` para revisão, buscar a versão atual de `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` como o arquivo exige. Não executar setup ou alterar globais por esta frente.

## Validação

Somente buscas e leituras de arquivos; nenhum teste de aplicação foi executado por este agente.
