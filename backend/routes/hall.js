const express = require('express');
const db = require('../database');
const pilotoAprovado = require('../middleware/pilotoAprovado');
const router = express.Router();

router.use(pilotoAprovado);

router.get('/resumo', async (req,res)=>{
  const id=req.pilotoUserId;
  const pontoAberto=await db.get('SELECT id, entrada FROM pontos WHERE usuario_id=? AND saida IS NULL ORDER BY id DESC LIMIT 1',[id]);
  const apre=await db.all('SELECT id, ocorrencia, id_pessoa, imagem_url, observacoes, criado_em FROM apreensoes WHERE usuario_id=? ORDER BY id DESC LIMIT 10',[id]);
  const f=await db.get('SELECT * FROM fardamentos WHERE usuario_id=?',[id]) || {uniforme:0,colete:0,distintivo:0,equipamento:0,observacoes:''};
  return res.json({pontoAberto: pontoAberto||null, apreensoes: apre, fardamento:f});
});

router.get('/apreensoes',async (req,res)=>{
  try {
    const rows=await db.all('SELECT id, ocorrencia, id_pessoa, imagem_url, observacoes, criado_em FROM apreensoes WHERE usuario_id=? ORDER BY id DESC',[req.pilotoUserId]);
    return res.json({apreensoes:rows});
  } catch(e) {
    console.error(e);
    return res.status(500).json({erro:'Não foi possível carregar suas apreensões.'});
  }
});

router.post('/apreensoes',async (req,res)=>{
  const {ocorrencia,id_pessoa,imagem_url,observacoes}=req.body||{};
  const ocorr=String(ocorrencia||'').trim();
  const pessoa=String(id_pessoa||'').trim();
  const imagem=String(imagem_url||'').trim();
  if(!ocorr || !pessoa || !imagem) return res.status(400).json({erro:'Informe a ocorrência, o ID da pessoa e o link da imagem.'});
  if(!/^\d+$/.test(pessoa)) return res.status(400).json({erro:'O ID da pessoa deve conter somente números.'});
  if(!/^https?:\/\//i.test(imagem)) return res.status(400).json({erro:'O link da imagem precisa começar com http:// ou https://.'});
  const r=await db.run('INSERT INTO apreensoes (usuario_id,ocorrencia,id_pessoa,item,quantidade,imagem_url,observacoes) VALUES (?,?,?,?,1,?,?)',
    [req.pilotoUserId,ocorr,pessoa,pessoa,imagem,String(observacoes||'').trim()]);
  res.status(201).json({sucesso:true,id:Number(r.lastInsertRowid)});
});

router.post('/ponto/entrada',async (req,res)=>{
  const aberto=await db.get('SELECT id FROM pontos WHERE usuario_id=? AND saida IS NULL ORDER BY id DESC LIMIT 1',[req.pilotoUserId]);
  if(aberto) return res.status(409).json({erro:'Você já está com o ponto aberto.'});
  const r=await db.run('INSERT INTO pontos (usuario_id,entrada) VALUES (?,datetime(\'now\'))',[req.pilotoUserId]);
  res.status(201).json({sucesso:true,id:Number(r.lastInsertRowid)});
});
router.post('/ponto/saida',async (req,res)=>{
  const aberto=await db.get('SELECT id FROM pontos WHERE usuario_id=? AND saida IS NULL ORDER BY id DESC LIMIT 1',[req.pilotoUserId]);
  if(!aberto) return res.status(409).json({erro:'Você não possui um ponto aberto.'});
  await db.run("UPDATE pontos SET saida=datetime('now') WHERE id=?",[aberto.id]);
  res.json({sucesso:true});
});
router.get('/ponto/historico',async (req,res)=>res.json(await db.all('SELECT id,entrada,saida FROM pontos WHERE usuario_id=? ORDER BY id DESC LIMIT 20',[req.pilotoUserId])));

router.patch('/fardamento',async (req,res)=>{
  const b=req.body||{};
  const vals=[b.uniforme?1:0,b.colete?1:0,b.distintivo?1:0,b.equipamento?1:0,String(b.observacoes||'').trim()];
  await db.run(`INSERT INTO fardamentos (usuario_id,uniforme,colete,distintivo,equipamento,observacoes,atualizado_em) VALUES (?,?,?,?,?,?,datetime('now'))\nON CONFLICT(usuario_id) DO UPDATE SET uniforme=excluded.uniforme,colete=excluded.colete,distintivo=excluded.distintivo,equipamento=excluded.equipamento,observacoes=excluded.observacoes,atualizado_em=datetime('now')`,[req.pilotoUserId,...vals]);
  res.json({sucesso:true});
});
module.exports=router;
