# Atualização — CANDIDATO, permissões de pilotos e desligamentos

## Cargos
A hierarquia agora inclui `CANDIDATO` abaixo de `PILOTO PROBATORIO`.
Novas contas começam como CANDIDATO e uma candidatura enviada permanece como CANDIDATO até a aprovação final.

## Pilotos
`PILOTO PROBATORIO`, `PILOTO ASPIRANTE`, `PILOTO AVANÇADO`, `PILOTO ESPECIALISTA`, `PILOTO DE ELITE` e `PILOTO MASTER` são tratados como cargos operacionais de piloto.
Eles recebem as abas operacionais, Manual e demais recursos de piloto, mas não recebem acesso administrativo nem podem editar conteúdo.

## Etapas
Foi criada uma rota específica `PATCH /api/candidaturas/:id/liberar-etapa` para liberar as etapas em ordem (1, 2 e 3), com confirmação no banco.

## Exoneração
A exoneração continua registrada na tabela `exoneracoes`, com nível, motivo, responsável e data.
A área Hierarquia ganhou a subseção Desligamentos, que consulta todos os registros para usuários autenticados.

## Banco
A migração do `init-db.js` trata contas antigas sem candidatura aprovada que ainda estejam como PILOTO PROBATORIO como CANDIDATO. Pilotos com candidatura aprovada são preservados.
