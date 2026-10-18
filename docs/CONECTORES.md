# Conectores opcionais e dados locais

O aplicativo continua funcionando sem credenciais. Telegram e Evolution só fazem chamadas quando você testa uma conexão, confirma um envio ou autoriza uma campanha automática. Os testes do projeto usam servidores HTTP fictícios no loopback; nenhuma mensagem real foi enviada na implementação.

## Dados e credenciais

- CLI Windows: `%LOCALAPPDATA%\VitrayaStudio\data`, fora do projeto e do OneDrive. `VITRAYA_DATA_DIR` substitui o diretório. A pasta antiga `./data`, se existir, é preservada e não é migrada automaticamente. Para continuar usando uma base antiga, defina essa variável apontando para ela.
- Linux/macOS: `~/.local/share/VitrayaStudio/data` por padrão.
- Credenciais do formulário ficam em `private/connectors.json` nesse diretório, em texto legível somente para a conta local: modo 0600/0700 em Unix; ACL do usuário atual via `icacls` no Windows. Se não for possível restringir permissões, a gravação falha. Não são criptografadas; proteja sua conta do sistema.
- A API devolve apenas estado, destino e configuração pública. Token/chave não voltam ao navegador, não entram no estado do catálogo, no histórico de atividades ou no backup ZIP. Excluir a conexão remove suas credenciais locais. Credenciais de ambiente precisam ser removidas do ambiente do processo.
- Não coloque segredos em código, documentos, exemplos ou commits.

Variáveis opcionais do servidor:

| Conector | Variáveis |
| --- | --- |
| Telegram | `VITRAYA_TELEGRAM_BOT_TOKEN`, `VITRAYA_TELEGRAM_CHAT_ID` |
| Telegram Bot API local | `VITRAYA_TELEGRAM_API_BASE`, somente para servidor Bot API próprio; padrão `https://api.telegram.org` |
| Evolution v2 | `VITRAYA_EVOLUTION_URL`, `VITRAYA_EVOLUTION_API_KEY`, `VITRAYA_EVOLUTION_INSTANCE`, `VITRAYA_EVOLUTION_NUMBER` |

Se o token/chave está definido no ambiente, o conector é gerenciado pelo ambiente; a interface não o substitui. O servidor não lê arquivos `.env` automaticamente: forneça as variáveis ao processo, sem colocá-las em arquivos versionados.

## Telegram

Crie seu bot com BotFather, adicione-o ao destino e dê as permissões necessárias. Para canais, ele precisa ser administrador com autorização para publicar. O teste executa `getMe`, `getChat` e `getChatMember`; não envia mensagem. Uma resposta de teste válida habilita “conectado”, sem provar a entrega de uma oferta.

Destino padrão: ID numérico do chat/canal, como o ID privado obtido por você, ou `@nome_do_canal`. Canal selecionado no aplicativo precisa de URL pública `https://t.me/nome_do_canal`. Links de convite e de mensagens privadas não são convertidos em destinatários. Um canal selecionado inválido nunca usa o destino padrão silenciosamente.

Imagem local PNG/JPEG/WebP é enviada por multipart. Mensagem de até 1.024 caracteres vai na legenda; acima disso, a imagem vai sem legenda e o texto integral vai em uma segunda mensagem, até 4.096 caracteres. Não há corte do texto nem alteração do link. Se apenas a foto for aceita, o resultado aparece como parcial, e o aplicativo não repete a tentativa automaticamente. O Telegram também limita tamanho e proporções da foto; o servidor verifica esses limites antes de enviar.

Documentação oficial: [requisições e respostas](https://core.telegram.org/bots/api#making-requests), [getMe](https://core.telegram.org/bots/api#getme), [getChat](https://core.telegram.org/bots/api#getchat), [getChatMember](https://core.telegram.org/bots/api#getchatmember), [sendPhoto](https://core.telegram.org/bots/api#sendphoto) e [sendMessage](https://core.telegram.org/bots/api#sendmessage).

## Evolution API v2

Use uma instância própria já configurada e autenticada. O teste consulta `GET /instance/connectionState/{instance}` com `apikey`; somente estado `open` confirma a conexão. A imagem local é enviada em base64 puro em `POST /message/sendMedia/{instance}`; texto sem imagem usa `POST /message/sendText/{instance}`. O retorno precisa conter um ID de mensagem.

Destinos: telefone internacional sem `+`, link `https://wa.me/telefone` em canal selecionado ou JID de grupo `...@g.us` no destino padrão. Convites `chat.whatsapp.com` não são resolvidos. **Publicação em Canais WhatsApp não está implementada.** Links `/channel/` e destinatários `@newsletter` são recusados.

Esta implementação usa a estrutura v2 da fonte oficial. Instalações e provedores podem variar; teste sua versão antes de publicar. Aceite pela API não equivale a recebimento ou leitura.

Fontes oficiais verificadas em 17/10/2026: [rotas de mensagens](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/routes/sendMessage.router.ts), [DTO](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/dto/sendMessage.dto.ts), [schema](https://github.com/evolution-foundation/evolution-api/blob/main/src/validate/message.schema.ts), [autenticação](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/guards/auth.guard.ts), [estado de instância](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/controllers/instance.controller.ts), [mídia base64](https://github.com/evolution-foundation/evolution-api/blob/main/src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts) e [JID de grupo](https://github.com/evolution-foundation/evolution-api/blob/main/src/utils/createJid.ts).

## Rede, confirmação e fila

Gateway aceita HTTPS público ou HTTP/HTTPS em `127.0.0.1`, `localhost` ou `::1`. Rede privada remota, link-local, metadados e redirecionamentos são recusados. O DNS é validado e o endereço resultante é fixado na conexão, preservando a validação TLS pelo hostname.

Todo envio exige confirmação explícita. `idempotencyKey` identifica a tentativa: reutilizar a mesma chave/conteúdo devolve o resultado persistido, sem nova chamada ao provedor. A reserva é transacional no SQLite, inclusive entre duas instâncias usando a mesma base. Resultado ambíguo ou parcial exige conferir o destino antes de criar outra tentativa.

Campanhas começam como `deliveryMode: manual`. Automação exige conector testado, destino suportado e `confirmAutomatic: true`. Telegram precisa de teste no destino da campanha. A fila roda a cada segundo enquanto o servidor está ligado. Marca `sending` antes de chamar a rede e termina `done` somente após aceite com ID. Falhas viram `failed`, sem repetição automática; reiniciar uma operação interrompida em `sending` produz `unknown`. Configuração, destino ou dados comerciais do produto alterados após autorização bloqueiam o envio e exigem nova conferência. O texto autorizado não é recalculado.

Campanhas restauradas de backup ficam em modo **manual**, mesmo que a origem tivesse automação. Credenciais não são restauradas. Isso evita publicar ofertas apenas por abrir um backup.

## Backup

O ZIP contém catálogo, fila, modelos, canais, cupons, configurações públicas e imagens locais; não contém credenciais nem o histórico privado de tentativas de conector. Limites compartilhados de geração/restauração: 50 MB de ZIP, 100 MB expandidos, 20 MB por manifesto, 10 MB por imagem, até 5.000 registros por lista e 5.000 imagens. ZIP é gerado sem compressão para garantir que o próprio restaurador aceite sua razão de expansão.

Antes de gerar, o servidor verifica os tamanhos e responde com erro claro se ultrapassar o limite; os dados continuam intactos. Para acervo maior, exporte o catálogo e copie `media` separadamente. Para preservar toda a operação local, feche o aplicativo e copie a pasta de dados; essa cópia inclui credenciais locais, portanto mantenha-a protegida. Não sincronize essa pasta com um repositório público.
