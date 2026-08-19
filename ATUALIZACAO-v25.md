# DELTA PMC — v25

## Correções desta versão

### Candidaturas / etapas
- O fluxo de etapas foi reforçado visualmente.
- Candidatos aguardando a primeira etapa agora aparecem em um bloco próprio com o botão **LIBERAR 1ª ETAPA**.
- Candidatos nas etapas 1 e 2 possuem botão direto para liberar a próxima etapa.
- Na etapa 3 o candidato aparece como aguardando decisão final.
- A liberação continua respeitando a ordem 1 → 2 → 3.
- A aprovação/reprovação final continua bloqueada até a conclusão das 3 etapas.
- Ações de liberação/aprovação/reprovação continuam usando os modais personalizados do sistema.

### Permissões / operação
- GESTOR, SUB-GESTOR, COORDENADOR e ADMIN continuam com acesso administrativo.
- Esses perfis também voltam a visualizar na sidebar as funções operacionais:
  - Hall de Entrada
  - Minhas Apreensões
  - Relatórios de Ações
  - Edital
  - Inscrição/Situação quando aplicável
  - Etapas
  - Apostila
  - Manual
- Isso corrige a perda de itens da barra lateral observada na versão anterior.

### Auditoria
- Alterações de etapa, aprovação e reprovação agora também tentam registrar um log com o responsável real da ação, incluindo gestores e coordenadores.

## Banco
- Não é necessário apagar o banco.
- Não executar `init-db` para atualizar o banco de produção/teste existente.
