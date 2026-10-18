# Revisão independente — 17/10/2026

- Responsável: agente `skills_audit`; sem alteração de `src/`, servidor ou testes persistentes.
- Instruções aplicadas: ECC 2.2.3 `.claude/agents/code-reviewer.md`; [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), buscadas em 17/10/2026.
- Escopo: `src/main.jsx`, `src/domain.js`, contrato e limites principais do backend. CSS ainda em produção por outro agente; sua ausência não foi tratada como achado.
- Modo: revisão de código, provas determinísticas em Node e inspeção focal de Canvas/árvore de acessibilidade no Edge headless. Não equivale ao E2E completo nem à inspeção visual final do aplicativo.
- Alvo indicado pelo titular: `https://promium.space`; aplicativo pessoal local confirmado. Esta revisão não inspecionou o alvo externo nem declara paridade com ele.

## Achados para corrigir

| Prioridade | Local | Falha concreta e evidência | Correção sugerida |
| --- | --- | --- | --- |
| P1 | `src/domain.js:3` | Preço manual com separador brasileiro de milhar é convertido incorretamente: `cents('1.234')` retornou **123 centavos**, enquanto `parseMoney('1.234')` do importador retorna **123400**. O campo manual aceita esse texto, e a validação do servidor aceita o inteiro positivo resultante. Pode gerar oferta de R$ 1,23 para produto de R$ 1.234,00. | Unificar a gramática monetária entre entrada manual/importação e rejeitar representações ambíguas antes de salvar. |
| P1 | `src/main.jsx:86` e `src/domain.js:15` | Renderizações assíncronas reutilizam `previewRef.current`. A limpeza do efeito só impede a cópia final; o render antigo ainda desenha nesse canvas após carregar a imagem. Prova com duas imagens controladas: após o último preenchimento de fundo, o canvas final recebeu `image:A`, título A, `image:B`, título B. Se as proporções/áreas diferem, a arte atual pode conter resquícios do produto anterior. | Usar canvas isolado por renderização e copiar somente a versão ativa; ou cancelamento/token verificado antes de qualquer escrita após `await`. |
| P2 | `src/main.jsx:91` (também `:93` e `:94`) | Formulários de criação não bloqueiam reenvio durante `run`; o botão de salvar da fila permanece habilitado. Duplo clique dispara duas criações; o backend atribui novo ID sem chave de idempotência. Prova com duas submissões idênticas concorrentes ao endpoint: duas respostas 201 e duas campanhas. | Bloqueio síncrono de submissão por formulário e estado visível de salvamento; considerar idempotência para a criação de campanhas. |
| P2 | `src/domain.js:9` e `:17` | `wrap` não divide palavras longas; um título aceito com 200 letras `W` é desenhado inteiro. Edge mediu 9365,625 px para uma área de 952 px num Canvas de 1080 px: o texto é cortado na exportação. Assinaturas em `:21` também são limitadas por quantidade de caracteres, sem medir largura. | Quebrar por grafema quando uma palavra excede a largura e limitar assinatura/marca por largura efetiva, com reticências; validar títulos longos nos três formatos. |
| P2 | `src/main.jsx:73` | O `<dialog>` não associa seu título a um nome acessível. No snapshot de acessibilidade do Edge aparece `dialog:` sem nome, seguido de heading separado. Usuários de leitor de tela não recebem o contexto ao entrar. | Gerar ID estável para o `h2` e usar `aria-labelledby`; associar descrição quando existir. |
| P2 | `server/app.mjs:43` e `:45` / `:100` | A exportação inclui todas as mídias sem limite compatível com a restauração; a entrada admite imagens de 10 MB por upload, mas o backup é recusado acima de 50 MB comprimidos ou 100 MB expandidos. Seis fotos pouco compressíveis de 9 MB já geram backup impossível de restaurar pelo próprio app. Os limites de segurança da leitura são necessários; a geração precisa respeitá-los ou oferecer uma estratégia compatível. | Compartilhar limites entre exportação/restauração; avisar antes de gerar um backup incompatível, dividir em volumes ou implementar restauração local que mantenha limites por arquivo sem contradizer o backup produzido. |

## Observações menores confirmadas

- `src/main.jsx:81`: escolher arquivo inválido após uma prévia válida deixa a prévia e suas linhas anteriores disponíveis para importação. Limpar prévia ao iniciar nova leitura e no erro evita importar o arquivo anterior por engano.
- `src/main.jsx:70` versus `server/app.mjs:111`: a UI procura a tag `demonstracao`, mas o backend grava `demonstração`. O aviso global de dados fictícios não aparece; os títulos ainda carregam “exemplo”.

## Validação executada

- Node: comparação da entrada monetária manual e do importador; divergência reproduzida.
- Node: duas renderizações com carregamento de imagem controlado no mesmo canvas; escrita cruzada reproduzida.
- Edge headless: medição real de título longo no Canvas e snapshot do diálogo; corte de texto e ausência de nome acessível confirmados.
- API local com banco temporário e dados fictícios: submissões idênticas concorrentes criaram duas campanhas; ambiente temporário removido após fechar o servidor.
- Limites de backup conferidos por leitura de geração, multipart e validador ZIP; não foi criado um arquivo volumoso na revisão.
- Nenhuma mensagem enviada, nenhum dado real importado e nenhum teste de integração externa realizado.

## Estado e próxima ação

Revisão com pendências: corrigir P1 e os fluxos P2 antes de finalizar; depois executar regressões direcionadas e E2E real do aplicativo com CSS concluído. Retornar a este arquivo para marcar somente correções verificadas. A inspeção visual final e a paridade com o alvo externo continuam fora do resultado desta revisão.
