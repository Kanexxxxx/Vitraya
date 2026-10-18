# Coordenação das etapas em paralelo

Coordenador: Claude Code, sessão principal. Início em 18/10/2026. O titular pediu um agente por etapa, trabalhando em paralelo, e um **agente supervisor** que aprova ou reprova cada entrega. Só entra no `main` o que o supervisor aprovar.

## Base

Commit `51ad970` (`chore: base em módulos para as etapas em paralelo`):
- módulos do servidor em `server/modules/`;
- telas em `src/views/`;
- componentes comuns em `src/ui.jsx`;
- menu por seções;
- `baileys` e `qrcode` instalados.

O contrato e quem cuida de cada arquivo estão em [../ARQUITETURA-MODULOS.md](../ARQUITETURA-MODULOS.md).

## Etapas

| Etapa | Cópia isolada (git worktree) | Ramo | Checkpoint do agente | Estado |
| --- | --- | --- | --- | --- |
| 1 · WhatsApp por QR Code | `C:\Users\Kanex\VitrayaEtapas\1-whatsapp` | `etapa/1-whatsapp` | `docs/execucao/ETAPA-1-WHATSAPP.md` | em andamento |
| 2 · Automação 24 h | `C:\Users\Kanex\VitrayaEtapas\2-automacao` | `etapa/2-automacao` | `docs/execucao/ETAPA-2-AUTOMACAO.md` | em andamento |
| 3 · Segurança | `C:\Users\Kanex\VitrayaEtapas\3-seguranca` | `etapa/3-seguranca` | `docs/execucao/ETAPA-3-SEGURANCA.md` | em andamento |
| 4 · Painel, histórico e perfil | `C:\Users\Kanex\VitrayaEtapas\4-painel` | `etapa/4-painel` | `docs/execucao/ETAPA-4-PAINEL.md` | em andamento |
| 5 · Feed e links de todas as lojas | `C:\Users\Kanex\VitrayaEtapas\5-feed` | `etapa/5-feed` | `docs/execucao/ETAPA-5-FEED.md` | em andamento |

As cópias ficam fora do OneDrive. O `node_modules` de cada uma é uma **junção** (atalho de pasta) para o `node_modules` principal.

**Atenção ao limpar:** antes de `git worktree remove`, apague só a junção com `cmd /c rmdir <copia>\node_modules`. Uma remoção recursiva que siga a junção apagaria o `node_modules` principal.

## Fluxo de aprovação

1. O agente da etapa termina e faz commit no próprio ramo, sem push.
2. O supervisor revisa o ramo:
   - lê o diff contra o `main`;
   - roda `npm test`, o build e o E2E completo;
   - abre as capturas;
   - avalia segurança, qualidade, testes, UX e contrato.
   - Nota mínima 8 em cada critério e nenhum defeito crítico ou alto.
   - O parecer fica em `docs/execucao/SUPERVISAO-ETAPA-<n>.md`, no ramo da etapa.
3. Se REPROVADO, o agente da etapa corrige o que foi apontado e o supervisor revisa de novo (no máximo 3 rodadas; depois disso, decide o titular).
4. Se APROVADO, o coordenador junta no `main`, roda tudo de novo, resolve conflitos de encaixe (menu, estado), faz o push e atualiza este arquivo.

## Ordem de junção prevista

1. Segurança, porque o portão vale para todas as rotas.
2. WhatsApp.
3. Automação, que depende da interface do WhatsApp.
4. Feed e links.
5. Painel, que lê o estado de todas.

## Registro

- 18/10/2026: base `51ad970` publicada; cinco cópias criadas e conferidas (34/34 testes e build na cópia 1); os cinco agentes disparados em paralelo.
