# DELTA PMC — Painel Administrativo Completo v22

Esta versão evolui a base existente, sem apagar o banco atual.

## Novidades
- Dashboard administrativa com dados reais do SQLite.
- Central de Administração com Usuários, Ponto/Horas, Logs/Auditoria, Ações Fechadas e Fardamento.
- Gestão de usuários e perfil administrativo completo.
- Histórico de alterações de cargo.
- Logs de auditoria.
- Relatórios de Ações Fechadas persistidos em tabelas próprias.
- Filtros e consultas de ponto.
- CRUD de peças de fardamento com imagem, categoria e descrição.
- Relatórios disponíveis para pilotos/comando conforme a permissão.
- Modal administrativo para confirmações; não usa window.alert/window.confirm nas funções novas.
- Banimento permanente funcional no backend.

## Atualização
1. Pare o servidor com CTRL+C.
2. Extraia esta versão por cima da versão atual.
3. Preserve `data/delta.sqlite` se quiser manter os dados de teste existentes.
4. Execute:

```cmd
cd backend
npm install
npm start
```

Não apague o banco para atualizar esta versão. As tabelas novas são criadas automaticamente por migração incremental quando o backend inicia.

## Observação
O ZIP não contém `node_modules` nem `data/delta.sqlite`, para evitar carregar dependências ou dados locais do ambiente de teste. O banco existente permanece intacto quando você extrai os arquivos por cima.
