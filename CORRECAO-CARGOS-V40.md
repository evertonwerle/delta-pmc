# DELTA — Correção V40 do sistema de cargos

## O que foi alterado

A alteração de cargo do painel administrativo passou a usar uma rota administrativa própria e autoritativa:

- `PUT /api/admin/usuarios/:id/cargo`
- `PATCH /api/admin/usuarios/:id/cargo`
- `POST /api/admin/usuarios/:id/cargo`
- `GET /api/admin/usuarios/:id/cargo` para confirmação

O Administrador Geral não depende mais da rota de hierarquia para salvar cargos.

## Persistência

O backend:

1. valida o ID e o cargo;
2. executa `UPDATE users` diretamente no SQLite;
3. exige que o SQLite informe exatamente 1 registro alterado;
4. consulta o mesmo registro novamente;
5. somente retorna sucesso se `cargo_delta` estiver igual ao cargo solicitado;
6. registra histórico e log separadamente, sem permitir que uma falha de auditoria desfaça o cargo salvo.

Cargos administrativos também deixam a conta ativa (`ativo = 1`, `status_conta = ATIVA`).

## Frontend

As abas **Hierarquia** e **Usuários** agora usam a rota administrativa autoritativa. Depois do salvamento, o frontend consulta novamente o banco pela API antes de mostrar sucesso e recarrega a tabela.

## Importante

Substitua os arquivos do projeto, mas mantenha o seu `data/delta.sqlite`. Não recrie o banco se ele já possui os dados que deseja preservar.
