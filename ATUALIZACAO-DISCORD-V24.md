# DELTA PMC — Atualização v24 — Estrutura baseada no Discord

Esta versão reorganiza a navegação do portal tomando como referência a estrutura enviada do Discord.

## Administrativo
- Comunicados
- Avisos de Curso
- Documentação
- Promovidos
- Advertências
- Desligamento
- Bate-Ponto
- Ausências
- Badges

## Informações Gerais
- Localizações
- Sugestões
- Liberação-DELTA
- Uniforme
- VTRs / Carros

## Funcionalidades novas persistentes
- VTRs: cadastro, edição, status e observações.
- Advertências: registro vinculado ao usuário, nível, motivo, observações e responsável.
- Ausências: registro por piloto, início, fim, motivo, observações e status.
- Badges: concessão vinculada ao piloto, descrição e imagem.
- Desligamentos: consulta do histórico já existente de exonerações.

As novas tabelas são criadas por migração incremental no backend e não apagam o SQLite existente.

As áreas informativas como Comunicados, Avisos, Localizações e Liberação-DELTA foram adicionadas à navegação para refletir a estrutura do Discord; o conteúdo específico dessas áreas pode ser conectado aos módulos de conteúdo na próxima etapa.

Não substituir `data/delta.sqlite` por outro banco se quiser preservar os dados de teste atuais.
