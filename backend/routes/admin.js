const express = require('express');
const db = require('../database');
const adminAuth = require('../middleware/auth').isAdminOrManager;
const router = express.Router();

async function can(req){ return adminAuth(req); }
function actor(req){
  if(req.session?.admin) return {tipo:'ADMINISTRADOR', id:Number(req.session.admin.id)||null, nome:req.session.admin.nome||req.session.admin.username||'Administrador'};
  return {tipo:String(req.session?.user?.cargo||'COMANDO').toUpperCase(), id:Number(req.session?.user?.id)||null, nome:req.session?.user?.nome||req.session?.user?.username||'Comando'};
}
async function log(req, acao, entidade, entidadeId, detalhes=''){
  const a=actor(req);
  await db.run(`INSERT INTO logs_sistema (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?,?,?)`,[a.tipo,a.id,a.nome,acao,entidade,entidadeId||null,detalhes]);
}
router.get('/overview',async (req,res)=>{
  if(!await can(req)) return res.status(403).json({erro:'Acesso administrativo negado.'});
  try{
    const q=async s=>Number((await db.get(s))?.total||0);
    const cargos=await db.all(`SELECT cargo_delta cargo,COUNT(*) total FROM users WHERE ativo=1 GROUP BY cargo_delta ORDER BY CASE cargo_delta WHEN 'GESTOR' THEN 1 WHEN 'SUB-GESTOR' THEN 2 WHEN 'COORDENADOR' THEN 3 WHEN 'PILOTO MASTER' THEN 4 WHEN 'PILOTO DE ELITE' THEN 5 WHEN 'PILOTO ESPECIALISTA' THEN 6 WHEN 'PILOTO AVANÇADO' THEN 7 WHEN 'PILOTO ASPIRANTE' THEN 8 WHEN 'PILOTO PROBATORIO' THEN 9 ELSE 10 END`);
    const stats={
      usuarios:await q(`SELECT COUNT(*) total FROM users`),
      candidatos:await q(`SELECT COUNT(*) total FROM candidaturas WHERE status IN ('PENDENTE','APROVADO','REPROVADO')`),
      emAnalise:await q(`SELECT COUNT(*) total FROM candidaturas WHERE status='PENDENTE'`),
      aprovados:await q(`SELECT COUNT(*) total FROM candidaturas WHERE status='APROVADO'`),
      reprovados:await q(`SELECT COUNT(*) total FROM candidaturas WHERE status='REPROVADO'`),
      pilotosAtivos:await q(`SELECT COUNT(*) total FROM users WHERE ativo=1 AND cargo_delta NOT IN ('GESTOR','SUB-GESTOR','COORDENADOR')`),
      afastados:await q(`SELECT COUNT(*) total FROM membros WHERE status='AFASTADO'`),
      exonerados:await q(`SELECT COUNT(*) total FROM exoneracoes`),
      apreensoes:await q(`SELECT COUNT(*) total FROM apreensoes`),
      horasSegundos:Number(await db.get(`SELECT COALESCE(SUM(CASE WHEN saida IS NULL THEN (julianday('now')-julianday(entrada))*86400 ELSE (julianday(saida)-julianday(entrada))*86400 END),0) total FROM pontos`)?.total||0),
      acoesFechadas:await q(`SELECT COUNT(*) total FROM relatorios_acoes`)
    };
    const recentes=await db.all(`SELECT id,usuario_nome,acao,entidade,entidade_id,detalhes,criado_em FROM logs_sistema ORDER BY id DESC LIMIT 12`);
    const usuarios=await db.all(`SELECT id,nome,username,cargo_delta,ativo,status_conta,criado_em,ultimo_login FROM users ORDER BY id DESC LIMIT 8`);
    const candidaturas=await db.all(`SELECT c.id,c.personagem,c.id_jogador,c.status,c.etapa_liberada,c.criado_em,u.nome FROM candidaturas c LEFT JOIN users u ON u.id=c.usuario_id ORDER BY c.id DESC LIMIT 8`);
    const exon=await db.all(`SELECT id,nome,cargo_no_momento,nivel,motivo,ocorrido_em FROM exoneracoes ORDER BY id DESC LIMIT 8`);
    res.json({stats,cargos,recentes,usuarios,candidaturas,exoneracoes:exon});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível carregar a dashboard administrativa.'});}
});

router.get('/usuarios',async (req,res)=>{
  if(!await can(req)) return res.status(403).json({erro:'Acesso administrativo negado.'});
  try{
    const busca=String(req.query.busca||'').trim(); const cargo=String(req.query.cargo||'').trim(); const status=String(req.query.status||'').trim();
    let sql=`SELECT u.id,u.username,u.nome,u.cargo_delta,u.ativo,u.status_conta,u.criado_em,u.ultimo_login,u.inscricao_enviada,
      (SELECT COUNT(*) FROM apreensoes a WHERE a.usuario_id=u.id) total_apreensoes,
      (SELECT COUNT(*) FROM pontos p WHERE p.usuario_id=u.id) registros_ponto,
      (SELECT COUNT(*) FROM candidaturas c WHERE c.usuario_id=u.id) candidaturas
      FROM users u WHERE 1=1`; const p=[];
    if(busca){sql+=` AND (u.nome LIKE ? OR u.username LIKE ? OR CAST(u.id AS TEXT) LIKE ?)`;p.push(`%${busca}%`,`%${busca}%`,`%${busca}%`)}
    if(cargo){sql+=` AND u.cargo_delta=?`;p.push(cargo)}
    if(status==='ATIVO') sql+=` AND u.ativo=1`;
    if(status==='INATIVO') sql+=` AND u.ativo=0`;
    sql+=` ORDER BY u.id DESC`;
    res.json({usuarios:await db.all(sql,p)});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível carregar usuários.'});}
});

router.get('/usuarios/:id',async (req,res)=>{
  if(!await can(req)) return res.status(403).json({erro:'Acesso administrativo negado.'});
  try{
    const id=Number(req.params.id); const u=await db.get(`SELECT id,username,nome,cargo_delta,ativo,status_conta,criado_em,ultimo_login,inscricao_enviada FROM users WHERE id=?`,[id]);
    if(!u) return res.status(404).json({erro:'Usuário não encontrado.'});
    const candidaturas=await db.all(`SELECT * FROM candidaturas_historico WHERE usuario_id=? ORDER BY id DESC`,[id]);
    const atuais=await db.all(`SELECT id,personagem,id_jogador,patente,etapa,etapa_liberada,status,observacao,criado_em,atualizado_em FROM candidaturas WHERE usuario_id=? ORDER BY id DESC`,[id]);
    const cargos=await db.all(`SELECT * FROM historico_cargos WHERE usuario_id=? ORDER BY id DESC`,[id]);
    const exoneracoes=await db.all(`SELECT * FROM exoneracoes WHERE usuario_id=? ORDER BY id DESC`,[id]);
    const apreensoes=await db.all(`SELECT * FROM apreensoes WHERE usuario_id=? ORDER BY id DESC`,[id]);
    const pontos=await db.all(`SELECT id,entrada,saida,ROUND(CASE WHEN saida IS NULL THEN (julianday('now')-julianday(entrada))*86400 ELSE (julianday(saida)-julianday(entrada))*86400 END,0) segundos FROM pontos WHERE usuario_id=? ORDER BY id DESC`,[id]);
    const logs=await db.all(`SELECT * FROM logs_sistema WHERE usuario_id=? ORDER BY id DESC LIMIT 100`,[id]);
    res.json({usuario:u,candidaturas,atuais,cargos,exoneracoes,apreensoes,pontos,logs});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível carregar o perfil.'});}
});


// Rota autoritativa para alteração de cargo pelo painel administrativo.
// Esta rota existe separadamente da rota de hierarquia para evitar que
// regras/cache de versões anteriores do painel impeçam o Administrador Geral
// de persistir o cargo no SQLite.
async function salvarCargoAdmin(req, res) {
  if (!await can(req)) return res.status(403).json({ sucesso:false, erro:'Acesso administrativo negado.' });
  const id = Number(req.params.id);
  const cargo = String(req.body?.cargo || '').trim().toUpperCase();
  const cargos = ['GESTOR','SUB-GESTOR','COORDENADOR','PILOTO MASTER','PILOTO DE ELITE','PILOTO ESPECIALISTA','PILOTO AVANÇADO','PILOTO ASPIRANTE','PILOTO PROBATORIO','CANDIDATO'];
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ sucesso:false, erro:'ID de usuário inválido.' });
  if (!cargos.includes(cargo)) return res.status(400).json({ sucesso:false, erro:`Cargo inválido: ${cargo || '(vazio)'}.` });

  try {
    const antes = await db.get('SELECT id,username,nome,cargo_delta,ativo,status_conta FROM users WHERE id=? LIMIT 1',[id]);
    if (!antes) return res.status(404).json({ sucesso:false, erro:'Usuário não encontrado.' });

    // Cargo de comando sempre deixa a conta ativa. Isso evita a situação em
    // que o cargo é salvo, mas a conta continua bloqueada/inativa.
    const ativo = 1;
    const status = 'ATIVA';

    // Operação mínima e direta no SQLite. Não vinculamos a persistência do
    // cargo à auditoria: o UPDATE é a operação principal.
    const result = await db.run(
      'UPDATE users SET cargo_delta=?, ativo=?, status_conta=? WHERE id=?',
      [cargo, ativo, status, id]
    );

    if (!result || Number(result.changes || 0) !== 1) {
      return res.status(500).json({ sucesso:false, persistido:false, erro:'O SQLite não confirmou a alteração do usuário.' });
    }

    const depois = await db.get('SELECT id,username,nome,cargo_delta,ativo,status_conta FROM users WHERE id=? LIMIT 1',[id]);
    if (!depois || String(depois.cargo_delta || '').trim().toUpperCase() !== cargo) {
      return res.status(500).json({ sucesso:false, persistido:false, erro:'O cargo não foi confirmado pelo SQLite após a gravação.' });
    }

    // Histórico e log são secundários. Se algum deles falhar, o cargo já está
    // persistido e não deve ser revertido.
    try {
      if (String(antes.cargo_delta || '').trim().toUpperCase() !== cargo) {
        await db.run(`INSERT INTO historico_cargos
          (usuario_id,cargo_anterior,cargo_novo,justificativa,responsavel_tipo,responsavel_id)
          VALUES (?,?,?,?,?,?)`,
          [id, antes.cargo_delta || null, cargo, String(req.body?.justificativa || '').trim(), 'ADMINISTRADOR', Number(req.session.admin?.id) || null]
        );
      }
      await log(req,'ALTERAÇÃO DE CARGO','USUARIO',id,`${antes.cargo_delta || 'SEM CARGO'} → ${cargo}`);
    } catch (auditError) {
      console.error('[ADMIN] Cargo salvo; falha secundária no histórico/log:', auditError);
    }

    res.set('X-Delta-DB-Path', db.dbPath);
    res.set('X-Delta-DB-Path', db.dbPath);
    return res.json({
      sucesso:true,
      persistido:true,
      confirmado:true,
      mensagem:`Cargo de ${depois.nome || depois.username} salvo como ${cargo}.`,
      usuario:depois
    });
  } catch (error) {
    console.error('[ADMIN] Erro ao salvar cargo:', error);
    return res.status(500).json({ sucesso:false, persistido:false, erro:`Falha ao salvar cargo no SQLite: ${error.message}` });
  }
}

// GET de confirmação: consulta diretamente o mesmo SQLite usado pelo backend.
router.get('/usuarios/:id/cargo',async (req,res)=>{
  if (!await can(req)) return res.status(403).json({sucesso:false,erro:'Acesso administrativo negado.'});
  const id=Number(req.params.id);
  const usuario=await db.get('SELECT id,username,nome,cargo_delta,ativo,status_conta FROM users WHERE id=? LIMIT 1',[id]);
  if(!usuario) return res.status(404).json({sucesso:false,erro:'Usuário não encontrado.'});
  res.json({sucesso:true,persistido:true,usuario});
});
router.put('/usuarios/:id/cargo', salvarCargoAdmin);
router.patch('/usuarios/:id/cargo', salvarCargoAdmin);
router.post('/usuarios/:id/cargo', salvarCargoAdmin);

router.patch('/usuarios/:id',async (req,res)=>{
  if(!await can(req)) return res.status(403).json({erro:'Acesso administrativo negado.'});
  try{
    const id=Number(req.params.id), u=await db.get(`SELECT * FROM users WHERE id=?`,[id]); if(!u)return res.status(404).json({erro:'Usuário não encontrado.'});
    const nome=req.body?.nome!==undefined?String(req.body.nome).trim():u.nome; const ativo=req.body?.ativo===undefined?u.ativo:(req.body.ativo?1:0);
    if(nome.length<2)return res.status(400).json({erro:'Nome inválido.'});
    await db.run(`UPDATE users SET nome=?,ativo=? WHERE id=?`,[nome,ativo,id]);
    await log(req,'ALTERAÇÃO DE USUÁRIO','USUARIO',id,`Nome/status atualizados: ${nome} / ${ativo?'ATIVO':'INATIVO'}`);
    res.json({sucesso:true,mensagem:'Usuário atualizado.'});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível atualizar o usuário.'});}
});

router.get('/logs',async (req,res)=>{
  if(!await can(req)) return res.status(403).json({erro:'Acesso administrativo negado.'});
  try{
    const busca=String(req.query.busca||'').trim(), acao=String(req.query.acao||'').trim(); let sql=`SELECT * FROM logs_sistema WHERE 1=1`,p=[];
    if(busca){sql+=` AND (usuario_nome LIKE ? OR acao LIKE ? OR entidade LIKE ? OR detalhes LIKE ?)`;const b=`%${busca}%`;p.push(b,b,b,b)}
    if(acao){sql+=` AND acao=?`;p.push(acao)} sql+=` ORDER BY id DESC LIMIT 300`;
    res.json({logs:await db.all(sql,p)});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível carregar os logs.'});}
});

router.get('/ponto',async (req,res)=>{
  if(!await can(req)) return res.status(403).json({erro:'Acesso administrativo negado.'});
  try{
    const piloto=String(req.query.piloto||'').trim(), inicio=String(req.query.inicio||'').trim(), fim=String(req.query.fim||'').trim(); let sql=`SELECT p.id,p.usuario_id,p.entrada,p.saida,u.nome,u.username,u.cargo_delta,ROUND(CASE WHEN p.saida IS NULL THEN (julianday('now')-julianday(p.entrada))*86400 ELSE (julianday(p.saida)-julianday(p.entrada))*86400 END,0) segundos FROM pontos p JOIN users u ON u.id=p.usuario_id WHERE 1=1`;let ps=[];
    if(piloto){sql+=` AND (u.nome LIKE ? OR u.username LIKE ? OR CAST(u.id AS TEXT)=?)`;ps.push(`%${piloto}%`,`%${piloto}%`,piloto)}
    if(inicio){sql+=` AND date(p.entrada)>=date(?)`;ps.push(inicio)} if(fim){sql+=` AND date(p.entrada)<=date(?)`;ps.push(fim)} sql+=` ORDER BY p.id DESC LIMIT 500`;
    const registros=await db.all(sql,ps); const total=registros.reduce((s,r)=>s+Number(r.segundos||0),0); res.json({registros,total_segundos:Math.round(total)});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível carregar o ponto.'});}
});
module.exports={router,log};
