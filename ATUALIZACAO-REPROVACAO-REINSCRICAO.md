# Atualização — Reprovação e nova inscrição

- Candidato REPROVADO é removido da tabela de candidaturas ativas.
- A decisão fica preservada em `candidaturas_historico` como `REPROVADO`.
- `users.inscricao_enviada` volta para 0, liberando nova inscrição para a mesma conta.
- Ao DELETAR uma candidatura pelo painel, ela também vai para `candidaturas_historico` como `DELETADA` e a conta é liberada para novo edital.
- A lista de candidaturas ativas exibe somente candidatos PENDENTES.
- A situação/etapas somem quando não há candidatura ativa; a aba Inscrição volta a aparecer.
- A exclusão definitiva de um piloto aprovado pela Hierarquia continua sendo exclusão da conta; nesse caso o usuário precisa criar uma nova conta para participar novamente.
