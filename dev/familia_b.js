/* ---- textos por IA (Claude API) ---- */
function famDossierText(d) {
  const L = [], A = d.tA, B = d.tB, f1 = fmt;
  L.push(`Estudante: ${d.nome} (${d.g.al}) · ${d.turma} · trimestres comparados: ${A}º (${A===1?'sem Assessoria':'anterior'}) e ${B}º (com Assessoria). Destinatário: ${d.destNome || 'família'} (tratamento: ${d.destTrat.trat}).`);
  [A,B].forEach(t => { const r = d.resumo[t], p = d.pos[t]; L.push(`RESUMO ${t}º TRI: AE1 ${f1(r.ae1)} · AE2 ${f1(r.ae2)} · AQ ${f1(r.aq)} · média ${f1(r.fase)} (após recuperação ${f1(r.final)}) · posição ${p.pos||'—'}/${p.tot} · turma: AE1 ${f1(p.turma.ae1)} AE2 ${f1(p.turma.ae2)} AQ ${f1(p.turma.aq)} média ${f1(p.turma.med)}`); });
  L.push('POR FRENTE (AE1/AE2/AQ/fase | rec → final | média da turma):');
  d.fr.forEach(f => L.push(`- ${f.nice} [${f.area}]: ` + [A,B].map(t => { const x = f.t[t]; return x ? `${t}º ${f1(x.ae1)}/${f1(x.ae2)}/${f1(x.aq)}/${f1(x.fase)}${x.emRec ? ` | rec ${x.rec==null?'não fez':f1(x.rec)} → ${f1(x.final)}` : ''} | turma ${f1(x.turma)}` : `${t}º —`; }).join(' ‖ ')));
  L.push(`RECUPERAÇÕES: ${[A,B].map(t => { const r = d.recResumo[t]; return `${t}º: ${r.frentesAbaixo} frentes <7, recuperou ${r.frentesRec}, não fez ${r.frentesNaoFez}`; }).join(' · ')}. Ainda abaixo de 7 após a recuperação do ${B}º: ${d.abaixoPosB.map(f=>f.nice).join(', ')||'nenhuma'}.`);
  L.push(`PROJEÇÃO (21 pontos para aprovação direta): ` + d.proj.map(p => `${p.mae} soma ${f1(p.soma)}${p.need!=null ? ` precisa ${f1(Math.max(p.need,0))}` : ''} (${p.sit[1]})`).join('; '));
  const eng = d.eng.T ? d.eng.F/d.eng.T : null, perf = d.eng.R ? d.eng.K/d.eng.R : null;
  L.push(`GEEKIE (ano): ${d.eng.F}/${d.eng.T} atividades (${pct(eng)}; turma ${d.engTurma.TT?pct(d.engTurma.TF/d.engTurma.TT):'—'}), acertos ${pct(perf)} (turma ${d.engTurma.TR?pct(d.engTurma.TK/d.engTurma.TR):'—'}). Por trimestre: ` + [A,B].map(t => { const g = d.gkTri[t]; return `${t}º ${g.T?pct(g.F/g.T):'—'} entregas, ${g.R?pct(g.K/g.R):'—'} acertos`; }).join(' · ') + `. Semanas com 3+ pendências: ${d.badWeeks.map(brDate).join(', ')||'nenhuma'}.`);
  d.gkAno.forEach(x => L.push(`- Geekie ${x.disc}: ${x.fez}/${x.total} · ${x.resp?pct(x.ok/x.resp):'—'} de acerto`));
  L.push(`FREQUÊNCIA: ${d.freq.tot.f+d.freq.tot.j} faltas em ${d.freq.tot.inf} aulas (${pct(d.freq.tot.inf?(d.freq.tot.f+d.freq.tot.j)/d.freq.tot.inf:null)}). ` + Object.entries(d.freq.byDisc).filter(([k,x])=>x.f+x.j).map(([k,x])=>`${k}: ${x.f+x.j}/${x.inf} (${x.datasF.map(s=>s.slice(5)).join(', ')})`).join('; '));
  L.push(`OCORRÊNCIAS: ${d.oc.length}. ` + d.oc.map(o=>`${brDateFull(o.dt)} ${o.tipo}: ${o.obs.slice(0,200)}`).join(' | '));
  if (d.parsed) { L.push(`RELATÓRIO DA ASSESSORIA (${d.assessor||'assessor(a)'}): presença ${d.parsed.presenca.map(p=>`${p.mes} ${p.texto}`).join('; ')}.`); Object.entries(d.parsed.secoes).forEach(([k,v]) => L.push(`- ${k}: ${v}`)); if (d.parsed.recomendacoes.length) L.push(`- recomendações: ${d.parsed.recomendacoes.join(' / ')}`); }
  if (d.obs) L.push(`OBSERVAÇÕES DA DIREÇÃO: ${d.obs}`);
  return L.join('\n');
}
async function famAiTexts(d) {
  const key = localStorage.getItem('hab_ai_key') || '', model = localStorage.getItem('hab_ai_model') || 'claude-sonnet-5';
  if (!key) throw new Error('Sem chave da API — configure em "⚙️ Configurar IA".');
  const areas = [...new Set(d.fr.map(f=>f.area))];
  const system = `Você é Arthur Lira, Diretor de Desempenho da Escola Habilis (João Pessoa, PB), escrevendo um relatório individual à família de um estudante do Ensino Médio/Fundamental. Use a técnica de Rapport: abra agradecendo e reconhecendo o cuidado da família, antecipe a conclusão positiva, apresente os desafios como "próximo degrau" (nomeados, medidos, com plano), fale em "nós" (escola + família) e feche pedindo parceria concreta. Português do Brasil, tom caloroso e preciso, sem jargão vazio e sem exageros; cite números exatos dos dados. Dirija-se ao destinatário como "${d.destTrat.trat}" e refira-se ${d.g.ao} estudante como "${d.g.a} ${d.curto}" / "${d.g.ela}". Nunca invente dados. Responda SOMENTE com um JSON válido, sem comentários, com exatamente estas chaves:
{"carta":[4 parágrafos], "areas":{${areas.map(a=>`"${a}":"parágrafo de leitura pedagógica da área (frentes, provas, simulado, recuperação, comparação com a turma)"`).join(', ')}}, "recup":"parágrafo comparando as recuperações dos dois trimestres", "rotina":"parágrafo sobre engajamento Geekie e a distância entre AQ e simulado", "assess":"parágrafo com a leitura da Direção sobre o relatório da assessoria (3 ou 4 traços, com o papel da família)", "perfil":"parágrafo-perfil do estudante nos dados", "plano":[{"titulo":"...","itens":["meta numérica","ação da assessoria/escola","ação em casa"]} ×3 ou 4], "papeis":{"aluno":[3 itens],"familia":[3 itens],"assessoria":[3 itens],"direcao":[3 itens]}, "fecho":[3 parágrafos; o último é um convite curto à conversa]}`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {method:'POST', headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body: JSON.stringify({model, max_tokens: 4000, system, messages:[{role:'user', content:'Dados do estudante:\n\n'+famDossierText(d)+'\n\nEscreva os textos do relatório em JSON.'}]})});
  if (!r.ok) { let m = 'HTTP '+r.status; try { const j = await r.json(); m += ' — '+(j.error?.message||''); } catch(e){} throw new Error(m); }
  const j = await r.json();
  let txt = (j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('').trim();
  const i = txt.indexOf('{'), k = txt.lastIndexOf('}'); if (i<0 || k<0) throw new Error('A IA não devolveu JSON.');
  const t = JSON.parse(txt.slice(i, k+1));
  const base = famRuleTexts(d);                         // completa o que faltar
  for (const kk of Object.keys(base)) if (t[kk]==null) t[kk] = base[kk];
  return t;
}

/* ---- gráficos (SVG) ---- */
function famSvgBars(d) {
  const A = d.tA, B = d.tB, ids = d.fr, n = ids.length, w = 720, h = 300, left = 34, right = 10, top = 16, bottom = 86;
  const gw = (w-left-right)/n, bw = gw*0.26, y = v => top + (h-top-bottom)*(1-v/10);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" font-family="Poppins, Segoe UI, sans-serif" font-size="9">`;
  for (let g=0; g<=10; g+=2) s += `<line x1="${left}" x2="${w-right}" y1="${y(g)}" y2="${y(g)}" stroke="${FAM_C.line}"/><text x="${left-6}" y="${y(g)+3}" text-anchor="end" fill="${FAM_C.muted}">${g}</text>`;
  s += `<line x1="${left}" x2="${w-right}" y1="${y(7)}" y2="${y(7)}" stroke="${FAM_C.magenta}" stroke-width="1.2" stroke-dasharray="4 3"/><text x="${w-right}" y="${y(7)-4}" text-anchor="end" fill="${FAM_C.magenta}" font-weight="600">média 7,0</text>`;
  ids.forEach((f, k) => {
    const x0 = left + k*gw + (gw-3*bw)/2, vals = [[f.t[A]&&f.t[A].fase, FAM_C.teal1], [f.t[B]&&f.t[B].fase, FAM_C.teal], [f.t[B]&&f.t[B].turma, FAM_C.yellow]];
    vals.forEach(([v,c],j) => { if (v==null) return; s += `<rect x="${(x0+j*bw).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw-1).toFixed(1)}" height="${(y(0)-y(v)).toFixed(1)}" fill="${c}" rx="1.5"/>`; });
    if (vals[0][0]!=null) s += `<text x="${(x0+bw*0.5).toFixed(1)}" y="${(y(vals[0][0])-3).toFixed(1)}" text-anchor="middle" fill="${FAM_C.muted}" font-size="8">${fmt(vals[0][0])}</text>`;
    if (vals[1][0]!=null) s += `<text x="${(x0+bw*1.5).toFixed(1)}" y="${(y(vals[1][0])-3).toFixed(1)}" text-anchor="middle" fill="${FAM_C.teal}" font-size="8" font-weight="700">${fmt(vals[1][0])}</text>`;
    s += `<text transform="translate(${(left+k*gw+gw/2).toFixed(1)},${h-bottom+12}) rotate(-38)" text-anchor="end" fill="${FAM_C.ink}" font-size="8.5">${esc(f.short)}</text>`;
  });
  let lx = left; [[FAM_C.teal1,`Nota de fase · ${A}º trimestre`],[FAM_C.teal,`Nota de fase · ${B}º trimestre`],[FAM_C.yellow,`Média da turma · ${B}º trimestre`]].forEach(([c,t]) => { s += `<rect x="${lx}" y="${h-18}" width="10" height="10" fill="${c}" rx="2"/><text x="${lx+14}" y="${h-10}" fill="${FAM_C.ink}">${t}</text>`; lx += 190; });
  return s + '</svg>';
}
function famSvgComp(d) {
  const A = d.tA, B = d.tB, comps = [['AE1 · provas','ae1'],['AE2 · simulado','ae2'],['AQ · Geekie','aq'],['Nota de fase','fase']], w = 720, h = 230, left = 34, top = 18, bottom = 44, pw = (w-left)/4, y = v => top + (h-top-bottom)*(1-v/10);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" font-family="Poppins, Segoe UI, sans-serif" font-size="9">`;
  for (let g=0; g<=10; g+=2) s += `<line x1="${left}" x2="${w}" y1="${y(g)}" y2="${y(g)}" stroke="${FAM_C.line}"/><text x="${left-6}" y="${y(g)+3}" text-anchor="end" fill="${FAM_C.muted}">${g}</text>`;
  s += `<line x1="${left}" x2="${w}" y1="${y(7)}" y2="${y(7)}" stroke="${FAM_C.magenta}" stroke-dasharray="4 3"/>`;
  comps.forEach(([lab,key],k) => {
    const x1 = left+k*pw+pw*0.3, x2 = left+k*pw+pw*0.7, a1 = d.resumo[A][key], a2 = d.resumo[B][key], tk = key==='fase'?'med':key, t1 = d.pos[A].turma[tk], t2 = d.pos[B].turma[tk];
    if (t1!=null && t2!=null) s += `<line x1="${x1}" y1="${y(t1)}" x2="${x2}" y2="${y(t2)}" stroke="${FAM_C.yellow}" stroke-width="2.5"/>`;
    if (a1!=null && a2!=null) s += `<line x1="${x1}" y1="${y(a1)}" x2="${x2}" y2="${y(a2)}" stroke="${FAM_C.teal}" stroke-width="3"/>`;
    [[x1,t1,FAM_C.yellow],[x2,t2,FAM_C.yellow],[x1,a1,FAM_C.teal],[x2,a2,FAM_C.teal]].forEach(([x,v,c]) => { if (v!=null) s += `<circle cx="${x}" cy="${y(v)}" r="4" fill="${c}" stroke="#fff" stroke-width="1.5"/>`; });
    if (a1!=null) s += `<text x="${x1}" y="${y(a1)-9}" text-anchor="middle" fill="${FAM_C.teal}" font-weight="700">${fmt(a1)}</text>`;
    if (a2!=null) s += `<text x="${x2}" y="${y(a2)-9}" text-anchor="middle" fill="${FAM_C.teal}" font-weight="700">${fmt(a2)}</text>`;
    s += `<text x="${x1}" y="${h-bottom+14}" text-anchor="middle" fill="${FAM_C.muted}" font-size="8">${A}º tri</text><text x="${x2}" y="${h-bottom+14}" text-anchor="middle" fill="${FAM_C.muted}" font-size="8">${B}º tri</text><text x="${left+k*pw+pw/2}" y="${h-bottom+28}" text-anchor="middle" fill="${FAM_C.ink}" font-weight="600">${lab}</text>`;
  });
  s += `<rect x="${left}" y="${h-9}" width="10" height="10" fill="${FAM_C.teal}" rx="2"/><text x="${left+14}" y="${h}" fill="${FAM_C.ink}">${esc(d.curto)}</text><rect x="${left+110}" y="${h-9}" width="10" height="10" fill="${FAM_C.yellow}" rx="2"/><text x="${left+124}" y="${h}" fill="${FAM_C.ink}">Média da turma</text>`;
  return s + '</svg>';
}

/* ---- montagem do relatório (páginas A4) ---- */
function famHtml(d, T) {
  const A = d.tA, B = d.tB, g = d.g, rA = d.resumo[A], rB = d.resumo[B], pA = d.pos[A], pB = d.pos[B];
  const f1 = fmt, cls = v => v==null ? 'na' : v>=7 ? 'ok' : 'bad', hoje = new Date().toLocaleDateString('pt-BR', {day:'numeric', month:'long', year:'numeric'});
  const unidade = d.unit==='Sul' ? 'Unidade Sul' : 'Unidade Bessa';
  const serieLbl = /série/.test(d.serie) ? `${d.serie} do Ensino Médio` : `${d.serie} do Ensino Fundamental`;
  const P = (t) => `<p>${t}</p>`, ps = arr => (arr||[]).map(x => `<p>${esc(x)}</p>`).join('');
  let pn = 0;
  const page = (inner, cover) => { pn++; return `<section class="fpage${cover?' fcover':''}">${inner}${cover?'':`<footer><span>Escola Habilis · Direção de Desempenho</span><span>Relatório de Acompanhamento Individual — ${esc(d.nome)}</span><span>página ${pn}</span></footer>`}</section>`; };
  const head = (title, kicker) => `<div class="fhead"><div><div class="fkicker">${kicker}</div><h2>${title}</h2></div><img src="${FAM_LOGO}" class="fminilogo" alt=""></div>`;
  const dots = () => { const cols = [FAM_C.yellow,FAM_C.magenta,FAM_C.teal,FAM_C.yellow,FAM_C.teal,FAM_C.magenta,FAM_C.yellow,FAM_C.teal,FAM_C.magenta,FAM_C.yellow,FAM_C.teal], rad = [9,6,11,7,9,6,11,7,9,6,8]; let x = 10, s = '<svg viewBox="0 0 300 36" width="230">'; cols.forEach((c,i) => { const r = rad[i], y = 18 + (r<8?6:r>9?-4:0); s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`; x += 28; }); return s+'</svg>'; };
  const meter = (p, c, w=120) => `<span class="fmeter" style="width:${w}px"><span style="width:${Math.max(0,Math.min(100,p))}%;background:${c}"></span></span>`;
  const kpi = (label, v1, v2, sub, goodUp=true, fmtf=f1, dfmt=null) => { let dtxt = ''; if (v1!=null && v2!=null) { const dd = v2-v1, good = dd===0 ? null : (dd>0)===goodUp, arrow = good==null?'▬':good?'▲':'▼', c = good==null ? FAM_C.muted : good ? FAM_C.teal : FAM_C.magenta; dtxt = `<span class="fkd" style="color:${c}">${arrow} ${dfmt ? dfmt(dd) : (dd>0?'+':'')+fmtf(dd)}</span>`; } return `<div class="fkpi"><div class="fkl">${label}</div><div class="fkv"><span class="fk1">${fmtf(v1)}</span><span class="fkarr">→</span><span class="fk2">${fmtf(v2)}</span></div>${dtxt}<div class="fks">${sub||''}</div></div>`; };
  const posf = v => v==null ? '—' : `${Math.round(v)}º`, intf = v => v==null ? '—' : String(Math.round(v));
  const eng = d.eng.T ? d.eng.F/d.eng.T : null, perf = d.eng.R ? d.eng.K/d.eng.R : null, fp = d.freq.tot.inf ? (d.freq.tot.f+d.freq.tot.j)/d.freq.tot.inf : null;
  const comAssess = !!(d.parsed && (d.parsed.presenca.length || Object.keys(d.parsed.secoes).length));
  /* 1 capa */
  const capa = page(`<div class="fcoverin"><div class="fdots">${dots()}</div><img src="${FAM_LOGO}" class="flogo" alt="Habilis"><div class="fcover-k">Direção de Desempenho · Relatório de Acompanhamento Individual</div><h1>${esc(d.nome)}</h1>
    <div class="fchips"><span>${esc(serieLbl)}</span><span>${esc(unidade)}</span>${d.sel.matricula?`<span>Matrícula ${esc(d.sel.matricula)}</span>`:''}</div>
    <p class="fcover-sub">Evolução do ${A}º para o ${B}º trimestre de 2026${comAssess?' — antes e depois da Assessoria —':''}<br>com leitura das recuperações e os desafios para o ${B<3?(B+1)+'º trimestre':'fechamento do ano'}.</p>
    <div class="fcover-box"><div><b>Para</b><br>${esc(d.destNome || 'a família de '+d.curto)}</div><div><b>Emitido em</b><br>${hoje}</div><div><b>Fontes</b><br>ActiveSoft · GeekieOne · Painel de Desempenho${comAssess?' · Relatório da Assessoria':''}</div></div><div class="fdots">${dots()}</div></div>`, true);
  /* 2 carta */
  const carta = page(head('Uma conversa antes dos números', 'Carta à família') + `<div class="fletter"><p>${esc(d.destTrat.sauda)}</p>${ps(T.carta)}<p class="fsign-inline">Com estima,<br><b>Arthur Lira</b> — Diretor de Desempenho</p></div>
    <div class="fhowto"><h3>Como ler este relatório</h3><ul><li><b>AE1</b> — provas individuais por disciplina (peso 10). <b>AE2</b> — simulado do trimestre (peso 10). <b>AQ</b> — nota de engajamento nas atividades da plataforma GeekieOne (peso 10).</li>
    <li><b>Nota de fase</b> = média de AE1, AE2 e AQ. Abaixo de <b>7,0</b> a frente vai para recuperação; a nota final do trimestre passa a ser a <b>maior</b> entre a nota de fase e a da recuperação.</li>
    <li>Nas disciplinas com duas <b>frentes</b> (A e B), a nota da disciplina é a média das duas. Média das frentes abaixo de 7: recuperação <b>obrigatória</b>; só uma frente abaixo: <b>facultativa</b>.</li>
    <li><b>Aprovação direta</b>: somar <b>21 pontos</b> nas médias dos três trimestres. Educação Física não entra nas médias.</li>
    <li>Cores: <span class="ftag ok">verde-água</span> para 7,0 ou mais; <span class="ftag bad">magenta</span> para abaixo de 7,0; <span class="ftag warn">âmbar</span> para pontos de atenção.</li></ul></div>`);
  /* 3 relance */
  const timeline = [];
  timeline.push([FAM_C.teal1, `${A}º tri`, `<b>${A}º trimestre${A===1&&comAssess?', sem Assessoria':''}.</b> Média ${f1(rA.fase)}${pA.pos?`, ${pA.pos}ª posição`:''}, ${d.abaixoA.length} frente${d.abaixoA.length===1?'':'s'} abaixo de 7. AE1 ${f1(rA.ae1)} · AE2 ${f1(rA.ae2)} · AQ ${f1(rA.aq)}.${d.recResumo[A].frentesAbaixo?` Na recuperação, reverteu ${d.recResumo[A].frentesRec} de ${d.recResumo[A].frentesAbaixo}.`:''}`]);
  if (comAssess && d.parsed.presenca.length) timeline.push([FAM_C.yellow, 'Assessoria', `<b>Acompanhamento da Assessoria${d.assessor?' ('+esc(d.assessor)+')':''}.</b> Presença: ${d.parsed.presenca.map(p=>`${p.mes.toLowerCase()} ${esc(p.texto.replace(/\s*\(.*\)\s*/,''))}`).join(' · ')}.`]);
  timeline.push([FAM_C.teal, `${B}º tri`, `<b>${B}º trimestre${comAssess?', com Assessoria':''}.</b> Média ${f1(rB.fase)}${pB.pos?`, ${pB.pos}ª posição`:''}; AE1 ${f1(rB.ae1)} · AE2 ${f1(rB.ae2)} · AQ ${f1(rB.aq)}.${d.oc.filter(o=>triOfDate(d.serie,o.dt)===B).length?` Ocorrência em ${d.oc.filter(o=>triOfDate(d.serie,o.dt)===B).map(o=>brDate(o.dt)).join(', ')}.`:''}`]);
  if (d.recResumo[B].frentesAbaixo) timeline.push([FAM_C.magenta, 'Recuperação', `<b>Recuperação do ${B}º trimestre.</b> ${d.recResumo[B].frentesRec} de ${d.recResumo[B].frentesAbaixo} frentes recuperadas${d.abaixoPosB.length?`; seguem abaixo de 7: ${d.abaixoPosB.map(f=>esc(f.short)).join(', ')}`:''}.`]);
  const relance = page(head(`${g.a==='a'?'A':'O'} ${esc(d.curto)} em um relance`, 'Resumo executivo') +
    `<div class="fkpis">${kpi('Média geral (nota de fase)', rA.fase, rB.fase, `após a recuperação: <b>${f1(rB.final)}</b> · turma: ${f1(pA.turma.med)} → ${f1(pB.turma.med)}`)}${kpi('Posição na turma', pA.pos, pB.pos, `entre ${pA.tot} e ${pB.tot} estudantes`, false, posf, dd => dd===0 ? 'manteve' : `${dd<0?'subiu':'desceu'} ${Math.abs(dd)} posiç${Math.abs(dd)===1?'ão':'ões'}`)}${kpi('Frentes abaixo de 7,0', d.abaixoA.length, d.abaixoB.length, `após a recuperação: <b>${d.abaixoPosA.length} → ${d.abaixoPosB.length}</b>${d.abaixoPosB.length?` (${d.abaixoPosB.map(f=>esc(f.short)).join(', ')})`:''}`, false, intf, dd => (dd>0?'+':'')+dd)}
    ${kpi('AE1 · provas por disciplina', rA.ae1, rB.ae1, `turma: ${f1(pA.turma.ae1)} → ${f1(pB.turma.ae1)}`)}${kpi('AE2 · simulado', rA.ae2, rB.ae2, `turma: ${f1(pA.turma.ae2)} → ${f1(pB.turma.ae2)}`)}${kpi('AQ · engajamento Geekie', rA.aq, rB.aq, `turma: ${f1(pA.turma.aq)} → ${f1(pB.turma.aq)}`)}</div>
    <div class="ftiles"><div class="ftile"><div class="ftv">${pct(eng)}</div><div class="ftl">Engajamento GeekieOne</div><div class="fts">${d.eng.F} de ${d.eng.T} atividades${d.engTurma.TT?` · turma ${pct(d.engTurma.TF/d.engTurma.TT)}`:''}</div></div><div class="ftile"><div class="ftv">${pct(perf)}</div><div class="ftl">Acertos na GeekieOne</div><div class="fts">${Math.round(d.eng.K)} acertos em ${d.eng.R} questões</div></div><div class="ftile"><div class="ftv">${pct(fp)}</div><div class="ftl">Faltas no ano</div><div class="fts">${d.freq.tot.f+d.freq.tot.j} faltas${d.edf&&(d.edf[1].f+d.edf[1].j)?` — ${d.edf[1].f+d.edf[1].j} em Ed. Física`:''}</div></div><div class="ftile"><div class="ftv">${d.oc.length}</div><div class="ftl">Ocorrência${d.oc.length===1?'':'s'} disciplinar${d.oc.length===1?'':'es'}</div><div class="fts">${d.oc.length?`${brDate(d.oc[d.oc.length-1].dt)} · ${esc(d.oc[d.oc.length-1].obs.slice(0,40).toLowerCase())}`:'nenhuma no período'}</div></div></div>
    <h3>Linha do tempo</h3><div class="ftimeline">${timeline.map(([c,w,t]) => `<div class="ftl-item"><div class="ftl-dot" style="background:${c}"></div><div class="ftl-when">${w}</div><div class="ftl-what">${t}</div></div>`).join('')}</div>
    <h3>Os três componentes da nota, lado a lado com a turma</h3><div class="fchart">${famSvgComp(d)}</div>`);
  /* 4 comparativo */
  let rowsHtml = '', areaPrev = null;
  d.fr.forEach(f => { if (f.area!==areaPrev) { rowsHtml += `<tr class="farea"><td colspan="15">${esc(f.area)}</td></tr>`; areaPrev = f.area; }
    const c = t => { const x = f.t[t]; if (!x) return '<td>—</td>'.repeat(6); const rec = !x.emRec ? '<td class="rec">—</td>' : x.rec==null ? '<td class="rec nr">não fez</td>' : `<td class="rec">${f1(x.rec)}</td>`; return `<td class="${cls(x.ae1)}">${f1(x.ae1)}</td><td class="${cls(x.ae2)}">${f1(x.ae2)}</td><td class="${cls(x.aq)}">${f1(x.aq)}</td><td class="fase ${cls(x.fase)}">${f1(x.fase)}</td>${rec}<td class="fase ${cls(x.final)}">${f1(x.final)}</td>`; };
    const dd = f.t[A]&&f.t[B]&&f.t[A].fase!=null&&f.t[B].fase!=null ? f.t[B].fase-f.t[A].fase : null;
    rowsHtml += `<tr><td class="lab">${esc(f.nice)}</td>${c(A)}${c(B)}<td class="delta ${dd==null?'':dd>0.05?'up':dd<-0.05?'down':'flat'}">${dd==null?'—':(dd>0?'+':'')+f1(dd)}</td><td class="turma">${f1(f.t[B]&&f.t[B].turma)}</td></tr>`; });
  const dtot = rA.fase!=null&&rB.fase!=null ? rB.fase-rA.fase : null;
  rowsHtml += `<tr class="ftot"><td class="lab">Média geral</td><td>${f1(rA.ae1)}</td><td>${f1(rA.ae2)}</td><td>${f1(rA.aq)}</td><td class="fase ${cls(rA.fase)}">${f1(rA.fase)}</td><td></td><td class="fase ${cls(rA.final)}">${f1(rA.final)}</td><td>${f1(rB.ae1)}</td><td>${f1(rB.ae2)}</td><td>${f1(rB.aq)}</td><td class="fase ${cls(rB.fase)}">${f1(rB.fase)}</td><td></td><td class="fase ${cls(rB.final)}">${f1(rB.final)}</td><td class="delta ${dtot==null?'':dtot>0?'up':'down'}">${dtot==null?'—':(dtot>0?'+':'')+f1(dtot)}</td><td class="turma">${f1(pB.turma.med)}</td></tr>`;
  const comparativo = page(head('Disciplina por disciplina', `Comparativo ${A}º × ${B}º trimestre`) + `<p class="flead">A tabela traz as três notas de cada trimestre, a nota de fase, a nota da recuperação, a nota final de cada trimestre, a variação e a média da turma.</p>
    <table class="fcomp wide"><thead><tr><th rowspan="2" class="lab">Disciplina</th><th colspan="6" class="g1">${A}º trimestre${A===1&&comAssess?' · sem assessoria':''}</th><th colspan="6" class="g2">${B}º trimestre${comAssess?' · com assessoria':''}</th><th rowspan="2">Δ fase</th><th rowspan="2">Turma ${B}º</th></tr><tr><th>AE1</th><th>AE2</th><th>AQ</th><th>Fase</th><th>Rec.</th><th>Final</th><th>AE1</th><th>AE2</th><th>AQ</th><th>Fase</th><th>Rec.</th><th>Final</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="fchart">${famSvgBars(d)}</div>`);
  /* 5 áreas */
  const areaCols = {'Linguagens':FAM_C.teal,'Ciências Humanas':FAM_C.magenta,'Ciências da Natureza':FAM_C.yellow,'Matemática':FAM_C.grey,'Outras':FAM_C.grey};
  const cards = FAM_AREAS.filter(a => d.fr.some(f=>f.area===a)).map(a => `<div class="facard" style="border-top-color:${areaCols[a]}"><h3>${esc(a)}</h3><table class="fmini"><thead><tr><th>Frente</th><th>${A}º</th><th>${B}º</th><th>Final ${B}º</th><th>Turma</th></tr></thead><tbody>${d.fr.filter(f=>f.area===a).map(f => `<tr><td>${esc(f.short)}</td><td class="${cls(f.t[A]&&f.t[A].fase)}">${f1(f.t[A]&&f.t[A].fase)}</td><td class="${cls(f.t[B]&&f.t[B].fase)}">${f1(f.t[B]&&f.t[B].fase)}</td><td class="${cls(f.t[B]&&f.t[B].final)}">${f1(f.t[B]&&f.t[B].final)}</td><td class="turma">${f1(f.t[B]&&f.t[B].turma)}</td></tr>`).join('')}</tbody></table><p>${esc(T.areas[a]||'')}</p></div>`).join('');
  const areas = page(head('O que cada área nos conta', 'Leitura pedagógica') + `<p class="flead">Os números ganham sentido quando lidos por área. Abaixo, o que cada uma revela sobre o momento ${g.dela==='dela'?'da':'do'} ${esc(d.curto)}, comparando o ${A}º e o ${B}º trimestre.</p><div class="facards">${cards}</div>`);
  /* 6 recuperações */
  const recTable = t => { const fs = d.fr.filter(f => f.t[t] && f.t[t].fase!=null && f.t[t].fase<7); if (!fs.length) return `<h3>${t}º trimestre</h3><p class="fsmall">Nenhuma frente abaixo de 7 — sem recuperação.</p>`;
    return `<h3>${t}º trimestre${t===1&&comAssess?' · sem Assessoria':comAssess?' · com Assessoria':''}</h3><table class="fcomp rec"><thead><tr><th class="lab">Frente</th><th>Recuperação</th><th>Nota de fase</th><th>Nota da recuperação</th><th>Nota final</th><th>Situação</th></tr></thead><tbody>${fs.map(f => { const x = f.t[t], caso = d.recs.find(c=>c.tri===t && normName(famMae(c.disc))===normName(f.mae)); const tipo = caso ? (caso.tipo==='obrig'?'obrigatória':'facultativa') : 'obrigatória'; const selo = x.rec==null ? '<span class="fselo pend">não realizada</span>' : x.final>=7 ? '<span class="fselo ok">recuperou</span>' : '<span class="fselo bad">não recuperou</span>'; return `<tr><td class="lab">${esc(f.nice)}</td><td>${tipo}</td><td class="${cls(x.fase)}">${f1(x.fase)}</td><td class="rec">${x.rec==null?'não realizou':f1(x.rec)}</td><td class="fase">${f1(x.final)}</td><td>${selo}</td></tr>`; }).join('')}</tbody></table>`; };
  const recup = page(head('As recuperações: o que foi retomado', `${A}º e ${B}º trimestres`) + `<p class="flead">A recuperação é a segunda chance de demonstrar o conteúdo e, para a família, um termômetro: mostra se a dificuldade era de <b>conteúdo</b> (persiste) ou de <b>preparo e organização</b> (reverte com estudo dirigido).</p>${recTable(A)}${recTable(B)}<div class="fcallout"><h4>Leitura da Direção de Desempenho</h4><p>${esc(T.recup)}</p></div>`);
  /* 7 rotina */
  const gkRows = d.gkAno.map(x => `<tr><td class="lab">${esc(x.disc)}</td><td>${x.fez}/${x.total}</td><td>${meter(x.total?100*x.fez/x.total:0, x.total&&x.fez/x.total>=0.85?FAM_C.teal:FAM_C.yellow, 70)} ${x.total?pct(x.fez/x.total):'—'}</td><td>${x.resp}</td><td>${meter(x.resp?100*x.ok/x.resp:0, x.resp&&x.ok/x.resp>=0.75?FAM_C.teal:FAM_C.yellow, 70)} ${x.resp?pct(x.ok/x.resp):'—'}</td></tr>`).join('');
  const gap = d.fr.filter(f => f.t[B] && f.t[B].aq!=null && f.t[B].ae2!=null && f.t[B].aq - f.t[B].ae2 >= 3);
  const rotina = page(head('Rotina, engajamento e convivência', 'Além das notas') + `<div class="ftwo"><div><h3>GeekieOne no ano letivo</h3><table class="fcomp mini2"><thead><tr><th class="lab">Disciplina</th><th>Feitas</th><th>Engajamento</th><th>Questões</th><th>Acertos</th></tr></thead><tbody>${gkRows}<tr class="ftot"><td class="lab">Total</td><td>${d.eng.F}/${d.eng.T}</td><td>${pct(eng)}</td><td>${d.eng.R}</td><td>${pct(perf)}</td></tr></tbody></table><p class="fsmall">${d.badWeeks.length?`Semanas com três ou mais atividades pendentes: ${d.badWeeks.map(brDate).join(', ')}.`:'Nenhuma semana com três ou mais atividades pendentes.'}</p></div>
    <div><h3>A distância entre fazer e provar</h3><p>${esc(T.rotina)}</p>${gap.length?`<table class="fcomp mini2"><thead><tr><th class="lab">Frente</th><th>AQ</th><th>AE2</th><th>Distância</th></tr></thead><tbody>${gap.map(f=>`<tr><td class="lab">${esc(f.short)}</td><td class="${cls(f.t[B].aq)}">${f1(f.t[B].aq)}</td><td class="${cls(f.t[B].ae2)}">${f1(f.t[B].ae2)}</td><td class="delta down">${f1(f.t[B].aq-f.t[B].ae2)}</td></tr>`).join('')}</tbody></table>`:''}
    <h3>GeekieOne por trimestre</h3><div class="ftiles small2">${[A,B].map(t => { const x = d.gkTri[t]; return `<div class="ftile"><div class="ftv">${x.T?pct(x.F/x.T):'—'}</div><div class="ftl">entregas · ${t}º tri</div><div class="fts">${x.R?pct(x.K/x.R):'—'} de acertos${x.turmaEng!=null?` · turma ${pct(x.turmaEng)}`:''}</div></div>`; }).join('')}</div></div></div>`);
  /* 8 frequência + convivência */
  const outrasFaltas = Object.entries(d.freq.byDisc).filter(([k,x]) => (x.f+x.j) && !(d.edf && k===d.edf[0]));
  const freqTxt = `${d.freq.tot.f+d.freq.tot.j} falta${d.freq.tot.f+d.freq.tot.j===1?'':'s'} no ano (${pct(fp)} das aulas)${fp!=null && fp<0.10 ? ' — frequência adequada' : fp!=null && fp>=0.25 ? ' — frequência em nível crítico' : ' — frequência que merece acompanhamento'}. ${outrasFaltas.length ? `Nas disciplinas com nota: ${outrasFaltas.map(([k,x])=>`${esc(k)} (${x.datasF.map(s=>s.slice(8,10)+'/'+s.slice(5,7)).join(', ')})`).join('; ')}.` : 'Nenhuma falta nas disciplinas com nota.'}`;
  const edfTxt = d.edf && (d.edf[1].f+d.edf[1].j) ? `<p class="fattn"><b>${esc(d.edf[0])} concentra ${d.edf[1].f+d.edf[1].j} falta${d.edf[1].f+d.edf[1].j===1?'':'s'} (${pct((d.edf[1].f+d.edf[1].j)/d.edf[1].inf)} das aulas)</b> — ${d.edf[1].datasF.map(s=>s.slice(8,10)+'/'+s.slice(5,7)).join(', ')}. Não entra na média, mas é componente obrigatório e a frequência conta para o ano letivo. Vale uma conversa em casa sobre o motivo e, se for o caso, formalizar a justificativa na secretaria.</p>` : '';
  const convTxt = d.oc.length ? d.oc.map(o => `<b>${brDateFull(o.dt)}</b> — "${esc(o.obs)}" (${esc(o.tipo)}${o.reg?`, registrada por ${esc(o.reg)}`:''}).`).join(' ') + (d.oc.length===1 ? ' É um registro pontual; desde então, nenhuma nova ocorrência.' : ` São ${d.oc.length} registros no período, o que pede acompanhamento conjunto da família e da coordenação.`) : 'Nenhuma ocorrência disciplinar registrada no período — um dado que merece reconhecimento.';
  const rotina2 = page(head('Frequência e convivência', 'Além das notas') + `<div class="ftwo"><div><h3>Frequência</h3><p>${freqTxt}</p>${edfTxt}</div><div><h3>Convivência</h3><p>${convTxt}</p></div></div>` + (d.obs ? `<div class="fcallout"><h4>Observações da Direção de Desempenho</h4><p>${esc(d.obs)}</p></div>` : ''));
  /* 9 assessoria */
  let assessPage = '';
  if (comAssess) {
    const pr = d.parsed.presenca, secs = d.parsed.secoes;
    const quotes = ['presenca','geekie','desafios','estrategias','conclusao'].filter(k=>secs[k]).map(k => `<blockquote>“${esc(secs[k])}”</blockquote>`).join('') + (d.parsed.outros.length && !Object.keys(secs).length ? d.parsed.outros.slice(0,6).map(q=>`<blockquote>“${esc(q)}”</blockquote>`).join('') : '');
    assessPage = page(head('O olhar de quem acompanha de perto', `Relatório da Assessoria · ${B}º trimestre`) + `<p class="flead">${d.assessor?`A assessoria de ${esc(d.assessor)} acompanha ${g.a} ${esc(d.curto)} ao longo do trimestre. `:''}Reproduzo abaixo os trechos centrais do relatório, porque descrevem, com a sensibilidade de quem está ao lado d${g.a} estudante toda semana, o que os números confirmam.</p>
      <div class="ftwo"><div>${pr.length?`<h3>Presença nos atendimentos</h3><table class="fcomp mini2"><tbody>${pr.map(p=>`<tr><td class="lab">${esc(p.mes)}</td><td>${esc(p.texto)}</td></tr>`).join('')}</tbody></table><div class="fmeters">${pr.filter(p=>p.pct!=null).map(p=>`<div><span>${esc(p.mes)}</span>${meter(p.pct, p.pct>=80?FAM_C.teal:p.pct>=50?FAM_C.yellow:FAM_C.magenta, 160)}<b>${p.pct}%</b></div>`).join('')}</div>`:''}
      ${d.parsed.recomendacoes.length?`<h3>Recomendações da assessoria</h3><ul class="frecs">${d.parsed.recomendacoes.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>`:''}</div><div><h3>Nas palavras da assessoria</h3>${quotes}</div></div>
      <div class="fcallout"><h4>Leitura da Direção de Desempenho</h4><p>${esc(T.assess)}</p></div>`);
  }
  /* 10 perfil + projeção */
  const projRows = d.proj.map(p => `<tr><td class="lab">${esc(p.mae)}</td>${d.todas.map(t=>`<td class="${cls(p.ms[t])}">${f1(p.ms[t])}</td>`).join('')}<td class="fase">${f1(p.soma)}</td>${p.need!=null?`<td class="need ${p.sit[0]}">${f1(Math.max(p.need,0))}</td>`:''}<td><span class="fselo ${p.sit[0]}">${p.sit[1]}</span></td></tr>`).join('');
  const projFinal = d.proj.filter(p=>p.sit[0]==='provavel'||p.sit[0]==='final');
  const perfil = page(head(`Perfil ${g.a==='a'?'da':'do'} estudante e projeção do ano`, 'Plano de ação') + `<div class="fprofile"><h3>Quem é ${g.a} ${esc(d.curto)}, nos dados</h3><p>${esc(T.perfil)}</p></div>
    <h3>${B<3?`Quanto ${g.a} ${esc(d.curto)} precisa no ${B+1}º trimestre para a aprovação direta (21 pontos)`:'Resultado anual (21 pontos para a aprovação direta)'}</h3><table class="fcomp rec proj"><thead><tr><th class="lab">Disciplina</th>${d.todas.map(t=>`<th>Média ${t}º</th>`).join('')}<th>Soma</th>${B<3?`<th>Precisa no ${B+1}º</th>`:''}<th>Situação</th></tr></thead><tbody>${projRows}</tbody></table>
    <p class="fsmall">${B<3?`Leitura: abaixo de 8,0 a meta é confortável; entre 8,0 e 10,0 a aprovação direta é possível, mas exige um trimestre forte; acima de 10,0 a disciplina já iria para a prova final. ${projFinal.length?`Hoje ${projFinal.length===1?'está':'estão'} em zona de atenção: ${projFinal.map(p=>`<b>${esc(p.mae)}</b> (precisa ${f1(Math.max(p.need,0))})`).join(', ')}.`:'Nenhuma disciplina está em zona de prova final.'} `:''}As médias por disciplina seguem o boletim do ActiveSoft (médias finais após recuperação, com uma casa decimal).</p>`);
  /* 11 plano */
  const planCols = [FAM_C.magenta, FAM_C.yellow, FAM_C.grey, FAM_C.teal];
  const plano = page(head(`Desafios e combinados para o ${B<3?(B+1)+'º trimestre':'próximo período'}`, 'Plano de ação') + `<p class="flead">Frentes de trabalho com meta numérica e com o papel de cada parte — Assessoria, professores, família e ${g.a} própri${g.a} ${esc(d.curto)}. Combinados simples, pensados para caber na rotina que ${g.ela} já tem.</p>
    <div class="fplan">${(T.plano||[]).slice(0,4).map((p,i) => `<div class="fpcol" style="border-top-color:${planCols[i%4]}"><h4>${i+1} · ${esc(p.titulo)}</h4><ul>${(p.itens||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
    <h3>Quem faz o quê</h3><div class="froles">${[['aluno',esc(d.curto),FAM_C.teal],['familia','Família',FAM_C.yellow],['assessoria','Assessoria',FAM_C.magenta],['direcao','Direção de Desempenho',FAM_C.grey]].map(([k,t,c]) => `<div style="border-top-color:${c}"><h4>${t}</h4><ul>${((T.papeis||{})[k]||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>`);
  /* 12 fechamento */
  const fecho = page(head('Para encerrar', 'Palavra final e assinatura') + `<div class="fletter"><p>${esc(d.destTrat.sauda)}</p>${ps(T.fecho)}<div class="fsignature"><div class="fsigline"></div><b>Arthur Lira</b><br>Diretor de Desempenho<br><span class="fmuted">Escola Habilis · ${esc(unidade)} · João Pessoa – PB · ${hoje}</span></div></div>`);
  return `<div class="fam-report">${capa}${carta}${relance}${comparativo}${areas}${recup}${rotina}${rotina2}${assessPage}${perfil}${plano}${fecho}</div>`;
}

/* ---- aba ---- */
function tabFamilia(root) {
  const F = state.fam;
  root.appendChild(el('h2',{class:'noprint'}, 'Relatório à família'));
  root.appendChild(el('p',{class:'hint noprint'}, 'Selecione um <b>aluno</b> no filtro, escolha os dois trimestres a comparar, envie o <b>relatório do assessor</b> (.docx ou .pdf) e clique em <b>Montar relatório</b>. O texto pode ser redigido pela IA (chave em ⚙️ Configurar IA) ou por regras. <b>Salvar PDF</b> usa a impressão do navegador (escolha "Salvar como PDF", papel A4, margens padrão, com gráficos de fundo).'));
  if (!state.aluno) { root.appendChild(el('div',{class:'notice noprint'}, 'Escolha um aluno no filtro acima.')); return; }
  const sel = selectedAsfAluno();
  if (!sel) { root.appendChild(el('div',{class:'notice noprint'}, 'Este aluno só existe no Geekie — sem notas do ActiveSoft não dá para montar o relatório.')); return; }
  const resp = famResponsaveis(sel.aid);
  const key = state.aluno+'|'+F.triA+'|'+F.triB;
  if (F.key !== key) { F.key = key; F.textos = null; F.fonte = ''; F.built = false; F.erro = ''; }
  const box = el('div',{class:'panel noprint fam-form'});
  box.innerHTML = `<div class="fam-grid">
    <label>Trimestre inicial<select id="famA">${[1,2].map(t=>`<option value="${t}"${F.triA===t?' selected':''}>${t}º trimestre</option>`).join('')}</select></label>
    <label>Trimestre final<select id="famB">${[2,3].map(t=>`<option value="${t}"${F.triB===t?' selected':''}>${t}º trimestre</option>`).join('')}</select></label>
    <label>Destinatário<select id="famDest"><option value="pai"${F.dest==='pai'?' selected':''}>Pai${resp.pai?' — '+esc(resp.pai):' (não cadastrado)'}</option><option value="mae"${F.dest==='mae'?' selected':''}>Mãe${resp.mae?' — '+esc(resp.mae):' (não cadastrada)'}</option><option value="resp"${F.dest==='resp'?' selected':''}>Responsável${resp.resp?' — '+esc(resp.resp)+(resp.respTipo?' ('+esc(toTitle(resp.respTipo))+')':''):''}</option><option value="outro"${F.dest==='outro'?' selected':''}>Outro / família</option></select></label>
    <label>Nome do destinatário (opcional)<input id="famDestNome" value="${esc(F.destNome)}" placeholder="deixe em branco para usar o cadastro"></label>
    <label>Assessor(a)<input id="famAssessor" value="${esc(F.assessor || (F.parsed&&F.parsed.assessor) || '')}" placeholder="lido do arquivo (TIME: …)"></label>
    <label>Relatório do assessor (.docx / .pdf / .txt)<input type="file" id="famFile" accept=".docx,.pdf,.txt"></label>
  </div>
  <details ${F.raw?'open':''}><summary class="muted" style="cursor:pointer;font-size:.82rem">Ou cole aqui o texto do relatório do assessor</summary><textarea id="famRaw" rows="5" style="width:100%;margin-top:6px" placeholder="Cole o texto (as linhas 'Maio 50% (de 4 atendimentos)' e os títulos 'Presença…:', 'Recomendações:', 'Conclusão:' são reconhecidos).">${esc(F.raw)}</textarea></details>
  <label style="display:block;margin-top:8px;font-size:.8rem;color:var(--ink-2)">Observações da Direção (opcional, entram no relatório)<textarea id="famObs" rows="2" style="width:100%">${esc(F.obs)}</textarea></label>
  <div class="toolbar" style="margin-top:10px"><button class="primary" id="famBuild">📄 Montar relatório (texto por regras)</button><button class="primary magenta" id="famAI">✨ Montar com redação por IA</button><button class="ghost" id="famPrint" ${F.built?'':'disabled'}>🖨️ Salvar PDF</button><button class="ghost" id="famCfg">⚙️ Configurar IA</button><span class="muted" id="famStatus" style="font-size:.8rem">${F.erro ? 'Erro: '+esc(F.erro) : F.parsed ? `Relatório do assessor lido${F.parsed.arquivo?' ('+esc(F.parsed.arquivo)+')':''}: ${F.parsed.presenca.length} linha(s) de presença, ${Object.keys(F.parsed.secoes).length} seção(ões), ${F.parsed.recomendacoes.length} recomendação(ões).` : 'Nenhum relatório do assessor carregado — o relatório sai sem a página da Assessoria.'}${F.fonte?' · Texto: '+esc(F.fonte):''}</span></div>`;
  root.appendChild(box);
  const st = box.querySelector('#famStatus');
  box.querySelector('#famA').onchange = e => { F.triA = +e.target.value; if (F.triB <= F.triA) F.triB = F.triA+1; render(); };
  box.querySelector('#famB').onchange = e => { F.triB = +e.target.value; if (F.triA >= F.triB) F.triA = F.triB-1; render(); };
  box.querySelector('#famDest').onchange = e => { F.dest = e.target.value; F.textos = null; F.built = false; render(); };
  box.querySelector('#famDestNome').onchange = e => { F.destNome = e.target.value; F.textos = null; };
  box.querySelector('#famAssessor').onchange = e => { F.assessor = e.target.value; };
  box.querySelector('#famObs').onchange = e => { F.obs = e.target.value; F.textos = null; };
  box.querySelector('#famRaw').onchange = e => { F.raw = e.target.value; if (F.raw.trim()) { F.parsed = famInterpret(F.raw.split(/\n+/)); F.assessor = F.assessor || F.parsed.assessor; } F.textos = null; F.built = false; render(); };
  box.querySelector('#famFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; st.textContent = 'Lendo '+f.name+'…'; try { F.parsed = await famReadFile(f); F.assessor = F.assessor || F.parsed.assessor; F.erro = ''; } catch(err) { F.erro = 'não consegui ler o arquivo ('+err.message+')'; F.parsed = null; } F.textos = null; F.built = false; render(); };
  box.querySelector('#famCfg').onclick = () => { state.tab = 'relatorio'; render(); setTimeout(() => { const b = [...document.querySelectorAll('button')].find(x=>/Configurar IA/.test(x.textContent)); if (b) b.click(); }, 50); };
  const montar = async (ia) => {
    F.destNome = box.querySelector('#famDestNome').value; F.assessor = box.querySelector('#famAssessor').value; F.obs = box.querySelector('#famObs').value;
    const d = famDossier(); if (!d) return;
    st.textContent = ia ? 'Redigindo com IA…' : 'Montando…';
    try { if (ia) { F.textos = await famAiTexts(d); F.fonte = 'IA ('+(localStorage.getItem('hab_ai_model')||'claude-sonnet-5')+')'; } else { F.textos = famRuleTexts(d); F.fonte = 'regras'; } F.erro = ''; F.built = true; }
    catch(err) { F.erro = err.message + ' — usei o texto por regras.'; F.textos = famRuleTexts(d); F.fonte = 'regras (IA falhou)'; F.built = true; }
    render();
  };
  box.querySelector('#famBuild').onclick = () => montar(false);
  box.querySelector('#famAI').onclick = () => montar(true);
  box.querySelector('#famPrint').onclick = () => { document.body.classList.add('fam-printing'); const stl = document.createElement('style'); stl.id = 'famPageStyle'; stl.textContent = '@page { size: A4; margin: 0; }'; document.head.appendChild(stl); setTimeout(() => { window.print(); setTimeout(() => { document.body.classList.remove('fam-printing'); stl.remove(); }, 500); }, 50); };
  if (F.built && F.textos) {
    const d = famDossier();
    const wrap = el('div',{class:'fam-wrap'}); wrap.innerHTML = famHtml(d, F.textos); root.appendChild(wrap);
  } else root.appendChild(el('div',{class:'notice noprint'}, `Pronto para montar: ${esc(sel.nome)} · ${esc(sel.turma)} · ${F.triA}º × ${F.triB}º trimestre${resp.pai||resp.mae?` · responsáveis: ${esc([resp.pai,resp.mae].filter(Boolean).join(' e '))}`:' · sem responsáveis no cadastro (preencha o nome)'}.`));
}
