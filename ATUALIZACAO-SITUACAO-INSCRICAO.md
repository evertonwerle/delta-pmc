# Atualização — Situação da Inscrição

## O que foi adicionado
- Usuários que já enviaram candidatura passam a ver a aba **Situação da Inscrição**.
- A aba mostra nome do candidato, status, progresso das Etapas 1, 2 e 3 e mensagens de acompanhamento.
- O status é consultado automaticamente a cada 5 segundos enquanto o usuário estiver logado.
- Ao concluir as 3 etapas, a tela informa que a candidatura aguarda a decisão do Comando.
- Ao ser aprovado, informa que o cargo foi definido como PILOTO PROBATORIO.
- Ao ser reprovado, informa a reprovação.
- A aba não aparece para usuários que ainda não possuem candidatura.
- A página usa `/api/candidaturas/minha`, portanto cada usuário só consulta a própria candidatura.

## Instalação
Não apagar `data/delta.sqlite`.
Substituir os arquivos do projeto pela versão atualizada e iniciar normalmente com `npm start`.
Não é necessário recriar o administrador.
