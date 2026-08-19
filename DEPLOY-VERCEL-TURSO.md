# DELTA — Deploy Vercel + Turso

## Estado técnico

O backend foi migrado para uma camada de banco assíncrona compatível com Turso.

A seleção é automática:

- com `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`: usa `@libsql/client` e Turso;
- sem essas variáveis: usa SQLite local para desenvolvimento.

As chamadas de banco das rotas foram convertidas para `await`.

## Sessões

O `express-session` não usa mais o MemoryStore padrão. As sessões são armazenadas na tabela `sessions` do mesmo banco, permitindo que instâncias serverless diferentes da Vercel compartilhem a autenticação.

## Migração dos dados

Use:

```bash
node database/migrate-to-turso.js
```

O script cria as tabelas no Turso e copia os registros do SQLite local.

## Variáveis de ambiente

Na Vercel:

```text
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
SESSION_SECRET=uma-chave-aleatoria-longa
NODE_ENV=production
```

Não publique o token do Turso no GitHub.

## Entry point

A Vercel usa:

```text
api/index.js
```

com o roteamento definido em `vercel.json`.
