# DELTA PMC — Organização e Permissões v25

## Objetivo
Reorganizar os módulos inspirados no Discord, remover acessos indevidos e garantir que as APIs também validem o papel do usuário.

## Matriz de acesso

### Administrador geral
- Painel administrativo
- Comunicados
- Avisos de curso
- Documentação administrativa
- Promovidos
- Advertências
- Desligamentos
- Bate-ponto administrativo
- Ausências administrativas
- Badges administrativos
- Usuários, hierarquia, pilotos, apreensões, logs, conteúdo e relatórios pelo painel

O administrador geral não recebe funções operacionais de piloto que dependam de um usuário-piloto vinculado.

### Gestor / Sub-Gestor / Coordenador
- Tudo do painel administrativo
- Funções operacionais de piloto: Hall, próprias apreensões, ponto, relatórios, manual e áreas operacionais
- Gestor e Sub-Gestor: edição dos módulos de conteúdo
- Coordenador: gerenciamento operacional/hierárquico permitido, sem edição de conteúdo restrito a Gestor/Sub-Gestor

### Piloto aprovado
- Hall de Entrada
- Minhas Apreensões
- Relatórios de Ações Fechadas
- Manual da Delta
- Uniforme
- VTRs / Carros
- Localizações
- Liberação DELTA
- Sugestões

### Usuário em processo seletivo
- Edital
- Inscrição, enquanto permitido
- Situação da inscrição
- Apostila de estudo
- Etapas liberadas
- Sugestões

## Correções de integração
- APIs de VTR, advertências, desligamentos, ausências, badges e fardamento passaram a validar o nível de acesso no backend.
- Conta exonerada não é mais considerada operacionalmente aprovada apenas porque possui uma candidatura histórica aprovada.
- O menu Discord é recalculado após o login, evitando ficar escondido ou mostrar módulos incorretos.
- O administrador geral não recebe links de funções operacionais que exigem uma conta-piloto.
- Bate-ponto administrativo abre o controle administrativo para o Comando e o Hall para pilotos.

## Novos módulos funcionais
- Comunicados
- Avisos de Curso
- Localizações
- Liberação DELTA
- Sugestões persistentes

Esses conteúdos possuem armazenamento próprio no SQLite e ações administrativas geram logs.

## Banco
As tabelas-base agora são verificadas automaticamente na inicialização do módulo de banco antes das migrações incrementais. Isso melhora a instalação em banco novo sem apagar bancos existentes.
