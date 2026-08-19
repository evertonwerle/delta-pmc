# DELTA — Vercel + Turso

Esta versão está preparada para usar **Turso de verdade** em produção.

## O que foi alterado

- `backend/database.js` agora usa `@libsql/client` quando `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` estão definidos.
- O mesmo código continua funcionando localmente com SQLite (`node:sqlite`) quando essas variáveis não existem.
- As rotas foram convertidas de `db.get/db.all/db.run/db.exec` síncronos para operações com `await`.
- O Express foi atualizado para a linha 5.x, permitindo middlewares assíncronos.
- O banco cria/verifica o schema automaticamente ao iniciar.
- As sessões do `express-session` agora são persistidas na tabela `sessions`, evitando depender do MemoryStore em funções serverless da Vercel.
- `api/index.js` continua sendo o entrypoint da Vercel.
- `vercel.json` encaminha as rotas para o Express.
- `database/migrate-to-turso.js` faz a importação do SQLite local para o Turso.

## Variáveis da Vercel

Configure no projeto da Vercel:

- `TURSO_DATABASE_URL` — URL `libsql://...` do banco Turso.
- `TURSO_AUTH_TOKEN` — token do banco Turso.
- `SESSION_SECRET` — uma chave longa e aleatória para assinar as sessões.
- `NODE_ENV=production` — recomendado para o ambiente de produção.

**Nunca coloque o `TURSO_AUTH_TOKEN` no código ou no Git.**

## Migrar o banco local para o Turso

Antes de publicar, defina localmente:

```bash
export TURSO_DATABASE_URL="libsql://SEU-BANCO.turso.io"
export TURSO_AUTH_TOKEN="SEU_TOKEN"
```

Depois execute:

```bash
node database/migrate-to-turso.js
```

O script copia as tabelas e os registros do SQLite ativo para o Turso em lotes.

Se o projeto tiver mais de um SQLite em `data/`, informe explicitamente o banco desejado:

```bash
export DELTA_DB_PATH="delta.sqlite"
node database/migrate-to-turso.js
```

## Deploy

1. Faça o push do projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente acima.
4. Faça o deploy.
5. Teste login, cadastro, hierarquia, candidaturas e relatórios.

A Vercel não deve ser usada como armazenamento permanente do arquivo SQLite local. Em produção, com as variáveis Turso configuradas, o backend passa a gravar no banco remoto.

## Desenvolvimento local

```bash
cd backend
npm install
npm start
```

Sem `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`, o projeto usa o SQLite local.
