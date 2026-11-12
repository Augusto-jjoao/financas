import { cats, monthIncome, monthItems, plannedForMonth, settings, totals } from '../selectors.js';
import { state } from '../state.js';
import { budgetStatus, statusPill } from '../ui.js';
import { $, PCT, clamp, esc, money, moneyInputVal, sum } from '../utils.js';

/* ---------- Budget ---------- */
export function viewBudget(){
  const ym = state.month, set = settings(), list = monthItems(ym), T = totals(list);
  const lim = Number(set.budgetTotal)||0, planned = plannedForMonth(ym), plannedSum = sum(planned, p=>p.amount);
  const outCats = cats().filter(c => c.kind !== 'in');
  const spentBy = {}; list.filter(t=>t.type==='out').forEach(t => spentBy[t.cat] = (spentBy[t.cat]||0) + t.amount);
  const plannedBy = {}; planned.forEach(p => plannedBy[p.cat] = (plannedBy[p.cat]||0) + p.amount);
  const st = lim ? budgetStatus(T.out/lim) : null;
  let h = `<div class="grid g-main"><div class="card"><div class="card-h"><h3>Limite mensal geral</h3>${st?`<div class="right">${statusPill(st)}</div>`:''}</div>
    <div class="row wrap" style="gap:16px;align-items:flex-end">
      <div class="field" style="max-width:220px"><label for="budgetTotal">Quanto quer gastar no máximo por mês?</label><input class="input num" id="budgetTotal" inputmode="numeric" data-money placeholder="0,00" value="${moneyInputVal(lim||'')}" data-on="budgetTotal" data-write></div>
      ${lim ? `<div><div class="num" style="font-size:24px;font-weight:800">${money(T.out)} <span class="muted small" style="font-weight:600">gastos de ${money(lim)}</span></div></div>` : ''}
    </div>
    ${lim ? `<div class="bar t-${st.t}" style="margin-top:16px;height:14px"><i class="planned" style="width:${clamp((T.out+plannedSum)/lim,0,1)*100}%"></i><i style="width:${clamp(T.out/lim,0,1)*100}%"></i></div>
      <div class="row wrap small t2" style="margin-top:10px;gap:18px"><span><i class="sw" style="background:var(--accent)"></i> Gasto: <b class="num">${PCT(T.out/lim)}</b></span><span><i class="sw" style="background:repeating-linear-gradient(45deg,color-mix(in srgb,var(--accent) 40%,transparent) 0 3px,transparent 3px 6px)"></i> Previsto (fixas e assinaturas ainda não lançadas): <b class="num">${money(plannedSum)}</b></span><span>${lim-T.out-plannedSum >= 0 ? `Livre para gastar: <b class="num pos">${money(lim-T.out-plannedSum)}</b>` : `Acima do limite previsto: <b class="num neg">${money(T.out+plannedSum-lim)}</b>`}</span></div>` : ''}
  </div>
  ${rule503020(monthIncome(ym))}</div>`;
  h += `<div class="section-title"><h2>Limites por categoria</h2><span class="muted small">Deixe em branco para não limitar</span></div><div class="card"><div class="list">`;
  h += outCats.map(c => {
    const l = Number(set.budgetCats?.[c.id])||0, s = spentBy[c.id]||0, p = plannedBy[c.id]||0;
    const stc = l ? budgetStatus(s/l) : null;
    return `<div class="item" style="flex-wrap:wrap"><div class="emoji sm">${esc(c.emoji)}</div><div class="main" style="min-width:160px"><div class="title">${esc(c.name)}</div><div class="meta"><span class="num">${money(s)} gasto${p?` · +${money(p)} previsto`:''}</span>${stc?statusPill(stc):''}</div>
      ${l ? `<div class="bar thin t-${stc.t}" style="margin-top:8px"><i class="planned" style="width:${clamp((s+p)/l,0,1)*100}%"></i><i style="width:${clamp(s/l,0,1)*100}%"></i></div>` : ''}</div>
      <input class="input num" style="width:130px" inputmode="numeric" data-money placeholder="Sem limite" aria-label="Limite para ${esc(c.name)}" value="${l?moneyInputVal(l):''}" data-on="budgetCat" data-id="${esc(c.id)}" id="bc-${esc(c.id)}" data-write></div>`;
  }).join('');
  h += `</div></div>`;
  return h;
}
export function rule503020(income){
  if (!income) return `<div class="card"><div class="card-h"><h3>Regra 50-30-20</h3></div><p class="t2 small" style="margin:0">Lance suas entradas do mês para ver uma sugestão de divisão: 50% necessidades, 30% desejos e 20% para guardar/investir.</p></div>`;
  return `<div class="card"><div class="card-h"><h3>Sugestão 50-30-20</h3><span class="sub">sobre ${money(income)} de entradas</span></div>
    <div class="list">
      <div class="item"><div class="emoji sm">🏠</div><div class="main"><div class="title">Necessidades · 50%</div><div class="meta">moradia, contas, mercado, saúde, transporte</div></div><div class="amt num">${money(income*.5)}</div></div>
      <div class="item"><div class="emoji sm">🎉</div><div class="main"><div class="title">Desejos · 30%</div><div class="meta">lazer, restaurantes, compras, assinaturas</div></div><div class="amt num">${money(income*.3)}</div></div>
      <div class="item"><div class="emoji sm">📈</div><div class="main"><div class="title">Guardar · 20%</div><div class="meta">metas, reserva de emergência, investimentos</div></div><div class="amt num">${money(income*.2)}</div></div>
    </div>
    ${(Number(settings().budgetTotal)||0) === 0 ? `<button class="btn sm ghost" style="margin-top:10px" data-act="apply8020" data-v="${income*.8}" data-write>Usar ${money(income*.8)} (80%) como limite</button>` : ''}</div>`;
}

