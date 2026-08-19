# V41 — Correção da raiz do problema de cargos

## Problema encontrado
O projeto continha mais de um SQLite dentro da pasta `data`. O backend estava fixado em `data/delta.sqlite`, enquanto o banco com os usuários/cargos usados no ambiente de teste estava em outra cópia (`delta3333.sqlite`).

Por isso o painel podia enviar a alteração para um banco e o usuário continuar sendo lido de outro banco. Nenhuma quantidade de mudanças no botão, rota ou sessão corrigiria isso enquanto o backend estivesse apontando para o arquivo errado.

## Correção
`backend/database.js` agora:
- aceita `DELTA_DB_PATH` para definir o banco explicitamente;
- detecta bancos existentes;
- quando há múltiplas cópias, escolhe o banco com maior quantidade de dados de aplicação;
- mantém `delta.sqlite` como padrão em instalações novas;
- não apaga nem mescla bancos.

O servidor também imprime o caminho absoluto do banco ativo no console.

## Cargo
As correções de cargo das versões anteriores permanecem. Agora elas operam sobre o mesmo SQLite que o login, hierarquia, permissões e dashboard utilizam.
