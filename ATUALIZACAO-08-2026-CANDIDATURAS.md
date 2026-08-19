# Atualização — Edital e decisão final das candidaturas

## Edital da Unidade Delta
- Gestor e Sub-Gestor podem adicionar novos tópicos pelo botão `+ ADICIONAR TÓPICO` dentro do Edital.
- O tópico selecionado pode ser editado pelo lápis/edição contextual.
- A criação continua protegida no backend.

## Candidaturas
- O painel mostra apenas candidatos que não possuem cargo GESTOR, SUB-GESTOR ou COORDENADOR.
- A liberação das etapas é sequencial: 1, depois 2, depois 3.
- Liberar uma etapa não aprova automaticamente o candidato.
- Depois da Etapa 3, Gestor, Sub-Gestor e Coordenador (e o Administrador Geral) podem escolher `APROVAR` ou `REPROVAR`.
- A API também bloqueia aprovação/reprovação antes da conclusão das 3 etapas.
- Quando aprovado após a Etapa 3, o usuário é automaticamente definido como `PILOTO PROBATORIO`.

## Banco
Não foi adicionada nenhuma tabela nova nesta atualização. O banco SQLite existente pode ser mantido.
