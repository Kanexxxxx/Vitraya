# Pacote de retomada do Vitraya Studio

Este pacote serve para continuar o aplicativo de afiliados em outro chat sem depender do histórico desta conversa.

- `PROMPT-RETOMADA.md`: prompt completo pronto para copiar e colar no novo chat, mais decisões, evidências e pendências.
- `VitrayaStudio-fonte-2026-10-17-atualizado.zip`: ZIP atual de código-fonte e documentação do projeto, incluindo checkpoints, screenshots, skills locais, o prompt integral e evidências públicas salvas do Promium.

O ZIP contém os arquivos fonte completos do app. Por segurança, não contém `.git`, `node_modules`, `dist`, `test-results`, bancos, `data/`, credenciais, arquivos `.env` nem cópias integrais de clones externos em `referencias/rea` e `referencias/taste-skill`. Os oito artefatos públicos em `referencias/promium/` foram incluídos. A pasta `%LOCALAPPDATA%\VitrayaStudio\data`, se já existir, não foi lida nem incluída; ela pode conter dados do usuário.

Para iniciar a cópia em um computador Windows com Node.js 24.15+:

```powershell
npm ci --ignore-scripts
npm run build
npm start
```

Depois acesse `http://127.0.0.1:4317`, ou use `Abrir Vitraya.cmd` na cópia extraída. Configure sempre o armazenamento de dados conscientemente. Não copie credenciais para o ZIP, para o chat ou para o Git.
