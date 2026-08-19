# DELTA — Atualização v28

- Corrigida a liberação de etapas para Gestor/Sub-Gestor/Coordenador: o responsável do histórico não tenta mais gravar ID de usuário em FK de admins; a ação continua registrada nos logs.
- Corrigida exclusão de itens do catálogo de fardamento com validação, resposta 404 e log de auditoria.
- Restaurada/expandida a navegação lateral em categorias inspiradas na organização enviada do Discord.
- Adicionados canais: Comunicados, Avisos de Curso, Documentação, Promovidos, Advertências, Desligamento, Bate-Ponto, Badges, Localizações, Sugestões, Liberação-DELTA, Uniforme, Chat-Pilotos, Bate-Papo, Ausência, Apreensões e Ações-Fechadas.
- VTRs / Carros permanece como página operacional própria e foi posicionada na seção Informações Gerais.
- Criados/migrados os recursos persistentes necessários para portal, sugestões, advertências, ausências, badges e mensagens dos canais.
- Montado o endpoint `/api/portal`, que estava faltando no servidor.
- Adicionado chat persistente para Chat-Pilotos e Bate-Papo.
- A seção Atividade Recente do dashboard ficou ainda mais compacta, com rolagem interna.
- Removidos prompts nativos das novas telas de conteúdo; edição usa modal do próprio site.
- Frontend e `index.html` da raiz sincronizados.

O pacote não inclui `node_modules` nem `data/delta.sqlite` para não substituir o banco local existente.
