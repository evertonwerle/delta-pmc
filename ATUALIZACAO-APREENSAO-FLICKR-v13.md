# Atualização v13 — Registro detalhado de apreensões

- O registro de apreensão agora exige ocorrência, ID da pessoa e link da foto.
- O link pode ser do Flickr e fica salvo no SQLite.
- Gestor, Sub-Gestor e Coordenador possuem a aba administrativa APREENSÕES.
- Cada registro aparece individualmente (Apreensão 01, 02, 03...).
- Ao abrir uma apreensão, o comando vê todos os dados registrados e pode abrir a foto pelo link.
- O registro antigo permanece no banco; a migração adiciona `id_pessoa` e `imagem_url`.
- O campo legado `item` é mantido apenas para compatibilidade com registros antigos.
