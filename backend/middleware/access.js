const db = require('../database');
const TOP_CARGOS = ['GESTOR','SUB-GESTOR','COORDENADOR'];
function isCommand(req){
  if(req.session?.admin) return true;
  const id=req.session?.user?.id;if(!id)return false;
  const row=db.get('SELECT cargo_delta,ativo FROM users WHERE id=? LIMIT 1',[id]);
  return !!row && Number(row.ativo)===1 && TOP_CARGOS.includes(String(row.cargo_delta||'').toUpperCase());
}
function isApproved(req){
  const id=req.session?.user?.id;if(!id)return false;
  const row=db.get('SELECT ativo FROM users WHERE id=? LIMIT 1',[id]);
  if(!row || Number(row.ativo)!==1)return false;
  return !!db.get("SELECT id FROM candidaturas WHERE usuario_id=? AND status='APROVADO' LIMIT 1",[id]);
}
function isContentManager(req){
  if(req.session?.admin) return true;
  const id=req.session?.user?.id;if(!id)return false;
  const row=db.get('SELECT cargo_delta,ativo FROM users WHERE id=? LIMIT 1',[id]);
  return !!row && Number(row.ativo)===1 && TOP_CARGOS.includes(String(row.cargo_delta||'').toUpperCase());
}
function requireCommand(req,res,next){if(!isCommand(req))return res.status(403).json({erro:'Acesso restrito ao Administrador, Gestor, Sub-Gestor e Coordenador.'});next();}
function requireContentManager(req,res,next){if(!isContentManager(req))return res.status(403).json({erro:'Somente Administrador, GESTOR, SUB-GESTOR e COORDENADOR podem alterar este conteúdo.'});next();}
function requireApprovedOrCommand(req,res,next){if(isCommand(req)||isApproved(req))return next();return res.status(403).json({erro:'Acesso exclusivo aos pilotos aprovados e ao Comando.'});}
module.exports={TOP_CARGOS,isCommand,isApproved,isContentManager,requireCommand,requireContentManager,requireApprovedOrCommand};
