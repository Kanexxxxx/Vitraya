# Vitraya Studio

Leia `AGENTS.md`, `docs/CONTINUIDADE.md` e os checkpoints de `docs/execucao/` antes de trabalhar. Atualize seu checkpoint após marcos e testes reais. Este projeto é separado da Nexakeep.

O produto é uma ferramenta local de catálogo, criação de ofertas e preparação de campanhas de afiliados. Preserve dados e alterações existentes. Não envie mensagens reais em testes. Integrações só aparecem conectadas após teste real; siga `docs/CONTRATO.md` e `DESIGN.md`.

Instruções locais disponíveis:

- `.claude/agents/`: ECC 2.2.3 para arquitetura, revisão de código, segurança e E2E. Use instruções com as ferramentas realmente disponíveis, sem presumir MCP ou runtime ECC.
- `.claude/skills/frontend-design-direction/`: direção de interface para o painel operacional.
- `.claude/skills/loop-design-check/`: consultar apenas ao criar automação repetitiva; não exige loop para tarefas únicas.
- `.claude/skills/design-taste-frontend/`: Taste v2 para páginas públicas, com referências locais. O painel não é seu escopo padrão.
- `.claude/skills/image-to-code/`: usar quando houver fluxo de imagem de referência para código; registrar quais imagens foram realmente usadas.
- `.agents/skills/reverse-engineer-anything/`: REA para evidência de aplicativo empacotado/runtime. Sua cópia fornece instruções; não conecta MCP nem instala motores. Análise comum do código deste projeto usa ferramentas locais.

Origens, versões, licenças e limites estão em `docs/TERCEIROS.md`. Nunca execute instaladores globais como consequência dessas instruções locais.
