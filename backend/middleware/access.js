const db = require('../database');
const TOP_CARGOS = ['GESTOR','SUB-GESTOR','COORDENADOR'];
const PILOTO_CARGOS = ['PILOTO MASTER','PILOTO DE ELITE','PILOTO ESPECIALISTA','PILOTO AVANÇADO','PILOTO ASPIRANTE','PILOTO PROBATORIO'];

async function isCommand(req){
  if(req.session?.admin) return true;
  const id=req.session?.user?.id;if(!id)return false;
  const row=await db.get('SELECT cargo_delta,ativo FROM users WHERE id=? LIMIT 1',[id]);
  return !!row && Number(row.ativo)===1 && TOP_CARGOS.includes(String(row.cargo_delta||'').toUpperCase());
}
async function isApproved(req){
  const id=req.session?.user?.id;if(!id)return false;
  const row=await db.get('SELECT cargo_delta, ativo, status_conta FROM users WHERE id=? LIMIT 1',[id]);
  if(!row || Number(row.ativo)!==1)return false;
  const cargo=String(row.cargo_delta||'').trim().toUpperCase();
  // Cargo de piloto já representa vínculo operacional ativo. Isso evita que
  // uma candidatura antiga/arquivada impeça o piloto probatório de usar
  // apreensões, ponto, VTRs e demais módulos operacionais.
  if(PILOTO_CARGOS.includes(cargo)) return true;
  return !!await db.get("SELECT id FROM candidaturas WHERE usuario_id=? AND status='APROVADO' LIMIT 1",[id]);
}
async function isContentManager(req){
  if(req.session?.admin) return true;
  const id=req.session?.user?.id;if(!id)return false;
  const row=await db.get('SELECT cargo_delta,ativo FROM users WHERE id=? LIMIT 1',[id]);
  return !!row && Number(row.ativo)===1 && TOP_CARGOS.includes(String(row.cargo_delta||'').toUpperCase());
}
async function requireCommand(req,res,next){if(!await isCommand(req))return res.status(403).json({erro:'Acesso restrito ao Administrador, Gestor, Sub-Gestor e Coordenador.'});next();}
async function requireContentManager(req,res,next){if(!await isContentManager(req))return res.status(403).json({erro:'Somente Administrador, GESTOR, SUB-GESTOR e COORDENADOR podem alterar este conteúdo.'});next();}
async function requireApprovedOrCommand(req,res,next){if(await isCommand(req)||await isApproved(req))return next();return res.status(403).json({erro:'Acesso exclusivo aos pilotos aprovados e ao Comando.'});}
module.exports={TOP_CARGOS,isCommand,isApproved,isContentManager,requireCommand,requireContentManager,requireApprovedOrCommand};
