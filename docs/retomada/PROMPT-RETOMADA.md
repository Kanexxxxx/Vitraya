# Prompt para retomar o Vitraya Studio em outro chat

Copie o bloco abaixo no novo chat. O arquivo-fonte completo está no ZIP `VitrayaStudio-fonte-2026-10-17-atualizado.zip`, junto desta pasta. O projeto original continua em `C:\Users\Kanex\OneDrive\Desktop\VitrayaStudio`.

---

## Prompt pronto para copiar

Continue o Vitraya Studio nesta pasta: `C:\Users\Kanex\OneDrive\Desktop\VitrayaStudio`. Este pedido é somente sobre o aplicativo local de afiliados. Não mude o escopo para outros projetos.

Quero um sistema web local, para uso pessoal no meu computador, inspirado nos fluxos públicos do Promium: https://promium.space/ . O objetivo é organizar produtos afiliados, imagens, preços, promoções e links para eu preparar e compartilhar ofertas nos meus canais, especialmente WhatsApp. As plataformas que quero atender são Shopee, Mercado Livre, SHEIN e TikTok Shop, com possibilidade de expansão para outras. Preciso cadastrar/importar e exportar dados e imagens, criar artes e mensagens, montar campanhas e usar integrações oficiais quando forem disponíveis para minha conta. Tenho acesso aprovado à API de afiliados da Shopee. Não peça senhas, tokens ou chaves no chat; qualquer credencial deve ser configurada localmente pelo aplicativo ou por mecanismo privado documentado.

Antes de alterar código:

1. Leia `AGENTS.md`, `docs/CONTINUIDADE.md`, todos os checkpoints pertinentes de `docs/execucao/`, `docs/VALIDACAO.md`, `docs/CONTRATO.md`, `docs/USO.md`, `docs/INTEGRACOES.md`, `docs/CONECTORES.md`, `docs/CUPONS.md`, `docs/REFERENCIA-PROMIUM.md`, `README.md` e `DESIGN.md`.
2. Confira o estado real de todos os arquivos e `git status`. Preserve o trabalho atual e os dados locais. Não presuma que testes antigos cobrem as alterações mais recentes.
3. Trate a comparação do Promium como observação de páginas e documentação públicas. Não acesse conta protegida, não extraia código, não copie marca, conteúdo, endpoints privados ou comportamento proprietário. Implemente funcionalidades próprias com base nos requisitos do usuário e APIs oficialmente documentadas.
4. Desenvolva e rode o aplicativo somente em localhost. Não compre, publique, hospede, altere DNS ou envie mensagens reais sem instrução específica. Não inclua dados pessoais, chaves ou banco local no Git nem no pacote de fonte.
5. Mantenha checkpoints atualizados após cada marco, registrando evidência verdadeira, pendências e o próximo comando exato.

Estado conhecido do projeto: a base já tem catálogo local com CRUD, busca/filtros e marketplaces; importação CSV/JSON/XLSX com prévia e associação de fotos; exportação CSV/JSON/XLSX e kits ZIP; Estúdio Canvas com três direções e formatos; mensagens editáveis; favoritos; cupons manuais com simulação local; canais, campanhas, fila manual e agendamento opt-in; conectores Telegram Bot API e Evolution API v2. Credenciais reais ainda não foram configuradas e nenhum envio real foi feito. O padrão Windows dos dados é `%LOCALAPPDATA%\VitrayaStudio\data`; preserve essa pasta. A aplicação inicia em `http://127.0.0.1:4317` e o desenvolvimento usa 4318.

Próxima prioridade: pesquisar a documentação **oficial e atual da API de afiliados Shopee Brasil**, confirmar assinatura, endpoints, operações, limites e credenciais exigidos pela conta antes de codificar; implementar um conector real para pesquisa/conversão de links apenas onde o contrato oficial permitir. Coloque segredos em armazenamento privado local, nunca em `state`, logs, exportações, backups, screenshots ou Git. Construa testes com transporte HTTP simulado; teste real só depois de o titular configurar a conta localmente. Preserve exatamente os links de afiliado fornecidos e não invente preços, estoque, desconto ou comissão. Se a API ou permissão necessária não estiver documentada, registre a lacuna e ofereça importação/entrada manual sem declarar a integração pronta. Depois, investigue Mercado Livre, SHEIN e TikTok Shop individualmente, usando documentação oficial e sem supor que um conector serve para todos.

Antes de considerar a entrega pronta, reconcilie os registros de testes que estão em checkpoints distintos e atualize-os com execuções atuais: `npm test`, `npm run build` e `npm run test:e2e`. O checkpoint de QA e a matriz `docs/VALIDACAO.md` precisam distinguir testes unitários/API, execução E2E, build e teste real externo. Complete os fluxos visuais/funcionais pendentes em desktop, tablet e celular. Nenhuma mensagem real deve ser enviada durante QA.

Use skills locais pertinentes em `.agents/skills/` e `.claude/skills/`; consulte `docs/execucao/SKILLS.md` para saber o que foi realmente usado e o que existe apenas no pacote. Não alegue instalação global do ECC ou da skill Globalize: a auditoria anterior não encontrou Globalize e o ECC foi mantido local, sem reconfigurar o Claude global. A skill REA está em `.agents/skills/reverse-engineer-anything/`. Registre claramente cada skill, agente ou ferramenta que de fato usar.

## Fim do prompt

---

## Histórico original do pedido do Vitraya

Transcrição das instruções que definiram este app, preservando a redação do usuário:

> Você vai fazer o seguinte: vou usar um repositório pra fazer uma engenharia reversa e para clonar qual quê? Clonar o melhor aplicativo, tipo o Pro Mil, o Pro Mil que a gente usa pra poder mandar os links dos produtos, foto, preço e promoções no canal do WhatsApp. É basicamente isso. Eu quero clonar um app daquele lá, com engenharia reversa. Porque eu preciso, vou usar integração da Shen, Shopee, Mercado Livre, TikTok Shop, então o sistema tem que estar bem completo, incluindo todos os meios de marketing, marketplace, e o sistema também tem que exportar imagem e deixar eu mandar imagem pra eles, né? Porque eu já tenho uns arquivos aqui com imagem, produto, link, tudo. Então o sistema tem que ser completo. Então ele precisa exportar, exportar e desportar, né, assim que fala. Então precisa ficar bem completinho. Use essa skill, use esse skill Globalize que tá dentro do Cloud e me traga um sistema já pronto. Tipo, só pare enquanto você me entregar o projeto pronto. Quero tudo pronto: funções, todas as skills.

> Bom, vou te passar o app aqui, que basicamente é um site, né, de afiliados. Você vai meio que usar uma engenharia reversa pra copiar pra gente poder compartilhar os nossos links de afiliado, fazer integrações. Tem integração com o Mercado Livre, Shopee, não só esses, mas outros possíveis, né? Ou seja, a gente tem que expandir isso, entende? Eu só quero os melhores. Eu quero as melhores configurações e o sistema tem que se adaptar a mim. Por enquanto ele só vai estar disponível para mim, entende? O domínio, você pode usar... O domínio, a gente, tipo assim, ele não vai ser um projeto desktop, basicamente. Tipo, não desktop. A gente vai rodar local mesmo. A gente só vai usar ele local, entende? Quando a gente for usar ele, tipo for subir algum produto no WhatsApp, a gente roda ele local e manda os produtos por enquanto. Depois a gente vê a questão do domínio, hospedagem, entende? É só pra poder testar ele por enquanto.

Referência indicada: `https://promium.space/?utm_source=chatgpt.com`. Repositório indicado para a skill REA: `https://github.com/morluto/rea.git`.

> Tenho acesso da Shopee.

Essa última resposta confirma acesso aprovado à API de afiliados Shopee; nenhuma chave foi fornecida ou configurada no projeto.

## Arquivos e decisões para consulta

- `../CONTINUIDADE.md`: visão geral e ponto de retomada.
- `../VALIDACAO.md`: matriz funcional e limites; revalidar pois checkpoints de QA podem ter sido atualizados em momentos diferentes.
- `../execucao/COORDENACAO.md`, `BACKEND.md`, `QA.md`, `REVISAO.md`, `SKILLS.md`, `AFILIADOS-SKILLS.md`, `CUPONS.md`, `DOCUMENTACAO.md`: decisões e registros detalhados.
- `../REFERENCIA-PROMIUM.md`: observações públicas e comparação honesta; não houve inspeção de painel autenticado.
- `.agents/skills/reverse-engineer-anything/SKILL.md`, `.claude/skills/`, `docs/TERCEIROS.md` e `docs/licencas/`: skills/referências locais e licenças.

## Evidências atuais conhecidas ao gerar este pacote

- Checkpoint do backend: `node --test test/backend*.mjs` passou **13/13**, usando bases temporárias e provedores HTTP simulados.
- Execução completa `npm test` registrada pela coordenação: **22/22**, anterior à última inclusão de dois testes concorrentes do backend; portanto ainda precisa ser repetida para consolidar o estado atual.
- `npm run build` passou depois da última atualização do renderizador do Estúdio, conforme registro desta sessão anterior. O pacote não executou novos testes.
- Os registros de QA divergem por estarem desatualizados: `docs/execucao/QA.md` relata 3/3 verificações visuais e marca E2E final pendente; há relato anterior de 6/6 E2E, mas executado antes da última alteração visual. Execute `npm run test:e2e` novamente e atualize os dois documentos com o resultado atual.
- `npm audit --omit=dev` tinha zero vulnerabilidades reportadas após o override do UUID do ExcelJS; reexecute apenas se dependências forem alteradas.
- Nenhuma conta real Shopee/Telegram/Evolution foi configurada. Nenhum envio real ocorreu. Não declare estes fluxos aceitos por causa de mocks.
- O diretório de trabalho original foi inicializado como repositório Git, branch `master`, ainda sem commit e sem remote. Preserve essa situação até revisar o pedido do usuário.
