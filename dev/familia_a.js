/* ============================================================ RELATÓRIO À FAMÍLIA (v8)
   Relatório individual em PDF para o responsável, comparando dois trimestres (antes × depois da
   Assessoria), a partir dos dados do painel + relatório do assessor (.docx/.pdf/colado).
   Textos: IA (Claude API, chave do "Configurar IA") com reserva por regras. */
const FAM_C = {teal:'#51A8B1', yellow:'#FBB030', magenta:'#A53692', grey:'#6B7280', ink:'#333333', muted:'#6B7280', line:'#E5E7EB', bg:'#F6F7F9', teal1:'#CFE5E8'};
state.fam = {triA:1, triB:2, dest:'pai', destNome:'', assessor:'', parsed:null, raw:'', obs:'', textos:null, fonte:'', key:'', erro:'', built:false};

/* ---- responsáveis (bloco resp_v1 do ActiveSoft) ---- */
function famResponsaveis(aid) {
  const R = DATA.resp || {alunos:{}, resp:{}, tipos:{}};
  const a = R.alunos[String(aid)] || {};
  const nome = id => id && R.resp[String(id)] ? toTitle(R.resp[String(id)].n) : '';
  return {pai: nome(a.p), mae: nome(a.m), resp: nome(a.r), respTipo: (R.tipos[String(a.tr)]||'').toUpperCase(), sexo: a.sx || null};
}
const famR1 = x => x==null ? null : Math.round((x + 1e-9) * 10) / 10;       // arredondamento do ActiveSoft (1 casa, meio para cima)
function famArea(disc) {
  const d = normName(disc);
  if (/matem/.test(d)) return 'Matemática';
  if (/biolog|fisic|quimic|cienc/.test(d)) return 'Ciências da Natureza';
  if (/histor|geogr|filos|sociol/.test(d)) return 'Ciências Humanas';
  if (/lingu|portug|gramat|redac|ingl|espanh|arte|literat/.test(d)) return 'Linguagens';
  return 'Outras';
}
const FAM_AREAS = ['Linguagens','Ciências Humanas','Ciências da Natureza','Matemática','Outras'];
/* nome "bonito" da frente: Química- Frente B → Química – Frente B; Filosofia/sociologia → Filosofia/Sociologia; Língua Estrangeira - Inglês → Inglês */
function famNice(disc) {
  let d = String(disc).replace(/\s+/g,' ').trim();
  d = d.replace(/^l[íi]ngua estrangeira\s*[-–]\s*/i,'');
  d = d.replace(/\/(\p{L})/gu, (m,c)=>'/'+c.toUpperCase());
  d = d.replace(/\s*[-–]?\s*frente\s*([abc])\b/i, (m,c)=>' – Frente '+c.toUpperCase());
  return d;
}
const famMae = disc => famNice(disc).replace(/\s*–\s*Frente\s*[ABC]$/,'').trim();
const famShort = disc => famNice(disc).replace(/\s*–\s*Frente\s*/,' ').replace('Filosofia/Sociologia','Fil./Soc.');
const FAM_ORDEM = ['linguagens','portugues','gramatica','redacao','ingles','espanhol','artes','historia','geografia','filosofia','biologia','ciencias','fisica','quimica','matematica'];
const famOrd = disc => { const n = normName(famMae(disc)); const i = FAM_ORDEM.findIndex(k => n.startsWith(k) || n.includes(k)); return i<0 ? 99 : i; };
function famPrimeiroNome(nome) {
  const t = String(nome||'').trim().split(/\s+/);
  const comp = new Set(['maria','ana','joao','joão','jose','josé','pedro','luiz','luis','luís','carlos','paulo','marcos','antonio','antônio','francisco','lucas','vitor','victor','davi','joao','marco','joão']);
  return comp.has(normName(t[0])) && t[1] ? t[0]+' '+t[1] : t[0];
}
/* frequência de um aluno no ano (sem depender dos filtros globais) */
function famFreq(aid, turma, tris) {
  const out = {byDisc:{}, tot:{f:0,j:0,inf:0,datasF:[]}, porTri:{}};
  const today = DATA.extraido_em;
  DATA.freq.forEach(fr => {
    if (fr.turma!==turma || !tris.includes(fr.tri)) return;
    const st = fr.al[aid]; if (!st) return;
    const d = out.byDisc[fr.disc] = out.byDisc[fr.disc] || {f:0,j:0,inf:0,datasF:[]};
    const pt = out.porTri[fr.tri] = out.porTri[fr.tri] || {f:0,j:0,inf:0};
    for (let i=0;i<st.length;i++) {
      const c = st[i], dt = fr.aulas[i]; if (dt && dt > today) continue;
      if (c==='P') { d.inf++; out.tot.inf++; pt.inf++; }
      else if (c==='F' || c==='J') { d.inf++; out.tot.inf++; pt.inf++; if (c==='F') { d.f++; out.tot.f++; pt.f++; } else { d.j++; out.tot.j++; pt.j++; } d.datasF.push(dt); out.tot.datasF.push(dt); }
    }
  });
  return out;
}
/* ---- dossiê comparativo ---- */
function famDossier() {
  const sel = selectedAsfAluno(); if (!sel) return null;
  const F = state.fam, tA = F.triA, tB = F.triB, tris = [tA, tB];
  const todas = [1,2,3].filter(t => t <= tB);
  const rows = DATA.asf_rows.filter(r => r.aid===sel.aid && r.turma===sel.turma && !REC_FORA_DISC.has(r.did));
  const turmaRows = DATA.asf_rows.filter(r => r.turma===sel.turma && !REC_FORA_DISC.has(r.did));
  /* frentes presentes (com alguma nota nos trimestres comparados), ordenadas por área */
  const discs = [...new Set(rows.filter(r => tris.includes(r.tri) && (r.media!=null || r.ae1!=null)).map(r=>r.disc))];
  discs.sort((a,b) => FAM_AREAS.indexOf(famArea(a))-FAM_AREAS.indexOf(famArea(b)) || famOrd(a)-famOrd(b) || famMae(a).localeCompare(famMae(b),'pt') || famNice(a).localeCompare(famNice(b),'pt'));
  const cell = (disc, t) => rows.find(r => r.disc===disc && r.tri===t) || null;
  const turmaMean = (disc, t, k) => mean(turmaRows.filter(r => r.disc===disc && r.tri===t && r[k]!=null).map(r=>r[k]));
  const fr = discs.map(disc => {
    const o = {disc, nice: famNice(disc), short: famShort(disc), area: famArea(disc), mae: famMae(disc), t:{}};
    tris.forEach(t => { const r = cell(disc,t); o.t[t] = r ? {ae1:r.ae1, ae2:r.ae2, aq:r.aq, fase:r.media, emRec:r.emRec, rec:r.rec, final:r.final, turma: turmaMean(disc,t,'media'), turmaAe1: turmaMean(disc,t,'ae1'), turmaAe2: turmaMean(disc,t,'ae2'), turmaAq: turmaMean(disc,t,'aq')} : null; });
    return o;
  });
  /* resumos por trimestre (aluno e turma) + posição */
  const resumo = {}, pos = {};
  tris.forEach(t => {
    const mine = rows.filter(r => r.tri===t);
    const m = k => mean(mine.filter(r=>r[k]!=null).map(r=>r[k]));
    resumo[t] = {ae1:m('ae1'), ae2:m('ae2'), aq:m('aq'), fase:m('media'), final:m('final'), n: mine.filter(r=>r.media!=null).length};
    const byAl = {}; turmaRows.filter(r=>r.tri===t && r.media!=null).forEach(r => (byAl[r.aid] = byAl[r.aid] || []).push(r));
    const lista = Object.entries(byAl).filter(([a,rs]) => rs.length >= Math.max(5, Math.floor(discs.length*0.6))).map(([a,rs]) => ({aid:+a, med: mean(rs.map(r=>r.media)), ae1: mean(rs.filter(r=>r.ae1!=null).map(r=>r.ae1)), ae2: mean(rs.filter(r=>r.ae2!=null).map(r=>r.ae2)), aq: mean(rs.filter(r=>r.aq!=null).map(r=>r.aq))}));
    lista.sort((x,y)=>y.med-x.med);
    const i = lista.findIndex(x=>x.aid===sel.aid);
    pos[t] = {pos: i>=0 ? i+1 : null, tot: lista.length, turma:{med: mean(lista.map(x=>x.med)), ae1: mean(lista.filter(x=>x.ae1!=null).map(x=>x.ae1)), ae2: mean(lista.filter(x=>x.ae2!=null).map(x=>x.ae2)), aq: mean(lista.filter(x=>x.aq!=null).map(x=>x.aq))}};
  });
  const abaixo = t => fr.filter(f => f.t[t] && f.t[t].fase!=null && f.t[t].fase < 7);
  const abaixoPos = t => fr.filter(f => f.t[t] && f.t[t].final!=null && f.t[t].final < 7);
  /* recuperações (casos por disciplina-mãe), nos trimestres comparados */
  const recs = recCases({tris, aid: sel.aid, turma: sel.turma, todasSeries:true}).casos.sort((a,b)=>a.tri-b.tri || a.disc.localeCompare(b.disc,'pt'));
  const recResumo = {}; tris.forEach(t => { const ob = recs.filter(c=>c.tri===t && c.tipo==='obrig'); recResumo[t] = {obrig: ob.length, rec: ob.filter(c=>c.status==='recuperou').length, nao: ob.filter(c=>c.status==='nao').length, sem: ob.filter(c=>c.status==='semnota').length,
    frentesAbaixo: abaixo(t).length, frentesRec: abaixo(t).filter(f => (f.t[t].final??0) >= 7).length, frentesNaoFez: abaixo(t).filter(f => f.t[t].rec==null).length}; });
  /* projeção (21 pontos) por disciplina-mãe, com as médias finais arredondadas como o ActiveSoft */
  const maes = [...new Set(fr.map(f=>f.mae))];
  const proj = maes.map(m => {
    const fs = fr.filter(f=>f.mae===m);
    const med = t => { const v = fs.map(f => f.t[t] ? (f.t[t].final ?? f.t[t].fase) : null).filter(x=>x!=null); return v.length ? famR1(mean(v)) : null; };
    const ms = {}; todas.forEach(t => ms[t] = med(t));
    const conhecidas = todas.filter(t => ms[t]!=null);
    const soma = conhecidas.reduce((s,t)=>s+ms[t],0);
    const restantes = 3 - tB;
    let need = null, sit = null;
    if (restantes >= 1) { need = Math.round((21 - soma)*10)/10; sit = need > 10*restantes ? ['final','Já na prova final'] : need >= 8*restantes ? ['provavel','Provável prova final'] : need <= 0 ? ['garantida','Aprovação já garantida'] : ['fora','Provavelmente fora da final']; }
    else sit = soma >= 21 ? ['garantida','Aprovação direta'] : ['final','Prova final'];
    return {mae:m, ms, soma, need, sit, area: fs[0].area};
  });
  /* Geekie: ano e por trimestre */
  const gActs = DATA.gk_acts.filter(a => a.turma===sel.turma);
  const gkAno = gkStudentSummary(state.aluno, gActs);
  const gkTri = {}; tris.forEach(t => { const acts = gActs.filter(a=>a.tri===t); const s = gkStudentSummary(state.aluno, acts); let T=0,Fz=0,R=0,K=0; s.forEach(x=>{T+=x.total;Fz+=x.fez;R+=x.resp;K+=x.ok;}); let TT=0,TF=0,TR=0,TK=0; acts.forEach(a=>a.students.forEach(st=>{ if(isDue(a)){TT++; if(st.fez)TF++;} TR+=st.resp; TK+=st.acertos; })); gkTri[t] = {T,F:Fz,R,K, turmaEng: TT?TF/TT:null, turmaPerf: TR?TK/TR:null}; });
  let T=0,Fz=0,R=0,K=0; gkAno.forEach(x=>{T+=x.total;Fz+=x.fez;R+=x.resp;K+=x.ok;});
  let TT=0,TF=0,TR=0,TK=0; gActs.forEach(a=>a.students.forEach(st=>{ if(isDue(a)){TT++; if(st.fez)TF++;} TR+=st.resp; TK+=st.acertos; }));
  const byWeek = {}; gActs.filter(isDue).forEach(a => a.students.forEach(st => { if (st.key===state.aluno) { const w = byWeek[a.monday] = byWeek[a.monday] || {t:0,m:0}; w.t++; if(!st.fez) w.m++; } }));
  const badWeeks = Object.entries(byWeek).filter(([w,x])=>x.m>=3).map(([w])=>w).sort();
  /* frequência, ocorrências, responsáveis */
  const freq = famFreq(sel.aid, sel.turma, todas);
  const edf = Object.entries(freq.byDisc).find(([d]) => /ed\.?\s*f[ií]sica|educa[çc][ãa]o f[ií]sica/i.test(d));
  const oc = DATA.ocorrencias.filter(o => String(o.aid)===String(sel.aid) && triOfDate(sel.serie, o.dt) <= tB).sort((a,b)=>a.dt.localeCompare(b.dt));
  const resp = famResponsaveis(sel.aid);
  const sexo = resp.sexo || 'F';
  const g = sexo==='M' ? {al:'o aluno', Al:'O aluno', ela:'ele', dela:'dele', a:'o', estudante:'o estudante', filha:'filho', Ela:'Ele', ao:'ao'} : {al:'a aluna', Al:'A aluna', ela:'ela', dela:'dela', a:'a', estudante:'a estudante', filha:'filha', Ela:'Ela', ao:'à'};
  /* destinatário */
  const F2 = state.fam;
  let destNome = F2.destNome.trim(), destTrat = {sauda:'Prezada família,', trat:'vocês', Trat:'Vocês', senhor:'a família', obj:'lhes'};
  if (F2.dest==='pai' && (destNome || resp.pai)) { destNome = destNome || resp.pai; destTrat = {sauda:`Prezado Sr. ${famPrimeiroNome(destNome)},`, trat:'o senhor', Trat:'O senhor', senhor:'o senhor', obj:'lhe'}; }
  else if (F2.dest==='mae' && (destNome || resp.mae)) { destNome = destNome || resp.mae; destTrat = {sauda:`Prezada Sra. ${famPrimeiroNome(destNome)},`, trat:'a senhora', Trat:'A senhora', senhor:'a senhora', obj:'lhe'}; }
  else if (F2.dest==='resp' && (destNome || resp.resp)) { destNome = destNome || resp.resp; const fem = /M[ÃA]E|AV[ÓO]$|AVÓ|IRM[ÃA]$|TIA|MADRASTA|M$/.test(resp.respTipo) && !/PAI|AV[ÔO]|IRM[ÃA]O|TIO|PADRASTO/.test(resp.respTipo); destTrat = fem ? {sauda:`Prezada Sra. ${famPrimeiroNome(destNome)},`, trat:'a senhora', Trat:'A senhora', senhor:'a senhora', obj:'lhe'} : {sauda:`Prezado Sr. ${famPrimeiroNome(destNome)},`, trat:'o senhor', Trat:'O senhor', senhor:'o senhor', obj:'lhe'}; }
  else if (F2.dest==='outro' && destNome) destTrat = {sauda:`Prezado(a) ${destNome},`, trat:'o(a) senhor(a)', Trat:'O(a) senhor(a)', senhor:'o(a) senhor(a)', obj:'lhe'};
  return {sel, nome: sel.nome, curto: famPrimeiroNome(sel.nome), turma: sel.turma, unit: sel.unit, serie: sel.serie, tA, tB, tris, todas, fr, discs, resumo, pos, abaixoA: abaixo(tA), abaixoB: abaixo(tB), abaixoPosA: abaixoPos(tA), abaixoPosB: abaixoPos(tB),
    recs, recResumo, proj, gkAno, gkTri, eng:{T,F:Fz,R,K}, engTurma:{TT,TF,TR,TK}, badWeeks, freq, edf, oc, resp, g, destNome, destTrat, parsed: F2.parsed, assessor: F2.assessor || (F2.parsed && F2.parsed.assessor) || '', obs: F2.obs};
}

/* ---- leitura do relatório do assessor ---- */
function famLoadScript(src) { return new Promise((ok, err) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => err(new Error('não carregou '+src)); document.head.appendChild(s); }); }
async function famDocxText(buf) {
  await famLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml').async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const body = doc.getElementsByTagName('w:body')[0];
  const textOf = node => [...node.getElementsByTagName('w:t')].map(t=>t.textContent).join('').replace(/\s+/g,' ').trim();
  const paragraphs = [], tables = [];
  [...body.children].forEach(n => {
    if (n.localName==='p') { const t = textOf(n); const isList = n.getElementsByTagName('w:numPr').length>0; if (t) paragraphs.push((isList?'• ':'')+t); }
    else if (n.localName==='tbl') { const rows = [...n.getElementsByTagName('w:tr')].map(tr => [...tr.getElementsByTagName('w:tc')].map(textOf)); tables.push(rows); rows.forEach(r => paragraphs.push(r.join(' | '))); }
  });
  return {paragraphs, tables};
}
async function famPdfText(buf) {
  await famLoadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({data: buf}).promise;
  const lines = [];
  for (let p=1; p<=pdf.numPages; p++) {
    const page = await pdf.getPage(p); const tc = await page.getTextContent();
    const rows = {}; tc.items.forEach(it => { const y = Math.round(it.transform[5]/3)*3; (rows[y] = rows[y] || []).push(it); });
    Object.keys(rows).map(Number).sort((a,b)=>b-a).forEach(y => { const txt = rows[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ').replace(/\s+/g,' ').trim(); if (txt) lines.push(txt); });
  }
  return {paragraphs: lines, tables: []};
}
const FAM_MESES = ['janeiro','fevereiro','março','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const FAM_SECOES = [['presenca',/^presen[çc]a/i],['geekie',/geekie|plataforma/i],['desafios',/^desafios|dificuldade/i],['estrategias',/^estrat[ée]gias/i],['recomendacoes',/^recomenda/i],['conclusao',/^conclus[ãa]o/i]];
function famInterpret(paragraphs) {
  const out = {assessor:'', presenca:[], secoes:{}, recomendacoes:[], outros:[], bruto: paragraphs.join('\n')};
  let cur = null;
  paragraphs.forEach(p0 => {
    const p = p0.replace(/\s+/g,' ').trim(); if (!p) return;
    let m = /^time\s*[:\-]\s*(.+)$/i.exec(p); if (m) { out.assessor = toTitle(m[1].trim()); return; }
    if (/^aluno\s*[:\-]/i.test(p) || /^informa[çc][õo]es quanto/i.test(p) || /^m[êe]s\s*\|?\s*%/i.test(p)) return;
    m = new RegExp(`^(${FAM_MESES.join('|')})\\s*\\|?\\s*(.+)$`,'i').exec(p);
    if (m) { const txt = m[2].trim(); const pm = /(\d+)\s*%/.exec(txt); const n = /de\s+(\d+)\s+atend/i.exec(txt); out.presenca.push({mes: toTitle(m[1]), pct: pm ? +pm[1] : null, n: n ? +n[1] : null, texto: txt}); return; }
    m = /^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^:]{2,60}):\s*(.*)$/.exec(p);
    if (m) { const sec = FAM_SECOES.find(([k,re]) => re.test(m[1])); if (sec) { cur = sec[0]; if (m[2]) out.secoes[cur] = (out.secoes[cur] ? out.secoes[cur]+' ' : '') + m[2].trim(); return; } }
    if (/^[•\-–*]\s*/.test(p) && (cur==='recomendacoes' || !cur)) { out.recomendacoes.push(p.replace(/^[•\-–*]\s*/,'')); return; }
    if (cur) { if (cur==='recomendacoes') { const last = out.recomendacoes.length-1; if (last>=0 && !/^[•\-–*]/.test(p0.trim()) && !/[.!?]$/.test(out.recomendacoes[last])) out.recomendacoes[last] += ' '+p; else out.recomendacoes.push(p); } else out.secoes[cur] = (out.secoes[cur] ? out.secoes[cur]+' ' : '') + p; }
    else out.outros.push(p);
  });
  return out;
}
async function famReadFile(file) {
  const buf = await file.arrayBuffer();
  const ext = (file.name.split('.').pop()||'').toLowerCase();
  const got = ext==='docx' ? await famDocxText(buf) : ext==='pdf' ? await famPdfText(buf) : {paragraphs: (new TextDecoder().decode(buf)).split(/\n+/), tables:[]};
  const parsed = famInterpret(got.paragraphs); parsed.arquivo = file.name; return parsed;
}

/* ---- textos por regras ---- */
function famRuleTexts(d) {
  const g = d.g, T = d.destTrat, A = d.tA, B = d.tB, rA = d.resumo[A], rB = d.resumo[B], pA = d.pos[A], pB = d.pos[B];
  const f1 = x => fmt(x), dif = (a,b) => a!=null && b!=null ? b-a : null;
  const nome = d.curto;
  const cresceu = dif(rA.fase, rB.fase) > 0.05, igual = Math.abs(dif(rA.fase, rB.fase)||0) <= 0.05;
  const recA = d.recResumo[A], recB = d.recResumo[B];
  const comAssess = !!(d.parsed && d.parsed.presenca.length) || !!d.assessor;
  const carta = [
    `Antes de qualquer tabela, quero agradecer pela confiança que ${T.trat} deposita na Habilis e pela parceria com ${g.a} ${nome} neste ano. Acompanhar o percurso escolar de um${sexo(d)==='F'?'a':''} ${g.filha} exige tempo, atenção e paciência, e é por reconhecer esse cuidado que este relatório foi preparado com o mesmo zelo.`,
    `Este documento compara o ${A}º e o ${B}º trimestre de 2026${comAssess ? ' — o período antes e o período com o acompanhamento da Assessoria —' : ''} para enxergar o que está funcionando, onde o esforço ${g.dela} já aparece em resultado e onde ainda precisamos somar forças.`,
    cresceu ? `Adianto a conclusão: ${g.a} ${nome} cresceu. A média geral passou de ${f1(rA.fase)} para ${f1(rB.fase)}${rB.final!=null && rB.final>rB.fase+0.04 ? ` (${f1(rB.final)} após a recuperação)` : ''}${pA.pos&&pB.pos ? `, ${g.ela} foi da ${pA.pos}ª para a ${pB.pos}ª posição da turma` : ''} e as frentes abaixo de 7 passaram de ${d.abaixoA.length} para ${d.abaixoB.length}${d.abaixoPosB.length<d.abaixoB.length ? ` — ${d.abaixoPosB.length} após a recuperação` : ''}.`
    : igual ? `A média geral ficou estável (${f1(rA.fase)} → ${f1(rB.fase)}), mas a composição mudou, e é isso que este relatório procura mostrar: em quais componentes e disciplinas houve avanço e em quais ainda precisamos insistir.`
    : `Serei transparente: a média geral recuou de ${f1(rA.fase)} para ${f1(rB.fase)}${pA.pos&&pB.pos ? ` e ${g.a} ${nome} passou da ${pA.pos}ª para a ${pB.pos}ª posição da turma` : ''}. Este relatório localiza onde isso aconteceu e propõe um caminho concreto para o próximo trimestre.`,
    `Os pontos que pedem atenção${d.abaixoPosB.length ? ` — ${d.abaixoPosB.map(f=>f.nice).join(', ')} —` : ''} não são apresentados como problemas, e sim como o próximo degrau: estão nomeados, medidos e com plano de ação nas páginas finais.`
  ];
  function sexo(d){ return d.resp.sexo==='M' ? 'M' : 'F'; }
  /* áreas */
  const areas = {};
  FAM_AREAS.forEach(area => {
    const fs = d.fr.filter(f=>f.area===area); if (!fs.length) return;
    const up = fs.filter(f => f.t[A]&&f.t[B]&&f.t[A].ae1!=null&&f.t[B].ae1!=null && f.t[B].ae1 - f.t[A].ae1 >= 2);
    const down = fs.filter(f => f.t[A]&&f.t[B]&&f.t[A].ae1!=null&&f.t[B].ae1!=null && f.t[A].ae1 - f.t[B].ae1 >= 2);
    const ae2A = mean(fs.map(f=>f.t[A]&&f.t[A].ae2).filter(x=>x!=null)), ae2B = mean(fs.map(f=>f.t[B]&&f.t[B].ae2).filter(x=>x!=null));
    const baixasB = fs.filter(f => f.t[B] && f.t[B].fase!=null && f.t[B].fase<7);
    const acimaTurma = fs.filter(f => f.t[B] && f.t[B].fase!=null && f.t[B].turma!=null && f.t[B].fase > f.t[B].turma);
    let s = '';
    if (up.length) s += `Nas provas (AE1), o avanço foi claro em ${up.map(f=>`${f.short} (${f1(f.t[A].ae1)} → ${f1(f.t[B].ae1)})`).join(', ')}. `;
    if (down.length) s += `Em ${down.map(f=>`${f.short} (${f1(f.t[A].ae1)} → ${f1(f.t[B].ae1)})`).join(', ')} a prova recuou${down.some(f => f.t[B].turmaAe1!=null && f.t[B].turmaAe1 < 6) ? ' — movimento que a turma também viveu, o que fala da dificuldade da avaliação' : ''}. `;
    if (ae2A!=null && ae2B!=null) s += `No simulado (AE2), a área foi de ${f1(ae2A)} para ${f1(ae2B)}. `;
    s += baixasB.length ? `No ${B}º trimestre ${baixasB.length===1 ? 'ficou abaixo de 7 a frente' : 'ficaram abaixo de 7 as frentes'} ${baixasB.map(f=>`${f.short} (${f1(f.t[B].fase)}${f.t[B].rec!=null ? `; recuperação ${f1(f.t[B].rec)}` : ''})`).join(', ')}. ` : `Todas as frentes fecharam o ${B}º trimestre com 7 ou mais. `;
    if (acimaTurma.length === fs.length && fs.length) s += `${g.Ela} está acima da média da turma em toda a área.`;
    else if (acimaTurma.length) s += `Acima da média da turma em ${acimaTurma.map(f=>f.short).join(', ')}.`;
    areas[area] = s.trim();
  });
  /* recuperações */
  const recTxt = (t, r) => r.frentesAbaixo ? `No ${t}º trimestre, das ${r.frentesAbaixo} frentes abaixo de 7, ${g.a} ${nome} recuperou ${r.frentesRec}${r.frentesNaoFez ? ` e não realizou a prova em ${r.frentesNaoFez}` : ''}.` : `No ${t}º trimestre não houve frente abaixo de 7.`;
  const recup = `${recTxt(A, recA)} ${recTxt(B, recB)} ${recA.frentesAbaixo && recB.frentesAbaixo && (recB.frentesRec/recB.frentesAbaixo) > (recA.frentesRec/recA.frentesAbaixo) + 0.15 ? 'A diferença entre as duas recuperações é um indicador concreto de que o estudo dirigido está dando resultado.' : ''} ${d.abaixoPosB.length ? `As frentes que seguem abaixo de 7 (${d.abaixoPosB.map(f=>f.short).join(', ')}) entram no plano do próximo trimestre como prioridade de conteúdo.` : ''}`.trim();
  /* rotina */
  const gap = d.fr.filter(f => f.t[B] && f.t[B].aq!=null && f.t[B].ae2!=null && f.t[B].aq - f.t[B].ae2 >= 3);
  const eng = d.eng.T ? d.eng.F/d.eng.T : null, perf = d.eng.R ? d.eng.K/d.eng.R : null;
  const rotina = `${g.Al} ${eng!=null ? `fez ${pct(eng)} das atividades da GeekieOne${d.engTurma.TT ? ` (turma: ${pct(d.engTurma.TF/d.engTurma.TT)})` : ''}` : 'tem engajamento registrado na GeekieOne'}${perf!=null ? ` e acertou ${pct(perf)} das questões` : ''}. ${gap.length ? `Em ${gap.map(f=>f.short).join(', ')} a distância entre a AQ e o simulado passou de 3 pontos: o conteúdo foi estudado, mas ainda não está consolidado para a situação de prova — tempo controlado, questões misturadas, sem consulta. É exatamente o que se treina.` : 'A distância entre a AQ (atividades) e o simulado é pequena, sinal de que o estudo está se convertendo em desempenho.'} ${d.badWeeks.length ? `Houve ${d.badWeeks.length} semana${d.badWeeks.length>1?'s':''} com três ou mais atividades pendentes (${d.badWeeks.map(brDate).join(', ')}).` : 'Não houve semana com acúmulo de atividades pendentes.'}`;
  /* assessoria */
  const pres = d.parsed ? d.parsed.presenca.filter(p=>p.pct!=null) : [];
  let assess = '';
  if (pres.length) { const first = pres[0], last = pres[pres.length-1]; assess += last.pct > first.pct ? `A presença nos atendimentos evoluiu de ${first.pct}% em ${first.mes.toLowerCase()} para ${last.pct}% em ${last.mes.toLowerCase()}. ` : last.pct>=80 ? `A presença nos atendimentos se manteve alta (${pres.map(p=>`${p.mes.toLowerCase()} ${p.pct}%`).join(', ')}). ` : `A presença nos atendimentos ainda oscila (${pres.map(p=>`${p.mes.toLowerCase()} ${p.pct}%`).join(', ')}) — e é o primeiro ponto a firmar. `; }
  if (d.parsed && d.parsed.secoes.conclusao) assess += `A conclusão da assessoria é clara: "${d.parsed.secoes.conclusao}" `;
  assess += `Do lado da família, o apoio mais valioso é incentivar ${g.a} ${nome} a levar dúvidas por escrito e a verbalizar o raciocínio nos atendimentos.`;
  /* perfil e plano */
  const perfil = `${g.Al} ${eng!=null&&eng>=0.85 ? 'é disciplinad'+(sexo(d)==='F'?'a':'o')+' no processo (alto engajamento nas atividades)' : 'ainda constrói a rotina de entregas'}${cresceu ? ', respondeu ao acompanhamento no '+B+'º trimestre' : ''} e tem um ponto de desenvolvimento bem definido: ${gap.length ? 'transformar estudo em desempenho sob pressão de prova' : (d.abaixoPosB.length ? 'consolidar o conteúdo de '+d.abaixoPosB.map(f=>f.short).join(' e ') : 'manter a consistência')}.`;
  const prox = B < 3 ? `${B+1}º trimestre` : 'próximo ano letivo';
  const plano = [];
  const maesBaixas = [...new Set(d.abaixoPosB.map(f=>f.mae))];
  maesBaixas.slice(0,2).forEach(m => { const fs = d.abaixoPosB.filter(f=>f.mae===m); const pj = d.proj.find(p=>p.mae===m); plano.push({titulo: `${m}: fechar o ano acima de 7`, itens: [`Meta: nota de fase ≥ 7,0 em ${fs.map(f=>f.short).join(' e ')}${pj && pj.need!=null ? `; para a aprovação direta, ${f1(Math.max(pj.need,0))} no ${prox}` : ''}.`, 'Assessoria: lista semanal de questões de prova com correção comentada.', 'Em casa: revisão dos conteúdos do trimestre que caíram no simulado antes das próximas provas.']}); });
  if (gap.length) plano.push({titulo:'Simulado (AE2): treinar a prova, não só o conteúdo', itens:[`Meta: AE2 geral ≥ ${f1(Math.min(10, Math.max((rB.ae2||5)+1, 6)))} (hoje ${f1(rB.ae2)}).`, 'Um simulado cronometrado por quinzena com a assessoria; análise dos erros por tipo (conteúdo × leitura × tempo).', 'Em casa: um bloco semanal de 60 minutos só de questões, sem celular, no mesmo horário.']});
  plano.push({titulo:'Manter o que já funciona', itens:[comAssess ? 'Presença integral na Assessoria, com dúvidas escritas a cada atendimento.' : 'Rotina semanal de estudo combinada com a família.', `GeekieOne em dia${eng!=null ? ` (hoje ${pct(eng)})` : ''} e as disciplinas acima de 7 no patamar atual.`, d.edf && d.edf[1].inf && (d.edf[1].f+d.edf[1].j)/d.edf[1].inf>=0.25 ? 'Educação Física: zerar faltas ou formalizar as justificativas.' : 'Frequência: manter o padrão atual.']});
  while (plano.length < 2) plano.push({titulo:'Aprofundar', itens:['Desafios adicionais nas disciplinas em que já está acima de 8.', 'Monitoria de colegas como forma de consolidar o conteúdo.']});
  const papeis = {aluno:['Levar dúvidas escritas a cada atendimento.','Bloco semanal de estudo sem celular.','GeekieOne em dia e foco em sala.'], familia:['Perguntar, toda semana, como foi o atendimento.','Garantir o horário do bloco de estudo em casa.','Avisar a escola sobre mudanças de rotina ou faltas.'], assessoria:['Lista semanal com correção comentada.','Simulado cronometrado quinzenal e análise de erros.','Revisão dirigida nas frentes abaixo de 7.'], direcao:['Monitorar semanalmente engajamento e entregas no Painel.',`Retorno à família após a primeira prova do ${prox}.`,'Reunião de fechamento ao fim do trimestre, neste mesmo formato.']};
  const fecho = [
    `Se eu tivesse que resumir este relatório em uma frase, seria esta: ${cresceu ? `${g.a} ${nome} mostrou, no ${B}º trimestre, que responde ao acompanhamento` : `${g.a} ${nome} tem um caminho claro para o ${prox}`}. ${d.abaixoPosB.length ? `Os desafios que restam — ${d.abaixoPosB.map(f=>f.short).join(', ')} — estão identificados, têm metas numéricas e um plano compartilhado entre a Assessoria, os professores e a Direção de Desempenho.` : 'Não há pendência aberta, e o foco passa a ser sustentar o patamar e aprofundar.'}`,
    `O que peço ${T.obj==='lhe' ? 'a '+T.trat : 'a vocês'} é o que já ${T.obj==='lhe' ? 'tem' : 'têm'} feito: estar perto. Perguntar como foi a semana, reservar com ${g.ela} o bloco de estudo sem celular, celebrar as conquistas e nos avisar sempre que notar algo diferente — no humor, na rotina ou nas faltas. Do nosso lado, voltaremos a conversar ao fim do ${prox} com a mesma transparência deste documento.`,
    `Estou à disposição para uma conversa pessoal, quando for conveniente.`
  ];
  return {carta, areas, recup, rotina, assess, perfil, plano: plano.slice(0,4), papeis, fecho};
}
