# Conversão de links por cookie de sessão e por tag — checkpoint

Responsável: Claude Code. Iniciado em 18/10/2026, a pedido do titular: "Mercado Livre, SHEIN, TikTok e outros: pegar pelo cookie, não é API; no Mercado Livre é uma tag".

## Marco 1 — pesquisa (18/10/2026, em andamento)

Fonte principal: a ajuda pública do Promium, [Credenciais](https://ajuda.promium.space/artigo-credenciais-api.html).

| Plataforma | Como o Promium converte | Observação |
| --- | --- | --- |
| Mercado Livre | **Tag de afiliado** (ex.: `silu2845921`, extraível de um link `meli.la/...`) **+ cookie de sessão** da conta | A sessão expira de tempos em tempos e a conversão para. Links curtos: `meli.la/...`, `mercadolivre.com/sec/...`. Links longos levam `matt_word` (etiqueta) e `matt_tool` (ID numérico). |
| SHEIN | Cookie de sessão do painel de afiliados (`m.shein.com/br/affiliate`) | Gera `onelink.shein.com/...` e o código do produto. A automação PAD já lê `shareCode`/`oneLink` na página (ver `Desktop\VITRAYA\CONTINUIDADE.md`). |
| Amazon | Só a tag de rastreamento (ex.: `seunome-20`), parâmetro `tag=` | Não precisa de cookie. |
| Magazine Luiza | Tag do divulgador (trecho após `magazinevoce.com.br/`) ou Partner/Promoter ID | Formato de URL a confirmar. |
| Natura/Avon | `?consultoria=<nome>` | Só parâmetro. |
| TikTok Shop | **Não converte**: posta o link já afiliado | Manter a importação do link pronto. |
| AliExpress | API oficial (App Key, Secret, Tracking ID) | Fora do escopo do cookie. |

Outras referências: [DeivianDS/mercadolivre-afiliados](https://github.com/DeivianDS/mercadolivre-afiliados) (monta link com `matt_word`/`matt_tool`) e [Afilimax CLI](https://github.com/Afilimax/afilimax-cli) (usa cookies para Mercado Livre e Magalu).

Cuidados de projeto: o cookie de sessão dá acesso à conta, então deve ser tratado como senha. Ele fica em `private/` com ACL, nunca em estado, logs, backup ou Git. O uso fora das ferramentas oficiais pode contrariar os termos de cada programa; o titular decide.

## Próxima ação

1. Ler o código da Afilimax CLI para confirmar o endpoint e os cabeçalhos do gerador de links do Mercado Livre.
2. Implementar o conversor por tag, que funciona offline: Amazon, Natura/Avon e Mercado Livre longo.
3. Implementar o Mercado Livre (`meli.la`) e a SHEIN por cookie, com teste em mock.
4. Pedir ao titular um teste real com a própria sessão.
