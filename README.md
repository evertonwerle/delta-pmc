# DELTA PMC — Hierarquia

## Hierarquia oficial
1. GESTOR
2. SUB-GESTOR
3. COORDENADOR
4. PILOTO MASTER
5. PILOTO DE ELITE
6. PILOTO ESPECIALISTA
7. PILOTO AVANÇADO
8. PILOTO ASPIRANTE
9. PILOTO PROBATORIO

## Quem pode controlar a hierarquia
Somente usuários com os cargos GESTOR, SUB-GESTOR e COORDENADOR podem acessar e alterar cargos de outros usuários.

O administrador do sistema (`admins`) também possui acesso técnico ao gerenciamento para permitir a configuração inicial da unidade.

## Usuários comuns
Todos precisam fazer login. Usuários comuns começam como PILOTO PROBATORIO e podem acessar Inscrição e Manual da Delta, além das etapas que forem liberadas para sua própria candidatura.

## Instalação/atualização
1. Pare o servidor com `CTRL+C`.
2. Substitua os arquivos do projeto pelos desta versão.
3. NÃO apague `data/delta.sqlite` se quiser manter usuários, candidaturas e administrador.
4. Dentro de `backend`, rode `npm install`.
5. Rode `npm run init-db` para aplicar a migração do cargo dos usuários.
6. Rode `npm start`.
7. Abra `http://localhost:3000`.

A migração adiciona `cargo_delta` aos usuários existentes e coloca usuários sem cargo como `PILOTO PROBATORIO`.
