import { tip } from '../charts.js';
import { DEFAULT_RATES } from '../constants.js';
import { ensureYear } from '../data/store.js';
import { render } from '../render.js';
import { goalSaved, monthItems, monthsUntil, subMonthly, totalSaved, totals } from '../selectors.js';
import { SP, state } from '../state.js';
import { $, PCT, addMonths, clamp, dim, esc, icon, money, moneyInputVal, sum, ymNow } from '../utils.js';

/* ---------- Invest ---------- */
export function irRate(months){ const d = months*30; return d<=180?.225 : d<=360?.20 : d<=720?.175 : .15; }
export function products(){
  const R = state.rates, cdi = R.cdi/100;
  return [
    {id:'poup', name:'Poupança', rate: Math.pow(1+R.poupM/100,12)-1, ir:false, cust:0, liq:'Diária (rende no “aniversário”)', gar:'FGC até R$ 250 mil', min:0, risk:'Muito baixo'},
    {id:'selic', name:'Tesouro Selic / Tesouro Reserva', rate: R.selic/100 - 0.0005, ir:true, cust:'selic', liq:'Diária', gar:'Tesouro Nacional', min:0, risk:'Muito baixo'},
    {id:'cdbdl', name:'CDB liquidez diária (100% do CDI)', rate: cdi, ir:true, cust:0, liq:'Diária', gar:'FGC até R$ 250 mil', min:0, risk:'Muito baixo'},
    {id:'cdb110', name:'CDB com prazo (110% do CDI)', rate: cdi*1.10, ir:true, cust:0, liq:'No vencimento', gar:'FGC até R$ 250 mil', min:6, risk:'Baixo'},
    {id:'lci', name:'LCI / LCA (90% do CDI, isenta de IR)', rate: cdi*0.90, ir:false, cust:0, liq:'Após carência (geralmente 9–12 meses)', gar:'FGC até R$ 250 mil', min:9, risk:'Baixo'},
    {id:'pre', name:'Tesouro Prefixado', rate: R.pre/100, ir:true, cust:.002, liq:'Diária, a preço de mercado', gar:'Tesouro Nacional', min:12, risk:'Baixo se levar até o vencimento'},
    {id:'ipca', name:'Tesouro IPCA+', rate: (1+R.ipca/100)*(1+R.ipcaReal/100)-1, ir:true, cust:.002, liq:'Diária, a preço de mercado', gar:'Tesouro Nacional', min:36, risk:'Baixo se levar até o vencimento'},
  ];
}
export function simulate(P, months){
  const y = months/12;
  return products().map(p => {
    const gross = P*(Math.pow(1+p.rate, y)-1);
    const ir = p.ir ? gross*irRate(months) : 0;
    const cust = p.cust === 'selic' ? Math.max(0, P-10000)*0.002*y : P*(p.cust||0)*y;
    const net = gross - ir - cust;
    return Object.assign({}, p, {gross, irv:ir, custv:cust, net, final:P+net, netYear: Math.pow(1+net/P, 1/Math.max(y,1/12))-1, fit: months >= p.min});
  }).sort((a,b) => (b.fit - a.fit) || (b.net - a.net));
}
export function reserveInfo(){
  const sp = SP(); const essentials = sum(sp.fixed.filter(f=>f.active!==false), f=>f.amount) + sum(sp.subs.filter(s=>s.active!==false), subMonthly);
  const months = [1,2,3].map(k => addMonths(ymNow(), -k));
  new Set(months.map(m => +m.slice(0,4))).forEach(y => ensureYear(state.space, y)); const outs = months.map(m => totals(monthItems(m, sp)).out).filter(v=>v>0);
  const avgOut = outs.length ? sum(outs)/outs.length : 0;
  const base = Math.max(essentials, avgOut);
  const have = sum(sp.goals.filter(g=>g.isReserve), g => goalSaved(g, sp));
  return {base, target: base*6, have, essentials, avgOut};
}
export function suggestion(P, months, liq, res){
  const out = []; let rest = P;
  const gap = Math.max(0, res.target - res.have);
  if (gap > 0 && res.target > 0){ const a = Math.min(rest, gap); out.push({amt:a, name:'Reserva de emergência', prod:'Tesouro Selic, Tesouro Reserva ou CDB 100% CDI com liquidez diária', why:'Antes de buscar mais rendimento, garanta 6 meses de gastos em algo que você resgata no mesmo dia, sem perda.', c:'--s1'}); rest -= a; }
  if (rest <= 0.005) return out;
  if (liq || months < 6) out.push({amt:rest, name:'Curto prazo / liquidez', prod:'CDB liquidez diária (≥100% CDI) ou Tesouro Selic', why:'Prazo curto ou precisa do dinheiro a qualquer momento: priorize liquidez diária e pós-fixados.', c:'--s3'});
  else if (months <= 12){ out.push({amt:rest*.5, name:'Pós-fixado com prazo', prod: months>=9 ? 'LCI/LCA (isentas de IR) com vencimento perto do seu prazo' : 'CDB 105–110% do CDI com vencimento no seu prazo', why:'Rende mais que a liquidez diária quando você sabe quando vai usar.', c:'--s3'}); out.push({amt:rest*.5, name:'Flexível', prod:'Tesouro Selic ou CDB liquidez diária', why:'Mantém parte acessível caso o plano mude.', c:'--s4'}); }
  else if (months <= 36){ out.push({amt:rest*.4, name:'Isentos de IR', prod:'LCI/LCA de 1 a 2 anos', why:'Isenção de IR costuma compensar a taxa menor nesse prazo.', c:'--s3'}); out.push({amt:rest*.3, name:'CDB com prazo', prod:'CDB 110%+ do CDI (bancos médios, dentro do FGC)', why:'Bom retorno pós-fixado com garantia do FGC.', c:'--s4'}); out.push({amt:rest*.3, name:'Prefixado', prod:'Tesouro Prefixado com vencimento próximo do seu prazo', why:'Trava a taxa atual; só não venda antes do vencimento.', c:'--s5'}); }
  else { out.push({amt:rest*.4, name:'Proteção contra inflação', prod:'Tesouro IPCA+ (vencimento próximo do objetivo)', why:'Garante ganho real acima da inflação no longo prazo.', c:'--s7'}); out.push({amt:rest*.3, name:'Renda fixa isenta / CDB longo', prod:'LCI/LCA e CDBs de prazo mais longo', why:'Diversifica emissores e prazos.', c:'--s3'}); out.push({amt:rest*.3, name:'Flexível', prod:'Tesouro Selic', why:'Mantém flexibilidade e aproveita juros altos.', c:'--s1'}); }
  return out;
}
export function viewInvest(){
  const sp = SP(), R = state.rates, res = reserveInfo();
  let P = state.inv.amount; if (!(P > 0)) P = Math.round(totalSaved()) || 5000; const months = state.inv.months, liq = state.inv.liq;
  const sim = simulate(P, months), sug = suggestion(P, months, liq, res);
  const best = sim.find(s => s.fit && (!liq || s.liq.startsWith('Diária') && !s.liq.includes('mercado')));
  const yrs = months/12;
  let h = `<div class="banner info" style="margin:0 0 16px">${icon('info')}<div><b>Conteúdo educativo, não é recomendação de investimento.</b> As simulações usam taxas de referência de ${esc(R.ref)} (Selic ${String(R.selic).replace('.',',')}% a.a.) e são aproximadas. Antes de investir, confira as taxas na sua instituição e, se precisar, procure um profissional certificado.</div></div>
  <div class="grid g-main"><div class="card"><div class="card-h"><h3>Quanto você quer aplicar?</h3></div>
    <div class="fields-2"><div class="field"><label for="invAmount">Valor (R$)</label><input class="input num amount-input" id="invAmount" inputmode="numeric" data-money value="${moneyInputVal(P)}" data-on="invAmount"></div>
    <div class="field"><label for="invMonths">Por quanto tempo?</label><select class="select" id="invMonths" data-on="invMonths" style="padding:16px 12px">${[[3,'3 meses'],[6,'6 meses'],[12,'1 ano'],[18,'1 ano e meio'],[24,'2 anos'],[36,'3 anos'],[60,'5 anos'],[120,'10 anos']].map(([v,l])=>`<option value="${v}" ${months===v?'selected':''}>${l}</option>`).join('')}</select></div></div>
    <label class="check" style="margin-top:12px"><input type="checkbox" data-on="invLiq" ${liq?'checked':''}> Posso precisar desse dinheiro a qualquer momento</label>
    ${totalSaved() ? `<div class="row wrap small" style="margin-top:12px;gap:6px"><span class="muted">Usar:</span><button class="chip btnchip" data-act="invUse" data-v="${Math.round(totalSaved())}">Total guardado (${money(totalSaved())})</button>${sp.goals.map(g=>`<button class="chip btnchip" data-act="invGoal" data-id="${esc(g.id)}">${esc(g.emoji||'🎯')} ${esc(g.name)}</button>`).join('')}</div>` : ''}
  </div>
  <div class="card"><div class="card-h"><h3>Sua reserva de emergência</h3></div>
    ${res.base ? `<div class="num" style="font-size:24px;font-weight:800">${money(res.target)}</div><div class="small t2">6 × ${money(res.base)} de gastos mensais ${res.avgOut>res.essentials?'(média dos últimos meses)':'(fixas + assinaturas)'}</div>
      <div class="bar ${res.have>=res.target?'t-good':''}" style="margin-top:12px"><i style="width:${clamp(res.have/res.target,0,1)*100}%"></i></div>
      <div class="small t2" style="margin-top:6px">${res.have>=res.target ? '✅ Reserva completa — você pode buscar prazos mais longos.' : `Você tem ${money(res.have)} marcados como reserva. ${sp.goals.some(g=>g.isReserve)?'':'Marque uma meta como “reserva de emergência” para acompanhar.'}`}</div>`
      : '<p class="t2 small" style="margin:0">Cadastre despesas fixas ou lance seus gastos para calcularmos o valor ideal da reserva (6 meses de gastos).</p>'}
  </div></div>`;
  // Suggested allocation
  h += `<div class="section-title"><h2>Sugestão para ${money(P)} em ${months<12?months+' meses':(yrs===1?'1 ano':String(yrs).replace('.',',')+' anos')}</h2></div>
  <div class="card"><div class="alloc">${sug.map(s=>`<i style="width:${s.amt/P*100}%;background:var(${s.c})" title="${esc(s.name)}"></i>`).join('')}</div>
  <div class="list">${sug.map(s => `<div class="item"><i class="sw" style="background:var(${s.c});width:12px;height:12px"></i><div class="main"><div class="title">${esc(s.name)} · <span class="t2">${esc(s.prod)}</span></div><div class="meta">${esc(s.why)}</div></div><div class="amt num">${money(s.amt)}<div class="xs muted">${PCT(s.amt/P)}</div></div></div>`).join('')}</div>
  ${best ? `<div class="tip-card" style="margin-top:12px"><div class="ic">${icon('trend')}</div><div><h4>Melhor retorno líquido estimado para esse prazo: ${esc(best.name)}</h4><p>Cerca de <b class="num">${money(best.net)}</b> de ganho líquido (≈ ${PCT(best.netYear)} ao ano depois de IR e taxas). Na poupança seriam ${money(sim.find(s=>s.id==='poup').net)}.</p></div></div>` : ''}
  </div>`;
  // Comparison table
  h += `<div class="section-title"><h2>Comparativo de opções seguras</h2><span class="muted small">ordenado pelo ganho líquido</span></div>
  <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Opção</th><th class="r">Taxa bruta a.a.</th><th class="r">Ganho bruto</th><th class="r">IR + taxas</th><th class="r">Ganho líquido</th><th>Liquidez</th><th>Garantia</th></tr></thead><tbody>
  ${sim.map(s => `<tr class="${s.fit?'':'dim'}"><td><b>${esc(s.name)}</b>${s.fit?'':`<div class="xs muted">indicado para prazos a partir de ${s.min} meses</div>`}</td><td class="r num">${PCT(s.rate)}</td><td class="r num">${money(s.gross)}</td><td class="r num">${money(s.irv+s.custv)}${s.ir?`<div class="xs muted">IR ${PCT(irRate(months))}</div>`:'<div class="xs muted">isento de IR</div>'}</td><td class="r num"><b>${money(s.net)}</b></td><td class="small">${esc(s.liq)}</td><td class="small">${esc(s.gar)}</td></tr>`).join('')}
  </tbody></table></div><p class="xs muted" style="margin:10px 0 0">IR pela tabela regressiva (22,5% até 180 dias · 20% até 360 · 17,5% até 720 · 15% acima). Taxa de custódia B3 de 0,20% a.a. no Tesouro, com isenção no Tesouro Selic para até R$ 10 mil. CDB/LCI com % do CDI são exemplos de mercado — compare ofertas reais.</p></div>`;
  // Goals tips
  const dated = sp.goals.filter(g => g.deadline && goalSaved(g) < (Number(g.target)||Infinity));
  if (dated.length){
    h += `<div class="section-title"><h2>Onde deixar o dinheiro de cada meta</h2></div><div class="grid g-3">${dated.map(g => { const m = monthsUntil(g.deadline); const p = g.isReserve ? 'Tesouro Selic / CDB liquidez diária' : m < 6 ? 'CDB liquidez diária ou Tesouro Selic' : m < 12 ? 'CDB com vencimento no prazo, ou LCI/LCA se ≥ 9 meses' : m <= 36 ? 'LCI/LCA, CDB 110% CDI ou Tesouro Prefixado' : 'Tesouro IPCA+ com vencimento próximo'; return `<div class="card tip-card"><div class="emoji">${esc(g.emoji||'🎯')}</div><div><h4>${esc(g.name)} · ${m>1?m+' meses':m===1?'1 mês':'prazo vencido'}</h4><p>${esc(p)}</p></div></div>`; }).join('')}</div>`;
  }
  // Tips by amount
  h += `<div class="section-title"><h2>Dicas de segurança</h2></div><div class="grid g-2">${investTips(P).map(t => `<div class="card tip-card"><div class="ic">${icon(t.i)}</div><div><h4>${t.h}</h4><p>${t.p}</p></div></div>`).join('')}</div>`;
  // Rates editor
  h += `<div class="section-title"><h2>Taxas de referência</h2><span class="muted small">edite para atualizar as simulações</span></div><div class="card"><div class="grid g-3">
    ${[['selic','Selic (% a.a.)'],['cdi','CDI (% a.a.)'],['ipca','IPCA 12 meses (%)'],['poupM','Poupança (% ao mês)'],['pre','Tesouro Prefixado (% a.a.)'],['ipcaReal','Tesouro IPCA+ (juro real % a.a.)']].map(([k,l]) => `<div class="field"><label for="rate-${k}">${l}</label><input class="input num" id="rate-${k}" inputmode="decimal" value="${String(R[k]).replace('.',',')}" data-on="rate" data-k="${k}"></div>`).join('')}
  </div><div class="row wrap" style="margin-top:12px;justify-content:space-between"><span class="xs muted">Valores de referência (${esc(DEFAULT_RATES.ref)}): Selic 13,75% (Copom de 04/11/2026), IPCA-15 de outubro em 4,62% em 12 meses, poupança ≈ 0,67% ao mês, Tesouro Prefixado 2029 14,89% e IPCA+ 2032 com juro real de 7,89% (30/10/2026).</span><button class="btn xs ghost" data-act="resetRates">Restaurar padrão</button></div>
  <p class="xs" style="margin:10px 0 0"><a href="https://www.bcb.gov.br/controleinflacao/taxaselic" target="_blank" rel="noopener">Banco Central – Selic</a> · <a href="https://www.tesourodireto.com.br/" target="_blank" rel="noopener">Tesouro Direto</a> · <a href="https://www.fgc.org.br/" target="_blank" rel="noopener">FGC</a> · <a href="https://www.b3.com.br/pt_br/produtos-e-servicos/tarifas/tarifas-de-tesouro-direto/" target="_blank" rel="noopener">B3 – tarifas do Tesouro</a></p></div>`;
  return h;
}
export function investTips(P){
  const t = [];
  t.push({i:'alert', h:'Quite dívidas caras primeiro', p:'Juros do rotativo do cartão e do cheque especial passam de 100% ao ano. Nenhum investimento seguro rende isso — pagar a dívida é o melhor “investimento”.'});
  if (P < 1000) t.push({i:'piggy', h:'Comece pequeno, mas comece', p:'O Tesouro Reserva aceita aplicações a partir de R$ 1 e pode ser resgatado a qualquer momento. CDBs de liquidez diária de bancos digitais também aceitam valores baixos.'});
  else if (P <= 10000) t.push({i:'piggy', h:'Até R$ 10 mil: Tesouro Selic sem custódia', p:'No Tesouro Selic não há taxa de custódia da B3 para até R$ 10 mil por CPF — boa opção para a reserva. Compare com CDBs de pelo menos 100% do CDI.'});
  else if (P <= 250000) t.push({i:'shield', h:'Diversifique prazos e emissores', p:'Separe por objetivo: o que é reserva fica com liquidez diária; o que tem data pode ir para LCI/LCA, CDBs com prazo ou Tesouro com vencimento casado.'});
  else t.push({i:'shield', h:'Respeite o limite do FGC', p:'O FGC cobre até R$ 250 mil por CPF por instituição (com teto de R$ 1 milhão a cada 4 anos). Acima disso, divida entre bancos ou use títulos do Tesouro, garantidos pelo governo.'});
  t.push({i:'lock', h:'Prefira garantias sólidas', p:'Tesouro Direto (garantido pelo Tesouro Nacional) e CDB/LCI/LCA/poupança dentro do limite do FGC são as opções mais seguras para a maioria das pessoas.'});
  t.push({i:'clock', h:'Case o prazo com o objetivo', p:'Títulos prefixados e IPCA+ oscilam se vendidos antes do vencimento. Use-os só para dinheiro que não vai precisar até a data do título.'});
  t.push({i:'alertCircle', h:'Desconfie de promessas', p:'Retorno “garantido” muito acima do CDI, pressão para decidir rápido ou ganhos por indicar pessoas são sinais de golpe. Confira se a empresa é autorizada pela CVM ou pelo Banco Central.'});
  t.push({i:'trend', h:'Poupança perdeu para o CDI', p:'Com a Selic acima de 8,5%, a poupança rende 0,5% ao mês + TR. Um CDB de 100% do CDI ou o Tesouro Selic costumam render mais, mesmo depois do IR.'});
  return t;
}

