# Atualização — acesso administrativo para Gestor, Sub-Gestor e Coordenador

Agora GESTOR, SUB-GESTOR e COORDENADOR têm acesso ao painel completo, como o Administrador Geral, incluindo:
- Candidaturas
- Deletar inscritos
- Hierarquia
- Editar conteúdo (Manual e Etapas 1, 2 e 3)
- Dashboard e demais abas administrativas

A proteção também foi aplicada no backend: as rotas administrativas que usam o middleware de administração aceitam o administrador do sistema ou os três cargos superiores.

Não apague `data/delta.sqlite`.
