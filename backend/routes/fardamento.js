const express=require('express');
const db=require('../database');
const hierarchyAuth=require('../middleware/hierarchy');
const requireLogin=require('../middleware/login');
const router=express.Router();
function actor(req){if(req.session?.admin)return {tipo:'ADMINISTRADOR',id:req.session.admin.id,nome:req.session.admin.nome||req.session.admin.username};return {tipo:String(req.session.user?.cargo||'USUARIO').toUpperCase(),id:req.session.user?.id||null,nome:req.session.user?.nome||req.session.user?.username||''};}
function log(req,acao,id,detalhes=''){const a=actor(req);db.run(`INSERT INTO logs_sistema(usuario_tipo,usuario_id,usuario_nome,acao,entidade,entidade_id,detalhes) VALUES(?,?,?,?,?,?,?)`,[a.tipo,a.id,a.nome,acao,'FARDAMENTO_ITEM',id||null,detalhes]);}
function normalizeItem(body,old={}){
  const categoria=String(body.categoria ?? old.categoria ?? '').trim();
  const titulo=String(body.titulo ?? old.titulo ?? '').trim();
  const imagem_url=String(body.imagem_url ?? old.imagem_url ?? '').trim();
  const descricao=String(body.descricao ?? old.descricao ?? '').trim();
  const ordem=Number(body.ordem ?? old.ordem ?? 0);
  if(!categoria||!titulo)return {erro:'Categoria e título são obrigatórios.'};
  if(!Number.isInteger(ordem)||ordem<0)return {erro:'A ordem deve ser um número inteiro maior ou igual a zero.'};
  if(imagem_url && !/^https?:\/\//i.test(imagem_url))return {erro:'O link da imagem deve começar com http:// ou https://.'};
  return {categoria,titulo,imagem_url,descricao,ordem};
}
router.get('/',requireLogin,(req,res)=>{res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');res.set('Pragma','no-cache');res.set('Expires','0');res.json({itens:db.all(`SELECT * FROM fardamento_itens WHERE ativo=1 ORDER BY categoria,ordem,id`)});});
router.post('/',hierarchyAuth,(req,res)=>{const b=normalizeItem(req.body||{});if(b.erro)return res.status(400).json({erro:b.erro});try{const r=db.run(`INSERT INTO fardamento_itens(categoria,titulo,imagem_url,descricao,ordem) VALUES(?,?,?,?,?)`,[b.categoria,b.titulo,b.imagem_url,b.descricao,b.ordem]);log(req,'CRIAÇÃO DE ITEM DE FARDAMENTO',r.lastInsertRowid,b.titulo);res.status(201).json({sucesso:true,id:Number(r.lastInsertRowid)});}catch(e){console.error(e);res.status(500).json({erro:'Não foi possível salvar o item de fardamento.'});}});
router.patch('/:id',hierarchyAuth,(req,res)=>{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({erro:'ID inválido.'});const x=db.get(`SELECT * FROM fardamento_itens WHERE id=?`,[id]);if(!x)return res.status(404).json({erro:'Item não encontrado.'});const b=normalizeItem(req.body||{},x);if(b.erro)return res.status(400).json({erro:b.erro});try{db.run(`UPDATE fardamento_itens SET categoria=?,titulo=?,imagem_url=?,descricao=?,ordem=?,ativo=?,atualizado_em=datetime('now') WHERE id=?`,[b.categoria,b.titulo,b.imagem_url,b.descricao,b.ordem,req.body?.ativo===false?0:1,id]);log(req,'ALTERAÇÃO DE ITEM DE FARDAMENTO',id,b.titulo);res.json({sucesso:true});}catch(e){console.error(e);res.status(500).json({erro:'Não foi possível atualizar o item de fardamento.'});}});
router.delete('/:id',hierarchyAuth,(req,res)=>{const id=Number(req.params.id);if(!Number.isInteger(id)||id<1)return res.status(400).json({erro:'ID de fardamento inválido.'});const row=db.get('SELECT id,titulo FROM fardamento_itens WHERE id=?',[id]);if(!row)return res.status(404).json({erro:'Item de fardamento não encontrado.'});try{const result=db.run('DELETE FROM fardamento_itens WHERE id=?',[id]);if(!result || Number(result.changes||0)!==1)return res.status(409).json({erro:'O item não pôde ser excluído do banco de dados.'});log(req,'EXCLUSÃO DE ITEM DE FARDAMENTO',id,row.titulo);res.set('Cache-Control','no-store');res.json({sucesso:true,mensagem:'Item de fardamento excluído.',id});}catch(e){console.error('Erro ao excluir fardamento:',e);res.status(500).json({erro:'Não foi possível excluir o item de fardamento.'});}});
module.exports=router;
