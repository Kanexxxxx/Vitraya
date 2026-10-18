# Vitraya Studio

Aplicativo web local de uso pessoal para organizar ofertas de afiliados, criar artes e legendas, simular cupons e planejar publicações. Importa produtos de SHEIN, Shopee, Mercado Livre, TikTok Shop e outras origens, preservando os links fornecidos. Inclui envio opcional por Telegram Bot API e Evolution API v2 para grupos/números WhatsApp.

## Iniciar no Windows

Requer Node.js 24.15 ou superior e npm. Na pasta deste projeto:

```powershell
npm ci --ignore-scripts
npm run build
npm start
```

Abra [http://127.0.0.1:4317](http://127.0.0.1:4317). Depois da instalação/build, dê **dois cliques em [Abrir Vitraya.cmd](<Abrir Vitraya.cmd>)** para iniciar o servidor e abrir o navegador. Se já estiver rodando na porta padrão, o atalho reutiliza o servidor. Mantenha o terminal aberto; `Ctrl+C` encerra o servidor. O endereço é restrito ao próprio computador.

## Fluxo de trabalho

1. Cadastre produtos, importe CSV, JSON ou XLSX com prévia de validação, ou busque ofertas da Shopee pela Open API oficial (**Ofertas Shopee**) e traga com foto, preço e link de afiliado.
2. Envie as imagens PNG, JPEG ou WebP pelo aplicativo.
3. Use favoritos, modelos de legenda e três direções de arte: Boutique, Oferta direta e Essencial.
4. Cadastre cupons e simule regras de validade, mínimo, teto e escopo; selecione produtos para baixar kits ou organizar uma fila em lote.
5. Publique manualmente ou configure um conector, teste o acesso e autorize o envio avulso/agendado. Exporte o catálogo ou faça um backup ZIP com imagens.

Exemplos fictícios estão em [public/exemplos](public/exemplos). O [guia de uso](docs/USO.md) explica preços, imagens, importação e backup.

## Integrações e limites

Shopee: busca de ofertas, comissão e conversão de links pela Open API oficial de afiliados, com AppID e chave guardados só neste computador ([guia](docs/USO.md#ofertas-shopee-open-api-oficial-de-afiliados)). Telegram envia texto/foto para destinos permitidos pelo bot. Evolution usa uma instância existente e envia a números/grupos WhatsApp; **Canais WhatsApp seguem com publicação manual**. Agendamentos automáticos exigem conexão testada, autorização explícita e computador/servidor ligados. A fila em lote é manual. Não há repetição automática após falha ou resultado incerto.

Os conectores foram testados com provedores simulados; **nenhuma conta real foi conectada e nenhum envio real foi realizado**. Aceitação com ID pelo provedor não comprova entrega ou leitura. O envio usa a foto original local do produto e a legenda; as artes personalizadas podem ser baixadas para publicação manual.

Geração/conversão de links, busca externa de produtos, atualização de preço/estoque, descoberta automática de cupons e monitoramento de grupos ainda dependem de implementação e acesso específicos. O catálogo e o simulador local funcionam com os dados que você informa.

Não há autenticação de múltiplos usuários, sincronização entre computadores ou hospedagem pública. Consulte [integrações e regras de divulgação](docs/INTEGRACOES.md) antes de conectar um provedor ou publicar ofertas.

## Dados e desenvolvimento

No Windows, o servidor usa `%LOCALAPPDATA%\VitrayaStudio\data` por padrão, fora da pasta do projeto: banco SQLite, `media/` e credenciais locais em `private/`. O caminho aparece no terminal ao iniciar. Para escolher outra base antes de iniciar:

```powershell
$env:VITRAYA_DATA_DIR = 'C:\MinhaPastaLocal\VitrayaDados'
npm start
```

Use a mesma pasta nas próximas inicializações; trocar o caminho não migra dados antigos. O ZIP de backup aceita até 50 MB e exclui credenciais. Para catálogos maiores, exporte a tabela e guarde a pasta de mídia; para copiar toda a operação, feche o servidor e copie o diretório de dados. Credenciais e arquivos reais ficam fora do repositório.

```powershell
npm test
npm run build
npm run dev
```

O modo de desenvolvimento usa a interface em `http://127.0.0.1:4318` e a API em `127.0.0.1:4317`. Não execute outro servidor na mesma porta.

Resultados reais e pendências de QA estão em [VALIDACAO.md](docs/VALIDACAO.md).

O projeto é independente da Nexakeep. O alvo indicado pelo titular foi confirmado como [Promium](https://promium.space/). A [comparação funcional](docs/REFERENCIA-PROMIUM.md) registra documentação e telas públicas capturadas com REA, recursos locais e lacunas. O painel autenticado do fornecedor não foi acessado; paridade completa não foi demonstrada.
