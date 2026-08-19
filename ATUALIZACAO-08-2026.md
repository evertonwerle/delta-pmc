# Atualização — conteúdo, edital e candidaturas

- GESTOR e SUB-GESTOR: podem editar/adicionar/excluir tópicos do Manual, editar o Edital e editar Etapas 1, 2 e 3.
- COORDENADOR: mantém acesso administrativo, mas não pode alterar conteúdo.
- Administrador Geral: mantém acesso total.
- Novo ícone de lápis dentro do Manual e do Edital para edição contextual.
- Exclusão de tópicos do Manual com confirmação.
- Edital passou a ser armazenado no SQLite e suas abas podem ser editadas.
- Ao concluir a Etapa 3 com status APROVADO, a conta vinculada é definida automaticamente como PILOTO PROBATORIO.
- Painel de candidaturas ganhou um fluxo visual por Etapa 1, 2 e 3.
- `npm run init-db` cria os 10 itens do Edital apenas se eles ainda não existirem.
