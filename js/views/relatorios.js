import { afterRender } from '../bus.js';
import { drawBars, drawDonut } from '../charts.js';
import { SERIES } from '../constants.js';
import { ensureYear } from '../data/store.js';
import { catById, monthItems, totals } from '../selectors.js';
import { SP, state } from '../state.js';
import { kpi } from '../ui.js';
import { $, MONTHS, PCT, addMonths, esc, money, sum, ymLabel, ymShort } from '../utils.js';

/* ---------- Reports ---------- */
export function monthSeries(months, sp = SP()){
  const ins = [], outs = [];
  new Set(months.map(m => +m.slice(0,4))).forEach(y => ensureYear(state.space, y)); // garante os anos carregados
  months.forEach(m => { const t = totals(monthItems(m, sp)); ins.push(t.in); outs.push(t.out); });
  return {labels: months.map(ymShort), months, series:[{name:'Entradas', color:'--s1', values:ins},{name:'Saídas', color:'--s2', values:outs}]};
}
export function foldOther(items, n = 7){
  if (items.length <= n + 1) return items.map((x,i) => Object.assign({color:SERIES[i]}, x));
  const top = items.slice(0, n).map((x,i) => Object.assign({color:SERIES[i]}, x));
  top.push({label:'Outros', value: sum(items.slice(n), x=>x.value), color:'--s-other'});
  return top;
}
export function catBreakdown(ym, sp = SP()){
  const by = {}; monthItems(ym, sp).filter(t=>t.type==='out').forEach(t => by[t.cat] = (by[t.cat]||0) + t.amount);
  return Object.entries(by).map(([id,v]) => ({id, label: catById(id,sp).emoji + ' ' + catById(id,sp).name, value:v})).sort((a,b)=>b.value-a.value);
}
export function viewReports(){
  const ym = state.month; const months = Array.from({length:12}, (_,i)=>addMonths(ym, i-11));
  const ms = monthSeries(months);
  const outs = ms.series[1].values, ins = ms.series[0].values;
  const withData = months.map((m,i)=>i).filter(i => ins[i] || outs[i]);
  const avgOut = withData.length ? sum(withData, i=>outs[i]) / withData.length : 0;
  const T = totals(monthItems(ym)); const rate = T.in ? T.bal / T.in : null;
  const cb = catBreakdown(ym), prevCb = catBreakdown(addMonths(ym,-1));
  const top = cb[0];
  let h = `<div class="grid g-4">
    ${kpi('Gasto médio mensal', money(avgOut), `média de ${withData.length||0} mês(es) com dados`, 'chart')}
    ${kpi('Taxa de poupança', rate===null?'—':PCT(rate), rate===null?'Sem entradas no mês':'do que entrou ficou com você', 'piggy')}
    ${kpi('Maior categoria', top ? esc(top.label) : '—', top ? `${money(top.value)} · ${PCT(top.value/T.out)} das saídas` : 'Sem saídas no mês', 'target')}
    ${kpi('Saídas no ano', money(sum((SP().tx[ym.slice(0,4)]||[]).filter(t=>t.type==='out' && String(t.date).slice(0,7)<=ym), t=>t.amount)), `de janeiro a ${MONTHS[+ym.slice(5)-1]} de ${ym.slice(0,4)}`, 'cal')}
  </div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h3>Entradas e saídas mês a mês</h3><span class="sub">últimos 12 meses</span><div class="right"><button class="btn xs ghost" data-act="repTable">${state.repTable?'Ver gráfico':'Ver tabela'}</button></div></div>
    ${state.repTable ? monthTable(ms) : `<div class="legend"><span><i class="sw" style="background:var(--s1)"></i>Entradas</span><span><i class="sw" style="background:var(--s2)"></i>Saídas</span></div><div class="chart" id="repBars" data-h="280"></div>`}
  </div>
  <div class="grid g-2" style="margin-top:16px">
    <div class="card"><div class="card-h"><h3>Gastos por categoria</h3><span class="sub">${ymLabel(ym)}</span></div>
      ${cb.length ? `<div class="donut-wrap"><div class="chart" id="catDonut"></div><div class="dlegend" id="catLegend"></div></div>` : '<p class="t2 small">Sem saídas neste mês.</p>'}</div>
    <div class="card"><div class="card-h"><h3>Comparativo por categoria</h3><span class="sub">${ymShort(ym)} vs. ${ymShort(addMonths(ym,-1))}</span></div>
      ${catCompare(cb, prevCb)}</div>
  </div>
  <div class="card" style="margin-top:16px"><div class="card-h"><h3>Gastos por tag</h3><span class="sub">${ymLabel(ym)}</span></div>${tagBreakdown(ym)}</div>`;
  afterRender.push(() => {
    if ($('#repBars')) drawBars($('#repBars'), ms);
    if ($('#catDonut')) drawDonut($('#catDonut'), $('#catLegend'), foldOther(cb), {title:'Saídas', total:T.out});
  });
  return h;
}
export function monthTable(ms){
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Mês</th><th class="r">Entradas</th><th class="r">Saídas</th><th class="r">Saldo</th></tr></thead><tbody>${ms.months.map((m,i) => { const b = ms.series[0].values[i]-ms.series[1].values[i]; return `<tr><td>${ymLabel(m)}</td><td class="r num">${money(ms.series[0].values[i])}</td><td class="r num">${money(ms.series[1].values[i])}</td><td class="r num ${b<0?'neg':''}">${money(b)}</td></tr>`; }).join('')}</tbody></table></div>`;
}
export function catCompare(cb, prev){
  const ids = [...new Set([...cb.map(c=>c.id), ...prev.map(c=>c.id)])];
  if (!ids.length) return '<p class="t2 small">Sem dados para comparar.</p>';
  const rows = ids.map(id => ({id, label: catById(id).emoji+' '+catById(id).name, cur:(cb.find(c=>c.id===id)||{}).value||0, prev:(prev.find(c=>c.id===id)||{}).value||0})).sort((a,b)=>b.cur-a.cur).slice(0,8);
  const max = Math.max(...rows.map(r=>Math.max(r.cur,r.prev)), 1);
  return `<div class="legend"><span><i class="sw" style="background:var(--s1)"></i>Este mês</span><span><i class="sw" style="background:var(--s-other);opacity:.55"></i>Mês anterior</span></div><div class="hbars">${rows.map(r => {
    const d = r.prev ? (r.cur - r.prev)/r.prev : null;
    const delta = d === null ? '<span class="muted">novo</span>' : Math.abs(d) < 0.0005 ? '<span class="muted">= igual</span>' : `<span class="${d>0?'neg':'pos'}">${d>0?'▲':'▼'} ${PCT(Math.abs(d))}</span>`;
    return `<div class="hb"><div class="top"><span class="n">${esc(r.label)}</span><span class="num t2 small">${money(r.cur)} · ${delta}</span></div><div class="track" style="margin-bottom:3px"><i style="width:${r.cur/max*100}%"></i></div><div class="track" style="height:5px"><i class="prev" style="width:${r.prev/max*100}%"></i></div></div>`; }).join('')}</div>`;
}
export function tagBreakdown(ym){
  const by = {}; monthItems(ym).filter(t=>t.type==='out').forEach(t => (t.tags||[]).forEach(g => by[g] = (by[g]||0) + t.amount));
  const rows = Object.entries(by).sort((a,b)=>b[1]-a[1]);
  if (!rows.length) return '<p class="t2 small" style="margin:0">Adicione tags aos lançamentos (ex.: #casal, #trabalho, #férias) para ver os gastos agrupados aqui.</p>';
  const max = rows[0][1];
  return `<div class="hbars">${rows.slice(0,10).map(([g,v]) => `<div class="hb"><div class="top"><span class="n">#${esc(g)}</span><span class="num t2">${money(v)}</span></div><div class="track"><i style="width:${v/max*100}%"></i></div></div>`).join('')}</div>`;
}

