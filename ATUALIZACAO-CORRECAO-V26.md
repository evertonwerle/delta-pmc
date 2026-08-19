# DELTA PMC — Correção de estabilidade e integração V26

## Correções principais

- Corrigido um erro crítico no `frontend/index.html`: algumas funções JavaScript estavam fora de uma tag `<script>`, fazendo o navegador exibir o código bruto no rodapé da página e deixando funções como o controle de ponto indisponíveis.
- Corrigida a consulta SQL do módulo de apreensões administrativas, que possuía um `LEFT JOIN` duplicado e fazia o endpoint falhar.
- O módulo administrativo de apreensões agora mantém o histórico mesmo quando o responsável deixa de estar ativo.
- O carregamento da dashboard administrativa deixou de usar seletores genéricos que podiam sobrescrever cards de outros módulos.
- Indicadores administrativos de pilotos ativos e desligamentos passaram a consultar diretamente as tabelas usadas pelo sistema de usuários/exonerações.
- Coordenadores passaram a respeitar a permissão de edição de conteúdo definida para o painel administrativo.
- Exclusões de fardamento, VTRs, advertências e badges agora verificam se o registro realmente existe antes de responder sucesso.
- Banimento permanente encerra também uma candidatura ativa, preservando o registro no histórico.
- O `index.html` da raiz foi sincronizado com `frontend/index.html`, evitando que uma hospedagem que use a raiz apresente uma versão antiga do sistema.

## Banco de dados

Nenhum banco existente é apagado pela atualização. O projeto continua utilizando migrações e `CREATE TABLE IF NOT EXISTS`.

Para uma instalação nova:

1. `cd backend`
2. `npm install`
3. `cd ..`
4. `node database/init-db.js`
5. `node database/create-admin.js comando.delta SUA_SENHA "Comando Delta" "Administrador"`
6. `cd backend`
7. `npm start`

## Importante para produção

- Defina uma `SESSION_SECRET` forte no `.env`.
- Use HTTPS em produção.
- Não reutilize senhas de teste.
- Não publique o banco SQLite de testes com dados reais.
