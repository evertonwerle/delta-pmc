const express = require('express');
const db = require('../database');
const requireLogin = require('../middleware/login');
const hierarchyAuth = require('../middleware/hierarchy');
const {requireApprovedOrCommand,requireCommand,isCommand}=require('../middleware/access');

const router = express.Router();
const managers = hierarchyAuth;
function actor(req){
  if(req.session.admin) return {tipo:'ADMINISTRADOR',id:req.session.admin.id,nome:req.session.admin.nome||req.session.admin.username};
  return {tipo:String(req.session.user?.cargo||'USUARIO').toUpperCase(),id:req.session.user?.id||null,nome:req.session.user?.nome||req.session.user?.username||''};
}
async function log(req, acao, entidade, id, detalhes=''){
  const a=actor(req);
  await db.run(`INSERT INTO logs_sistema (usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes) VALUES (?,?,?,?,?,?,?)`,[a.tipo,a.id,a.nome,acao,entidade,id||null,detalhes]);
}

// VTRs — administração de viaturas
router.get('/vtrs', requireApprovedOrCommand, async (req,res)=>res.json({vtrs:await db.all(`SELECT * FROM vtrs ORDER BY id DESC`)}));
router.post('/vtrs', managers, async (req,res)=>{
  const b=req.body||{};
  if(!String(b.prefixo||'').trim()||!String(b.modelo||'').trim()) return res.status(400).json({erro:'Prefixo e modelo são obrigatórios.'});
  const r=await db.run(`INSERT INTO vtrs(prefixo,modelo,placa,status,observacoes) VALUES(?,?,?,?,?)`,[String(b.prefixo).trim(),String(b.modelo).trim(),String(b.placa||'').trim(),String(b.status||'DISPONIVEL').trim(),String(b.observacoes||'').trim()]);
  await log(req,'CRIAÇÃO DE VTR','VTR',r.lastInsertRowid,`VTR ${b.prefixo}`); res.status(201).json({sucesso:true,id:Number(r.lastInsertRowid)});
});
router.patch('/vtrs/:id', managers, async (req,res)=>{
  const id=Number(req.params.id), b=req.body||{};
  if(!await db.get('SELECT id FROM vtrs WHERE id=?',[id])) return res.status(404).json({erro:'VTR não encontrada.'});
  await db.run(`UPDATE vtrs SET prefixo=?,modelo=?,placa=?,status=?,observacoes=?,atualizado_em=datetime('now') WHERE id=?`,[String(b.prefixo||'').trim(),String(b.modelo||'').trim(),String(b.placa||'').trim(),String(b.status||'DISPONIVEL').trim(),String(b.observacoes||'').trim(),id]);
  await log(req,'ALTERAÇÃO DE VTR','VTR',id,`VTR ${b.prefixo||''}`); res.json({sucesso:true});
});
router.delete('/vtrs/:id', managers, async (req,res)=>{const id=Number(req.params.id);const row=await db.get('SELECT id,prefixo FROM vtrs WHERE id=?',[id]);if(!row)return res.status(404).json({erro:'VTR não encontrada.'});const result=await db.run('DELETE FROM vtrs WHERE id=?',[id]);if(Number(result?.changes||0)!==1)return res.status(409).json({erro:'A VTR não pôde ser excluída do banco de dados.'});await log(req,'EXCLUSÃO DE VTR','VTR',id,`VTR ${row.prefixo}`);res.json({sucesso:true,mensagem:'VTR excluída.'});});

// Advertências
router.get('/advertencias', requireCommand, async (req,res)=>{
  const own=!(await isCommand(req));
  const rows=await db.all(`SELECT a.*,u.nome AS usuario_nome,u.username AS usuario_username,u.cargo_delta FROM advertencias a JOIN users u ON u.id=a.usuario_id ${own?'WHERE a.usuario_id=?':''} ORDER BY a.id DESC`,own?[req.session.user.id]:[]);
  res.json({advertencias:rows});
});
router.post('/advertencias', managers, async (req,res)=>{
  const b=req.body||{},uid=Number(b.usuario_id); if(!uid||!String(b.motivo||'').trim()) return res.status(400).json({erro:'Piloto e motivo são obrigatórios.'});
  const a=actor(req),r=await db.run(`INSERT INTO advertencias(usuario_id,nivel,motivo,observacoes,responsavel_tipo,responsavel_id) VALUES(?,?,?,?,?,?)`,[uid,String(b.nivel||'LEVE'),String(b.motivo).trim(),String(b.observacoes||'').trim(),a.tipo,a.id]);
  await log(req,'ADVERTÊNCIA REGISTRADA','ADVERTENCIA',r.lastInsertRowid,`Usuário ${uid} • ${b.nivel||'LEVE'}`);res.status(201).json({sucesso:true,id:Number(r.lastInsertRowid)});
});
router.delete('/advertencias/:id', managers, async (req,res)=>{const id=Number(req.params.id);const row=await db.get('SELECT id FROM advertencias WHERE id=?',[id]);if(!row)return res.status(404).json({erro:'Advertência não encontrada.'});const result=await db.run('DELETE FROM advertencias WHERE id=?',[id]);if(Number(result?.changes||0)!==1)return res.status(409).json({erro:'A advertência não pôde ser excluída do banco de dados.'});await log(req,'EXCLUSÃO DE ADVERTÊNCIA','ADVERTENCIA',id);res.json({sucesso:true,mensagem:'Advertência excluída.'});});

// Ausências
router.get('/ausencias', requireApprovedOrCommand, async (req,res)=>{
  const own=!(await isCommand(req));
  const rows=await db.all(`SELECT a.*,u.nome AS usuario_nome,u.username AS usuario_username,u.cargo_delta FROM ausencias a JOIN users u ON u.id=a.usuario_id ${own?'WHERE a.usuario_id=?':''} ORDER BY a.id DESC`,own?[req.session.user.id]:[]);
  res.json({ausencias:rows});
});
router.post('/ausencias', requireApprovedOrCommand, async (req,res)=>{
  const b=req.body||{},uid=Number(b.usuario_id||req.session.user?.id); const privileged=req.session.admin||['GESTOR','SUB-GESTOR','COORDENADOR'].includes(String(req.session.user?.cargo||'').toUpperCase());
  if(!privileged) { if(uid!==Number(req.session.user.id)) return res.status(403).json({erro:'Você só pode registrar sua própria ausência.'}); }
  if(!b.inicio||!String(b.motivo||'').trim()) return res.status(400).json({erro:'Início e motivo são obrigatórios.'});
  const a=actor(req),r=await db.run(`INSERT INTO ausencias(usuario_id,inicio,fim,motivo,observacoes,responsavel_tipo,responsavel_id,status) VALUES(?,?,?,?,?,?,?,'PROGRAMADA')`,[uid,b.inicio,b.fim||null,String(b.motivo).trim(),String(b.observacoes||'').trim(),a.tipo,a.id]);
  await log(req,'REGISTRO DE AUSÊNCIA','AUSENCIA',r.lastInsertRowid,`Usuário ${uid}`);res.status(201).json({sucesso:true,id:Number(r.lastInsertRowid)});
});
router.patch('/ausencias/:id', requireApprovedOrCommand, async (req,res)=>{
  const id=Number(req.params.id),row=await db.get('SELECT * FROM ausencias WHERE id=?',[id]); if(!row)return res.status(404).json({erro:'Ausência não encontrada.'});
  const privileged=req.session.admin||['GESTOR','SUB-GESTOR','COORDENADOR'].includes(String(req.session.user?.cargo||'').toUpperCase());
  if(!privileged&&Number(row.usuario_id)!==Number(req.session.user.id))return res.status(403).json({erro:'Sem permissão.'});
  const b=req.body||{};await db.run(`UPDATE ausencias SET inicio=?,fim=?,motivo=?,observacoes=?,status=? WHERE id=?`,[b.inicio||row.inicio,b.fim||null,String(b.motivo||row.motivo),String(b.observacoes||''),String(b.status||row.status),id]);await log(req,'ALTERAÇÃO DE AUSÊNCIA','AUSENCIA',id);res.json({sucesso:true});
});

// Badges
router.get('/badges', requireApprovedOrCommand, async (req,res)=>{
  const own=!(await isCommand(req));
  const rows=await db.all(`SELECT b.*,u.nome AS usuario_nome,u.username AS usuario_username,u.cargo_delta FROM badges b JOIN users u ON u.id=b.usuario_id ${own?'WHERE b.usuario_id=?':''} ORDER BY b.id DESC`,own?[req.session.user.id]:[]);
  res.json({badges:rows});
});
router.post('/badges', managers, async (req,res)=>{
  const b=req.body||{},uid=Number(b.usuario_id);if(!uid||!String(b.nome||'').trim())return res.status(400).json({erro:'Piloto e nome do badge são obrigatórios.'});
  const a=actor(req),r=await db.run(`INSERT INTO badges(usuario_id,nome,descricao,imagem_url,responsavel_tipo,responsavel_id) VALUES(?,?,?,?,?,?)`,[uid,String(b.nome).trim(),String(b.descricao||'').trim(),String(b.imagem_url||'').trim(),a.tipo,a.id]);await log(req,'BADGE CONCEDIDO','BADGE',r.lastInsertRowid,`Usuário ${uid} • ${b.nome}`);res.status(201).json({sucesso:true,id:Number(r.lastInsertRowid)});
});
router.delete('/badges/:id', managers, async (req,res)=>{const id=Number(req.params.id);const row=await db.get('SELECT id FROM badges WHERE id=?',[id]);if(!row)return res.status(404).json({erro:'Badge não encontrado.'});const result=await db.run('DELETE FROM badges WHERE id=?',[id]);if(Number(result?.changes||0)!==1)return res.status(409).json({erro:'O badge não pôde ser excluído do banco de dados.'});await log(req,'EXCLUSÃO DE BADGE','BADGE',id);res.json({sucesso:true,mensagem:'Badge excluído.'});});


// Promoções: histórico real de alterações de cargo.
router.get('/promovidos', requireCommand, async (req,res)=>{
  const rows=await db.all(`SELECT h.*,u.nome AS usuario_nome,u.username AS usuario_username FROM historico_cargos h LEFT JOIN users u ON u.id=h.usuario_id WHERE h.cargo_novo IN ('GESTOR','SUB-GESTOR','COORDENADOR','PILOTO MASTER','PILOTO DE ELITE','PILOTO ESPECIALISTA','PILOTO AVANÇADO','PILOTO ASPIRANTE','PILOTO PROBATORIO') ORDER BY h.id DESC LIMIT 200`);
  res.json({promovidos:rows});
});

// Desligamentos: usa o histórico de exonerações já existente.
router.get('/desligamentos', requireCommand, async (req,res)=>res.json({desligamentos:await db.all(`SELECT e.*,u.nome AS usuario_atual_nome,u.cargo_delta AS cargo_atual FROM exoneracoes e LEFT JOIN users u ON u.id=e.usuario_id ORDER BY e.id DESC`)}));

module.exports=router;
