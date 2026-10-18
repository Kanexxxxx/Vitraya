# Instruções de terceiros

Preparado em 17/10/2026. As cópias abaixo são instruções locais de desenvolvimento. Nenhuma configuração global, MCP ou runtime ECC foi instalada por esta preparação.

| Origem | Versão ou revisão | Cópia local | Uso |
| --- | --- | --- | --- |
| [ECC](https://github.com/affaan-m/ECC) | `ecc-universal` 2.2.3; pacote já presente no cache npm | `.claude/agents/{architect,code-reviewer,security-reviewer,e2e-runner}.md`; `.claude/skills/{frontend-design-direction,loop-design-check}/` | Arquitetura, revisão independente, segurança, testes e direção visual |
| [REA](https://github.com/morluto/rea) | 6.5.0; commit `f5fcf5216ffb3a266b8c00f6d9a0943051084ab5`; skill metadata `42` | `.agents/skills/reverse-engineer-anything/`, incluindo seus seis arquivos `references/` | Instruções de investigação com evidência; não prova que um alvo foi inspecionado |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | commit `f624f37a8c650b9cc550253104925efe4c8de246`; Taste v2 conforme README | `.claude/skills/design-taste-frontend/` e `.claude/skills/image-to-code/` | Direção de páginas públicas e tradução de referências visuais em código |

O README oficial Taste confirma que os nomes de instalação são `design-taste-frontend` e `image-to-code`, respectivamente nos diretórios upstream `skills/taste-skill` e `skills/image-to-code-skill`. O comando sem `--skill` instala todas as skills do repositório; não foi executado. Não existem cópias globais adicionadas nesta sessão.

A Taste v2 padrão declara que não é destinada a dashboards/telas de aplicativo. O Vitraya Studio usa ECC `frontend-design-direction` no painel. A preparação da Taste e image-to-code não equivale à aplicação de um fluxo de imagem: deve-se registrar evidências quando ele for realmente usado.

## Referências e scripts

- REA: os arquivos de referência relativos foram copiados junto com `SKILL.md`. Guias adicionais usam links oficiais para o upstream. O clone completo está em `referencias/rea/`.
- Taste: `SKILL.md`, README e referências Markdown foram copiados como instruções. Nenhum script foi copiado para as pastas de skills ativas ou executado. Os comandos upstream que usam `<skill>` devem resolver para `referencias/taste-skill/skills/taste-skill/`, onde o clone oficial conserva scripts, biblioteca e assets. Uma nota local após o frontmatter explicita isso.
- image-to-code: o upstream é um único `SKILL.md`; copiado sem alteração. Depende de um recurso real de geração/inspeção de imagens quando seu fluxo é escolhido.
- ECC: agentes e skills selecionados são Markdown, sem hooks ou instaladores. Nomes de ferramentas e modelo nos arquivos upstream não comprovam disponibilidade nesta sessão; usar equivalentes realmente oferecidos pelo ambiente.
- Não foram duplicadas `frontend-design` ou `web-design-guidelines` já instaladas globalmente. Esta preparação mantém somente o conjunto solicitado e necessário.

## Licenças MIT preservadas

Copyright (c) 2026 Affaan Mustafa — ECC. Licença integral: [ECC-MIT.txt](licencas/ECC-MIT.txt).

Copyright (c) 2026 morluto — REA. Licença integral: [REA-MIT.txt](licencas/REA-MIT.txt).

Copyright (c) 2026 Leonxlnx — Taste Skill. Licença integral: [TASTE-MIT.txt](licencas/TASTE-MIT.txt).

Os três arquivos conservam integralmente os avisos de copyright, permissão MIT e ausência de garantia. Manter estes avisos ao redistribuir cópias ou partes substanciais das instruções.
