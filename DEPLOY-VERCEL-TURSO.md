# DELTA — banco limpo + preparação Vercel/Turso

## Estado desta versão

- Banco de produção local: `data/delta.sqlite`.
- Somente 1 registro em `admins`: o Administrador Geral.
- `users` e dados operacionais começam vazios.
- `api/index.js` e `vercel.json` já existem para o deploy do Express na Vercel.
- `.gitignore` impede publicar `.env` e arquivos SQLite.
- `backend/.env.example` documenta as variáveis de produção.

## Importante sobre Turso

O projeto atual foi construído em torno da API síncrona `node:sqlite` (`db.get`, `db.all`, `db.run`, `db.exec`). Turso usa `@libsql/client`, cuja API é assíncrona. Portanto, não foi feita uma falsa troca de variável que pareceria usar Turso mas continuaria gravando em SQLite local.

Antes de colocar o sistema realmente em produção, a camada de banco precisa ser refatorada para `@libsql/client` e as rotas que hoje são síncronas precisam aguardar as operações. Essa é a próxima etapa técnica necessária para ter persistência real no Turso.

O arquivo `database/migrate-to-turso.js` serve para a importação inicial do SQLite limpo depois que `@libsql/client` for instalado.

## Administrador

O administrador existente foi preservado pelo hash da conta original. Não há usuários/pilotos de teste no banco novo.

Para trocar a senha antes de publicar:

`node database/reset-admin.js admin SUA_SENHA_FORTE`

## Desenvolvimento local

`cd backend`

`npm install`

`npm start`
