# Correção — Apreensões e botões de exclusão

## Apreensões de pilotos
- PILOTO PROBATORIO e demais cargos de piloto passam a ser reconhecidos como usuários operacionais ativos pelo middleware.
- `POST /api/hall/apreensoes` continua protegido e grava a apreensão no banco do usuário logado.
- O frontend mostra erro HTTP/servidor de forma explícita e bloqueia cliques duplicados durante o salvamento.

## Exclusões auditadas
Foram revisadas as chamadas DELETE do frontend e as rotas DELETE do backend para:
- candidaturas
- usuários/pilotos da hierarquia
- documentos
- conteúdo dos módulos/portal
- VTRs
- advertências
- badges
- itens de fardamento
- relatórios de ações

GESTOR, SUB-GESTOR e COORDENADOR agora têm as permissões de gerenciamento solicitadas, inclusive exclusão onde o painel exibe o botão.

## Teste de integração
Foi criado um banco SQLite temporário e testado um COORDENADOR autenticado contra as rotas DELETE. As operações testadas retornaram HTTP 200:
- VTR
- advertência
- badge
- fardamento
- relatório
- conteúdo de portal
- documento
- candidatura
- usuário/piloto da hierarquia

Também foi testado um PILOTO PROBATORIO autenticado:
- `GET /api/hall/resumo` → HTTP 200
- `POST /api/hall/apreensoes` → HTTP 201
- tentativa de exclusão de VTR pelo piloto → HTTP 403

O teste usou banco temporário e não altera o Turso do projeto.
