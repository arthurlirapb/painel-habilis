import re, urllib.parse, subprocess
s = subprocess.run(['git','show','HEAD:index.html'], capture_output=True, text=True, cwd='/home/claude/painel-habilis').stdout
css=open('familia.css',encoding='utf-8').read().replace("  @page { size: A4; margin: 0; }\n","")
logo=open('logo_b64.txt').read().strip()
js = "const FAM_LOGO = 'data:image/png;base64," + logo + "';\n" + open('familia_a.js',encoding='utf-8').read() + "\n" + open('familia_b.js',encoding='utf-8').read() + "\n"
anchor="  @media print {\n    header, nav.tabs, .filters, .tooltip, .noprint, .brandstripe { display:none !important; }"
assert anchor in s; s=s.replace(anchor, css + anchor)
old="['cadastro','Cadastro'], ['relatorio','Exportar relatório']\n];"; assert old in s
s=s.replace(old, "['cadastro','Cadastro'], ['relatorio','Exportar relatório'], ['familia','Relatório à família']\n];")
old="ocorrencias:tabOcorrencias, cadastro:tabCadastro, relatorio:tabRelatorio}[state.tab])(sec);"; assert old in s
s=s.replace(old, "ocorrencias:tabOcorrencias, cadastro:tabCadastro, relatorio:tabRelatorio, familia:tabFamilia}[state.tab])(sec);")
anchor="/* ---------- render ---------- */"; assert s.count(anchor)==1; s=s.replace(anchor, js + anchor)
old="  return {asf_rows, asf_alunos, freq, ocorrencias, gk_acts, students_list: slist, tem_rec: Object.keys(recMap).length>0, rec_em: recData, extraido_em: cfg.extraido_em || new Date().toISOString().slice(0,10)};"; assert old in s
s=s.replace(old, """  /* Responsáveis (resp_v1): pai/mãe/responsável financeiro por aluno + nomes */
  const rp = get('activesoft_all','resp_v1');
  const resp = rp ? {alunos: rp.alunos||{}, resp: rp.resp||{}, tipos: rp.tipos||{}, extraido_em: rp.extraido_em||null} : null;
  return {asf_rows, asf_alunos, freq, ocorrencias, gk_acts, students_list: slist, resp, tem_rec: Object.keys(recMap).length>0, rec_em: recData, extraido_em: cfg.extraido_em || new Date().toISOString().slice(0,10)};""")
mn=open('/home/claude/bmk_min.js',encoding='utf-8').read().strip().rstrip(';')
enc='javascript:'+urllib.parse.quote(mn, safe="!'()*-._~")
m=re.search(r'const BOOKMARKLET = "(javascript:[^"]+)"', s); assert m
s=s.replace(m.group(0), 'const BOOKMARKLET = "'+enc+'"')
old="<!-- v7 (06/10/2026): notas de recuperação e média pós-recuperação (Notas e Exportar relatório) + aba Recuperação -->"; assert old in s
s=s.replace(old, old+"\n<!-- v8 (06/10/2026): aba Relatório à família (PDF comparativo entre trimestres + relatório do assessor), responsáveis (resp_v1) e favorito ⚡ com responsáveis -->\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link href=\"https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">")
old="aviso:'Reescreve as notas (AE1/AE2/AQ e recuperações), as faltas e as ocorrências disciplinares do painel.' }"; assert old in s
s=s.replace(old, "aviso:'Reescreve as notas (AE1/AE2/AQ e recuperações), os responsáveis, as faltas e as ocorrências disciplinares do painel.' }")
open('/home/claude/painel-habilis/index.html','w',encoding='utf-8').write(s)
print('index.html', len(s))
