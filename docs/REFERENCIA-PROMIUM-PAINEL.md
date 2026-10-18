# Mapa funcional do painel de referência (Promium)

Fonte: capturas de tela do painel do próprio titular, enviadas por ele em 18/10/2026. Nenhuma sessão foi aberta por agente e nenhum dado de conta (e-mail, telefone, IDs, chaves) é registrado aqui. Este documento lista **funções** para o Vitraya implementar do seu jeito. Não copie marca, textos, layout ou código. A comparação com a documentação pública continua em [REFERENCIA-PROMIUM.md](REFERENCIA-PROMIUM.md).

## Navegação observada

| Grupo | Itens |
| --- | --- |
| Painel | Início, Feed de Produtos |
| Canais | WhatsApp (Instâncias, Grupos e Canais, Modo de envio), Telegram |
| Envios | Envio Direto, Envio Manual, Envio Programado, Cupons das lojas, Histórico de Envios |
| Automações | Busca de produtos, Automatizador de Promoções, Replicador de mensagens, Monitoramento, Fila de Promoções, Monitoramento Clone |
| Crescimento | Personalização (Textos Personalizados, Cupons de Desconto, Tags de Cupom e Preço), Vitrine (Minha Vitrine, Analytics), Gerador de Descontos, Rotador de Grupos |
| Conta | Configurações (Credenciais API e outras), Minha conta (dados, assinatura, token da extensão) |
| Ajuda | Suporte, tutoriais, indicação |

## Telas, funções e lacunas no Vitraya

| Tela | O que faz | Vitraya hoje | Lacuna |
| --- | --- | --- | --- |
| Início | Saudação, checklist de configuração com % (cadastro, credenciais, WhatsApp, grupos, automação), indicadores (enviadas hoje, automações ativas, na fila, WhatsApp conectado), próximos passos, atalhos | Catálogo é a tela inicial | Painel inicial com checklist e indicadores |
| Feed de Produtos | Colar link de qualquer loja e gerar o produto já com link de afiliado; filtros por loja e fonte; busca | Cadastro manual, importação e conversor Shopee | **Colar link universal** (detecta a loja, converte, traz foto/preço) |
| WhatsApp · Instâncias | Números conectados **por QR Code**, status, renomear, desconectar, adicionar número | Conector Evolution (instância do próprio titular) | QR Code na própria tela; vários números |
| WhatsApp · Grupos e Canais | Buscar grupos e canais da instância, cadastrar, **categorias** de destino (até 6), atualizar nomes | Canais cadastrados à mão por link | Listar grupos/canais pela instância; categorias |
| WhatsApp · Modo de envio | Número escolhido na automação, alternado (rodízio) ou dividido (paralelo) | Um conector por campanha | Rodízio de números (depois de ter vários) |
| Envio Direto | Colar até 20 links, converter para afiliado, enviar agora ou pôr na fila; instância, tipo de mídia, destinos, texto e cupom | Envio avulso por produto | **Lote de links → conversão → envio** |
| Envio Manual | Instância, grupos, texto, imagem opcional (até 5 MB) | Envio avulso (Telegram/Evolution) | Equivalente |
| Envio Programado | Igual ao manual + data e hora (mínimo 10 min à frente, horário de Brasília) e lista de agendamentos | Fila com agendamento automático autorizado | Equivalente; falta a lista dedicada |
| Cupons das lojas | Cupons oficiais por loja, atualizados sozinhos; filtros (válidos, vencem hoje, encerrados); mínimo, limite, validade, produtos; usar nas promoções; enviar | Cupons cadastrados à mão + simulador | Coleta automática (só onde houver fonte oficial) |
| Histórico de Envios | Totais (total, enviados, falhas, pendentes), abas, filtro por loja, busca | Atividade e recibos | Tela de histórico com filtros |
| Busca de Produtos (automação) | Busca ofertas nas lojas escolhidas e envia nos grupos **no intervalo definido** | Busca Shopee manual | **Automação agendada com intervalo e limite diário** |
| Fila de Promoções | Envios em sequência | Fila em lote (manual) + automática | Ritmo com intervalo aleatório |
| Automatizador, Replicador, Monitoramento, Clone | Leem grupos de origem e repassam ofertas | — | Avaliar com cuidado depois: envolve ler e repassar conteúdo de terceiros |
| Personalização | Modelos de texto, cupons de desconto, tags de cupom e preço | Modelos com variáveis | Tags automáticas de preço/cupom |
| Vitrine + Analytics | Página pública com os produtos e contagem de cliques | — | Depende de hospedagem pública |
| Gerador de Descontos, Rotador de Grupos | Ferramentas de crescimento | — | Avaliar depois |
| Credenciais API | Por loja: Shopee (App ID, Secret, Sub_ID, converter automático); Mercado Livre (tag de afiliado + cookie de sessão, com renovação); outras | Shopee feita; tags/cookies em pesquisa | Mercado Livre e SHEIN por sessão; Amazon por tag |
| Minha conta | Dados, plano, token da extensão (gerar/revogar) | — | **Perfil** |

## Uso no planejamento

As lacunas marcadas em negrito entram na fila de tarefas do Vitraya ([CONTINUIDADE.md](CONTINUIDADE.md)). A ordem combinada com o titular em 18/10 começa por **T1: fotos + WhatsApp**.
