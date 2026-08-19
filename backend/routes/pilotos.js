const express = require('express');
const db = require('../database');
const hierarchyAuth = require('../middleware/hierarchy');

const router = express.Router();

// Dados operacionais destinados exclusivamente ao Comando.
// Inclui apenas pilotos que já foram aprovados no processo seletivo,
// excluindo GESTOR, SUB-GESTOR e COORDENADOR da lista de pilotos.
router.get('/', hierarchyAuth, async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT
        u.id,
        u.username,
        u.nome,
        u.cargo_delta,
        u.ativo,
        u.criado_em,
        u.ultimo_login,
        c.id AS candidatura_id,
        c.personagem,
        c.id_jogador,
        c.patente,
        c.tempo_pmc,
        c.idade_ic,
        c.disponibilidade,
        c.experiencia,
        c.motivo,
        c.etapa,
        c.status AS candidatura_status,
        c.criado_em AS candidatura_criada_em,
        c.atualizado_em AS candidatura_atualizada_em,
        COALESCE((
          SELECT ROUND(SUM(
            CASE
              WHEN p.saida IS NULL THEN (julianday('now') - julianday(p.entrada)) * 86400.0
              ELSE (julianday(p.saida) - julianday(p.entrada)) * 86400.0
            END
          ), 0)
          FROM pontos p WHERE p.usuario_id = u.id
        ), 0) AS segundos_ponto,
        COALESCE((SELECT COUNT(*) FROM pontos p WHERE p.usuario_id = u.id), 0) AS registros_ponto,
        COALESCE((SELECT COUNT(*) FROM apreensoes a WHERE a.usuario_id = u.id), 0) AS total_apreensoes,
        COALESCE((SELECT SUM(a.quantidade) FROM apreensoes a WHERE a.usuario_id = u.id), 0) AS itens_apreendidos,
        (SELECT MAX(p.entrada) FROM pontos p WHERE p.usuario_id = u.id) AS ultimo_ponto_entrada,
        (SELECT MAX(p.saida) FROM pontos p WHERE p.usuario_id = u.id) AS ultimo_ponto_saida
      FROM users u
      JOIN candidaturas c ON c.id = (
        SELECT c2.id FROM candidaturas c2
        WHERE c2.usuario_id = u.id AND c2.status = 'APROVADO'
        ORDER BY c2.id DESC LIMIT 1
      )
      WHERE u.ativo = 1
        AND UPPER(COALESCE(u.cargo_delta, '')) NOT IN ('GESTOR','SUB-GESTOR','COORDENADOR')
      ORDER BY
        CASE u.cargo_delta
          WHEN 'PILOTO MASTER' THEN 1
          WHEN 'PILOTO DE ELITE' THEN 2
          WHEN 'PILOTO ESPECIALISTA' THEN 3
          WHEN 'PILOTO AVANÇADO' THEN 4
          WHEN 'PILOTO ASPIRANTE' THEN 5
          WHEN 'PILOTO PROBATORIO' THEN 6
          ELSE 7
        END,
        u.nome COLLATE NOCASE
    `);

    const pilotos = rows.map(row => {
      const resumo = obterMetricas(row.id);
      return {
        ...normalizeResumo(row),
        desempenho: calcularDesempenho(resumo)
      };
    });
    res.json({ pilotos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível carregar os dados dos pilotos.' });
  }
});

router.get('/desempenho/resumo', hierarchyAuth, async (req,res)=>{
  try{
    const rows=await db.all(`
      SELECT u.id,u.nome,u.cargo_delta
      FROM users u
      JOIN candidaturas c ON c.id=(SELECT c2.id FROM candidaturas c2 WHERE c2.usuario_id=u.id AND c2.status='APROVADO' ORDER BY c2.id DESC LIMIT 1)
      WHERE u.ativo=1 AND UPPER(COALESCE(u.cargo_delta,'')) NOT IN ('GESTOR','SUB-GESTOR','COORDENADOR')
    `);
    const pilotos=rows.map(r=>({ ...r, desempenho: calcularDesempenho(obterMetricas(r.id)) }));
    const ranking=[...pilotos].sort((a,b)=>b.desempenho.nota_geral-a.desempenho.nota_geral);
    const elegiveis=pilotos.filter(p=>p.desempenho.elegivel_promocao);
    res.json({
      total:pilotos.length,
      elegiveis_promocao:elegiveis.length,
      media_geral:pilotos.length?Math.round(pilotos.reduce((a,p)=>a+p.desempenho.nota_geral,0)/pilotos.length):0,
      media_atividade:pilotos.length?Math.round(pilotos.reduce((a,p)=>a+p.desempenho.atividade,0)/pilotos.length):0,
      media_produtividade:pilotos.length?Math.round(pilotos.reduce((a,p)=>a+p.desempenho.produtividade,0)/pilotos.length):0,
      ranking:ranking.slice(0,10),
      alertas:pilotos.filter(p=>p.desempenho.nota_geral<50 || p.desempenho.conduta<70).slice(0,10)
    });
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível calcular o desempenho.'});}
});

router.post('/:id/avaliacoes', hierarchyAuth, async (req,res)=>{
  try{
    const id=Number(req.params.id), nota=Number(req.body?.nota), observacao=String(req.body?.observacao||'').trim();
    if(!Number.isInteger(id)||id<=0||nota<1||nota>10) return res.status(400).json({erro:'Piloto ou nota inválidos.'});
    const exists=await db.get(`SELECT id FROM users WHERE id=? AND ativo=1`,[id]);
    if(!exists) return res.status(404).json({erro:'Piloto não encontrado.'});
    const r=responsavel(req);
    await db.run(`INSERT INTO avaliacoes_pilotos(usuario_id,nota,observacao,responsavel_tipo,responsavel_id) VALUES(?,?,?,?,?)`,[id,nota,observacao,r.tipo,r.id]);
    res.json({sucesso:true});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível registrar a avaliação.'});}
});

router.post('/:id/ocorrencias', hierarchyAuth, async (req,res)=>{
  try{
    const id=Number(req.params.id), nivel=String(req.body?.nivel||'LEVE').toUpperCase(), motivo=String(req.body?.motivo||'').trim(), observacao=String(req.body?.observacao||'').trim();
    if(!Number.isInteger(id)||id<=0||!['LEVE','MEDIA','GRAVE'].includes(nivel)||!motivo) return res.status(400).json({erro:'Preencha nível e motivo.'});
    const exists=await db.get(`SELECT id FROM users WHERE id=? AND ativo=1`,[id]);
    if(!exists) return res.status(404).json({erro:'Piloto não encontrado.'});
    const r=responsavel(req);
    await db.run(`INSERT INTO ocorrencias_pilotos(usuario_id,nivel,motivo,observacao,responsavel_tipo,responsavel_id) VALUES(?,?,?,?,?,?)`,[id,nivel,motivo,observacao,r.tipo,r.id]);
    res.json({sucesso:true});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível registrar a ocorrência.'});}
});



router.get('/apreensoes', hierarchyAuth, async (req,res)=>{
  try{
    const rows=await db.all(`
      SELECT a.id,a.usuario_id,a.ocorrencia,a.id_pessoa,a.imagem_url,a.observacoes,a.criado_em,
             u.nome,u.username,u.cargo_delta,
             c.personagem,c.id_jogador
      FROM apreensoes a
      JOIN users u ON u.id=a.usuario_id
      LEFT JOIN candidaturas c ON c.id=(
        SELECT c2.id FROM candidaturas c2
        WHERE c2.usuario_id=u.id AND c2.status='APROVADO'
        ORDER BY c2.id DESC LIMIT 1
      )
      WHERE u.ativo=1
      ORDER BY a.id DESC
    `);
    res.json({apreensoes:rows});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível carregar as apreensões.'});}
});

router.get('/apreensoes/:id', hierarchyAuth, async (req,res)=>{
  try{
    const id=Number(req.params.id);
    if(!Number.isInteger(id)||id<=0) return res.status(400).json({erro:'Apreensão inválida.'});
    const row=await db.get(`
      SELECT a.id,a.usuario_id,a.ocorrencia,a.id_pessoa,a.imagem_url,a.observacoes,a.criado_em,
             u.nome,u.username,u.cargo_delta,
             c.personagem,c.id_jogador
      FROM apreensoes a
      JOIN users u ON u.id=a.usuario_id
      LEFT JOIN candidaturas c ON c.id=(
        SELECT c2.id FROM candidaturas c2
        WHERE c2.usuario_id=u.id AND c2.status='APROVADO'
        ORDER BY c2.id DESC LIMIT 1
      )
      WHERE a.id=? AND u.ativo=1 LIMIT 1
    `,[id]);
    if(!row) return res.status(404).json({erro:'Apreensão não encontrada.'});
    res.json({apreensao:row});
  }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível carregar a apreensão.'});}
});

router.get('/:id', hierarchyAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: 'Piloto inválido.' });

    const piloto = await db.get(`
      SELECT
        u.id, u.username, u.nome, u.cargo_delta, u.ativo, u.criado_em, u.ultimo_login,
        c.id AS candidatura_id, c.personagem, c.id_jogador, c.patente, c.tempo_pmc,
        c.idade_ic, c.disponibilidade, c.experiencia, c.motivo, c.etapa,
        c.status AS candidatura_status, c.observacao AS candidatura_observacao,
        c.criado_em AS candidatura_criada_em, c.atualizado_em AS candidatura_atualizada_em
      FROM users u
      JOIN candidaturas c ON c.id = (
        SELECT c2.id FROM candidaturas c2
        WHERE c2.usuario_id = u.id AND c2.status = 'APROVADO'
        ORDER BY c2.id DESC LIMIT 1
      )
      WHERE u.id = ?
        AND UPPER(COALESCE(u.cargo_delta, '')) NOT IN ('GESTOR','SUB-GESTOR','COORDENADOR')
      LIMIT 1
    `, [id]);

    if (!piloto) return res.status(404).json({ erro: 'Piloto aprovado não encontrado.' });

    const pontos = await db.all(`
      SELECT id, entrada, saida,
        ROUND(CASE
          WHEN saida IS NULL THEN (julianday('now') - julianday(entrada)) * 86400.0
          ELSE (julianday(saida) - julianday(entrada)) * 86400.0
        END, 0) AS segundos
      FROM pontos
      WHERE usuario_id = ?
      ORDER BY id DESC
    `, [id]);

    const apreensoes = await db.all(`
      SELECT id, ocorrencia, id_pessoa, imagem_url, observacoes, criado_em
      FROM apreensoes WHERE usuario_id = ? ORDER BY id DESC
    `, [id]);

    const fardamento = await db.get(`SELECT * FROM fardamentos WHERE usuario_id = ? LIMIT 1`, [id]) || {
      usuario_id: id, uniforme: 0, colete: 0, distintivo: 0, equipamento: 0, observacoes: '', atualizado_em: null
    };

    const totalSegundos = pontos.reduce((sum, p) => sum + Number(p.segundos || 0), 0);
    const totalApreensoes = apreensoes.length;
    const itensApreendidos = 0;
    const avaliacoes = await db.all(`SELECT id, nota, observacao, responsavel_tipo, criado_em FROM avaliacoes_pilotos WHERE usuario_id=? ORDER BY id DESC`, [id]);
    const ocorrencias = await db.all(`SELECT id, nivel, motivo, observacao, responsavel_tipo, criado_em FROM ocorrencias_pilotos WHERE usuario_id=? ORDER BY id DESC`, [id]);
    const notaMedia = avaliacoes.length ? avaliacoes.reduce((a,x)=>a+Number(x.nota||0),0)/avaliacoes.length : 0;
    const desempenho = calcularDesempenho({
      segundos: totalSegundos,
      apreensoes: totalApreensoes,
      dias: new Set(pontos.map(p => String(p.entrada || '').slice(0, 10))).size,
      nota: notaMedia,
      ocorrencias
    });

    res.json({
      piloto: normalizeResumo({ ...piloto, segundos_ponto: totalSegundos, registros_ponto: pontos.length, total_apreensoes: totalApreensoes, itens_apreendidos: itensApreendidos }),
      pontos, apreensoes, fardamento, avaliacoes, ocorrencias, desempenho,
      resumo: {
        segundos_ponto: Math.round(totalSegundos),
        total_apreensoes: totalApreensoes,
        itens_apreendidos: itensApreendidos,
        dias_com_ponto: new Set(pontos.map(p => String(p.entrada || '').slice(0, 10))).size,
        ponto_aberto: pontos.some(p => !p.saida)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Não foi possível carregar a ficha do piloto.' });
  }
});


function responsavel(req) {
  if (req.session?.admin) return {
    tipo: 'ADMINISTRADOR',
    id: Number(req.session.admin.id || 0) || null
  };
  return {
    tipo: String(req.session?.user?.cargo || 'COMANDO').toUpperCase(),
    id: Number(req.session?.user?.id || 0) || null
  };
}

function calcularDesempenho({segundos=0, apreensoes=0, dias=0, nota=0, ocorrencias=[]}={}) {
  const horas = Number(segundos || 0) / 3600;
  const atividade = Math.min(100, (horas / 40) * 100);
  const produtividade = Math.min(100, (Number(apreensoes || 0) / 50) * 100);
  const frequencia = Math.min(100, (Number(dias || 0) / 15) * 100);
  const avaliacao = Number(nota || 0) > 0 ? Math.min(100, Number(nota) * 10) : 0;
  let conduta = 100;
  for (const o of (ocorrencias || [])) {
    const n = String(o.nivel || '').toUpperCase();
    if (n === 'GRAVE') conduta -= 35;
    else if (n === 'MEDIA') conduta -= 15;
    else conduta -= 5;
  }
  conduta = Math.max(0, conduta);
  const pesoAvaliacao = Number(nota || 0) > 0 ? 0.20 : 0.10;
  const pesoConduta = 0.10;
  const pesoAtividade = 0.25;
  const pesoProdutividade = 0.25;
  const pesoFrequencia = 1 - pesoAtividade - pesoProdutividade - pesoConduta - pesoAvaliacao;
  const notaGeral = Math.round(
    atividade*pesoAtividade +
    produtividade*pesoProdutividade +
    frequencia*pesoFrequencia +
    avaliacao*pesoAvaliacao +
    conduta*pesoConduta
  );
  const elegivel = horas >= 40 && Number(apreensoes||0) >= 30 && Number(dias||0) >= 15 &&
    (Number(nota||0) === 0 || Number(nota) >= 8) &&
    !(ocorrencias||[]).some(o => String(o.nivel).toUpperCase() === 'GRAVE');
  return {
    nota_geral: Math.max(0, Math.min(100, notaGeral)),
    atividade: Math.round(atividade),
    produtividade: Math.round(produtividade),
    frequencia: Math.round(frequencia),
    avaliacao: Math.round(avaliacao),
    conduta: Math.round(conduta),
    elegivel_promocao: elegivel,
    criterios: {
      horas_minimas: horas >= 40,
      apreensoes_minimas: Number(apreensoes||0) >= 30,
      dias_minimos: Number(dias||0) >= 15,
      avaliacao_minima: Number(nota||0) === 0 || Number(nota) >= 8,
      sem_ocorrencia_grave: !(ocorrencias||[]).some(o => String(o.nivel).toUpperCase() === 'GRAVE')
    }
  };
}

async function obterMetricas(id) {
  const pontos = await db.all(`SELECT entrada, saida,
    ROUND(CASE WHEN saida IS NULL THEN (julianday('now')-julianday(entrada))*86400.0
    ELSE (julianday(saida)-julianday(entrada))*86400.0 END,0) segundos
    FROM pontos WHERE usuario_id=?`, [id]);
  const apre = await db.all(`SELECT * FROM apreensoes WHERE usuario_id=?`, [id]);
  const aval = await db.get(`SELECT nota FROM avaliacoes_pilotos WHERE usuario_id=? ORDER BY id DESC LIMIT 1`, [id]);
  const ocorr = await db.all(`SELECT nivel FROM ocorrencias_pilotos WHERE usuario_id=?`, [id]);
  const segundos = pontos.reduce((a,p)=>a+Math.max(0,Number(p.segundos||0)),0);
  const dias = new Set(pontos.map(p=>String(p.entrada||'').slice(0,10))).size;
  const total = apre.length;
  return { segundos, dias, apreensoes: total, nota: aval?.nota || 0, ocorrencias: ocorr };
}


function normalizeResumo(row) {
  const segundos = Math.max(0, Math.round(Number(row.segundos_ponto || 0)));
  return {
    ...row,
    segundos_ponto: segundos,
    horas_ponto: formatDuration(segundos),
    registros_ponto: Number(row.registros_ponto || 0),
    total_apreensoes: Number(row.total_apreensoes || 0),
    itens_apreendidos: Number(row.itens_apreendidos || 0)
  };
}

function formatDuration(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

module.exports = router;
