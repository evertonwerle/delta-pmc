# Atualização DELTA PMC

Esta atualização adiciona:
- Logo da Unidade DELTA na tela de login.
- Cada usuário comum pode enviar a inscrição somente uma vez.
- Após enviar a inscrição, a aba "Inscrição no Edital" desaparece para aquele usuário.
- A regra de inscrição única fica protegida também no backend/SQLite.
- Usuários que já tinham candidatura antes da atualização são marcados como já inscritos durante o `npm run init-db`.

## Instalação
1. Pare o servidor com `CTRL+C`.
2. Substitua os arquivos deste pacote no projeto atual.
3. NÃO apague `data/delta.sqlite`.
4. Dentro de `backend`, rode `npm install`.
5. Rode `npm run init-db`.
6. Rode `npm start`.
