# Atualização — Manual da Delta e Apostila de Estudo

## Novas regras
- **Manual da Delta:** somente usuários com candidatura **APROVADA**. Usuários administrativos (ADMIN, GESTOR, SUB-GESTOR e COORDENADOR) continuam podendo visualizar para administrar o portal.
- **Apostila de Estudo:** aparece para usuários comuns que já enviaram candidatura e ainda não foram aprovados. Serve como material de preparação.
- Quando a candidatura passa para **APROVADO**, a Apostila deixa de aparecer e o **Manual da Delta** passa a aparecer automaticamente.
- A troca é atualizada automaticamente enquanto o usuário está logado.

## Edição
- GESTOR e SUB-GESTOR, além do Administrador Geral, podem adicionar, editar e excluir tópicos da Apostila.
- A Apostila usa a mesma interface de edição contextual do Manual: lápis, adicionar tópico e exclusão.
- O conteúdo fica salvo no SQLite.

## Atualização
Não apague `data/delta.sqlite`. Na pasta `backend` execute `npm install` e depois `npm run init-db`. O `init-db` cria os tópicos padrão da Apostila apenas se ainda não existirem.
