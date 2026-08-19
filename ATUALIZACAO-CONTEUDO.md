# Atualização — Editor do Manual e Etapas

Nesta versão, GESTOR, SUB-GESTOR e COORDENADOR podem:
- criar novas abas no Manual da Delta;
- editar, reordenar e excluir abas do Manual;
- editar o título e o texto das Etapas 1, 2 e 3;
- as alterações aparecem para os usuários sem editar o HTML manualmente.

O backend também protege as rotas: usuários comuns não podem alterar o conteúdo.

## Atualização
1. Pare o servidor com CTRL+C.
2. Substitua os arquivos do projeto pelos desta pasta.
3. NÃO apague `data/delta.sqlite`.
4. Entre em `backend` e rode `npm install`.
5. Rode `npm run init-db`.
6. Rode `npm start`.
