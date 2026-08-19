# Correção - Gestor / Sub-Gestor / Coordenador

Esta versão corrige o painel administrativo para GESTOR, SUB-GESTOR e COORDENADOR.

Correções:
- cargo do usuário é sincronizado com o SQLite em cada requisição administrativa;
- gestores podem alternar entre todas as abas administrativas;
- Hierarquia e Editor de Conteúdo carregam imediatamente;
- criação/edição/exclusão de conteúdo usa a API protegida;
- ações de candidatura feitas por gestores não tentam gravar o ID do gestor na coluna reservada a admins;
- Administrador Geral continua com acesso completo.

IMPORTANTE: preserve seu arquivo `data/delta.sqlite` atual.

Depois de substituir os arquivos, dentro de `backend`:
1. `npm install`
2. `npm run init-db`
3. `npm start`
