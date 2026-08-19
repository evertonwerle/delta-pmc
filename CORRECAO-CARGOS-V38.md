# Correção V38 — Persistência de cargos

- Corrigida a rotina PATCH `/api/hierarquia/usuarios/:id` para confirmar a alteração diretamente no SQLite.
- O endpoint agora retorna `persistido: true` somente depois de confirmar `cargo_delta` no banco.
- Erros de auditoria/histórico não fazem uma alteração de cargo válida parecer que falhou.
- A interface agora mostra o erro HTTP retornado pelo backend e só recarrega a tabela depois de receber confirmação de persistência.
- O botão SALVAR da hierarquia passou a ser explicitamente `type="button"` para não disparar submit/reload acidental.
- O botão mostra `SALVANDO...` durante a requisição e volta ao estado normal após a conclusão.
- A proteção contra autoalteração de cargo por conta de usuário continua ativa; alterações de terceiros devem ser feitas por Administrador, Gestor, Sub-Gestor ou Coordenador conforme as permissões do sistema.
