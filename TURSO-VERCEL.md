# DELTA — Vercel + Turso

Esta versão foi preparada para o deploy, mas existe uma distinção importante: o código atual do DELTA usa a API síncrona `node:sqlite`. Apenas adicionar `TURSO_DATABASE_URL` não troca automaticamente o banco para Turso.

## Já preparado
- entrypoint `api/index.js` para a Vercel;
- `vercel.json`;
- variáveis de ambiente documentadas;
- SQLite de produção limpo em `data/delta.sqlite`;
- somente o Administrador Geral preservado;
- `.gitignore` para não publicar `.env` e SQLite;
- script de importação inicial para Turso.

## Antes de produção real
A camada de banco precisa ser migrada de `node:sqlite` síncrono para `@libsql/client`/Turso (ou outro banco serverless). As rotas atuais são síncronas e fazem chamadas como `db.get`, `db.all` e `db.run`; não é seguro fingir que elas já usam Turso remoto.

## Administrador inicial
Usuário: `admin`
Senha: a mesma senha do Administrador Geral existente na V43/arquivo original.

Troque a senha imediatamente ao colocar em produção.
