import { afterRender } from '../bus.js';
import { drawBars } from '../charts.js';
import { cardItems, cardUsed, catById, fixedIn, goalSaved, incomeItems, incomes, instValue, invoiceStatus, invoiceTotal, linkedTx, monthItems, monthPlan, nextCharge, payDayLabel, plannedForMonth, settings, subMonthly, totalSaved, totals, txOfMonth } from '../selectors.js';
import { SP, state } from '../state.js';
import { budgetStatus, emptyState, kpi, statusPill, txRow } from '../ui.js';
import { $, MONTHS, PCT, addMonths, clamp, dim, esc, fmtDate, icon, money, pad, sum, todayISO, ymNow } from '../utils.js';
import { cardGrad } from './cartao.js';
import { monthSeries } from './relatorios.js';

/* ================= Views ================= */
export function viewHome(){
  const sp = SP(), ym = state.month, list = monthItems(ym), T = totals(list);
  const set = settings(), planned = plannedForMonth(ym), plannedSum = sum(planned, p=>p.amount);
  const saved = totalSaved();
  const subsM = sum(sp.subs.filter(s=>s.active!==false), subMonthly);
  let h = planHero(ym);
  const cardT = sum(cardItems(ym), t=>t.amount);
  h += `<div class="grid g-4" style="margin-top:16px">
    ${kpi('Entradas do mês', `<span class="pos">${money(T.in)}</span>`, `${list.filter(t=>t.type==='in').length} lançamento(s), incluindo a renda`, 'up')}
    ${kpi('Saídas do mês', money(T.out), 'inclui parcelas do cartão', 'down')}
    ${kpi('Fatura do cartão', money(cardT), sp.cards.length ? `${sp.cards.length} cartão(ões) · <a href="#cartao">ver faturas</a>` : '<a href="#cartao">cadastrar cartão</a>', 'card')}
    ${kpi('Total economizado', money(saved), `${sp.goals.length} meta(s) · <a href="#metas">ver metas</a>`, 'piggy')}
  </div>`;
  // Budget + recent
  const lim = Number(set.budgetTotal)||0;
  let budgetHtml;
  if (lim > 0){
    const pct = T.out/lim, st = budgetStatus(pct), pPct = clamp((T.out+plannedSum)/lim,0,1);
    budgetHtml = `<div class="row" style="justify-content:space-between;margin-bottom:8px"><div><span class="num" style="font-size:22px;font-weight:800">${money(T.out)}</span> <span class="muted small">de ${money(lim)}</span></div>${statusPill(st)}</div>
      <div class="bar t-${st.t}"><i class="planned" style="width:${pPct*100}%"></i><i style="width:${clamp(pct,0,1)*100}%"></i></div>
      <div class="row small t2" style="margin-top:8px;justify-content:space-between"><span>${lim-T.out>=0?`Resta <b class="num">${money(lim-T.out)}</b>`:`Excedeu <b class="num neg">${money(T.out-lim)}</b>`}</span>${plannedSum?`<span class="muted">+ ${money(plannedSum)} previstos</span>`:''}</div>`;
  } else budgetHtml = `<p class="t2 small" style="margin:0 0 12px">Defina um limite mensal para acompanhar quanto ainda pode gastar.</p><a class="btn sm ghost" href="#orcamento" data-write>Definir orçamento</a>`;
  const recent = txOfMonth(ym).concat(incomeItems(ym).filter(t => !t.future), sp.cardbuys.filter(b => String(b.date).slice(0,7) === ym).map(b => ({id:'buy:'+b.id, _virtual:true, _buy:b.id, type:'out', amount:Number(b.total)||instValue(b,0)*(b.n||1), date:b.date, desc:b.desc, cat:b.cat, tags:b.tags||[], by:b.by, src:'card', cardId:b.cardId, n:b.n||1, k:-1, createdAt:b.createdAt||''})))
    .sort((a,b)=> (b.date+(b.createdAt||'')).localeCompare(a.date+(a.createdAt||''))).slice(0,6);
  h += `<div class="grid g-main" style="margin-top:16px">
    <div class="card"><div class="card-h"><h3>Últimos lançamentos</h3><div class="right"><a class="btn xs ghost" href="#transacoes">Ver todos</a></div></div>
      ${recent.length ? `<div class="list">${recent.map(t=>txRow(t,{date:true})).join('')}</div>` : emptyState('🧾','Nada lançado em '+MONTHS[+ym.slice(5)-1],'Registre entradas e saídas com valor, data, categoria e tags.', `<button class="btn sm" data-act="newTx" data-write>${icon('plus')}Novo lançamento</button>`)}
    </div>
    <div class="grid" style="align-content:start">
      <div class="card"><div class="card-h"><h3>Orçamento do mês</h3><div class="right"><a class="btn xs ghost" href="#orcamento">Detalhes</a></div></div>${budgetHtml}</div>
      ${homeCardsCard(ym)}
      ${homeFixedCard(ym)}
      <div class="card"><div class="card-h"><h3>Assinaturas</h3><div class="right"><a class="btn xs ghost" href="#assinaturas">Gerenciar</a></div></div>
        <div class="row" style="justify-content:space-between"><div><div class="num" style="font-size:22px;font-weight:800">${money(subsM)}<span class="muted small" style="font-weight:600"> /mês</span></div><div class="muted small">${money(subsM*12)} por ano · ${sp.subs.filter(s=>s.active!==false).length} ativa(s)</div></div></div>
        ${upcomingSubs(3)}
      </div>
    </div></div>`;
  // goals + mini chart
  h += `<div class="grid g-2" style="margin-top:16px">
    <div class="card"><div class="card-h"><h3>Metas</h3><div class="right"><a class="btn xs ghost" href="#metas">Ver todas</a></div></div>${sp.goals.length ? `<div class="hbars">${sp.goals.slice(0,4).map(g=>{ const s=goalSaved(g), t=Number(g.target)||0; return `<div class="hb"><div class="top"><span class="n">${esc(g.emoji||'🎯')} ${esc(g.name)}</span><span class="num t2">${money(s)}${t?` <span class="muted">/ ${money(t)}</span>`:''}</span></div><div class="track"><i style="width:${t?clamp(s/t,0,1)*100:0}%"></i></div></div>`; }).join('')}</div>` : emptyState('🎯','Sem metas ainda','Crie metas como viagem, computador novo ou presente e acompanhe quanto já guardou.', `<a class="btn sm" href="#metas" data-write>Criar meta</a>`)}</div>
    <div class="card"><div class="card-h"><h3>Entradas e saídas · 6 meses</h3><div class="right"><a class="btn xs ghost" href="#relatorios">Relatórios</a></div></div>
      <div class="legend"><span><i class="sw" style="background:var(--s1)"></i>Entradas</span><span><i class="sw" style="background:var(--s2)"></i>Saídas</span></div>
      <div class="chart" id="homeChart" data-h="200"></div></div>
  </div>`;
  afterRender.push(() => { const months = Array.from({length:6}, (_,i)=>addMonths(ym, i-5)); drawBars($('#homeChart'), monthSeries(months)); });
  return h;
}
export function planHero(ym){
  const p = monthPlan(ym), sp = SP();
  const [y, m] = ym.split('-').map(Number), mName = MONTHS[m-1];
  const isNow = ym === ymNow(), daysLeft = isNow ? dim(y, m) - new Date().getDate() + 1 : null;
  const noIncome = !incomes().length && !p.renda;
  const base = p.start + p.extras, usedPct = base > 0 ? clamp(p.variable / base, 0, 1) : (p.variable > 0 ? 1 : 0);
  const row = (k, v, sign, sub, extra='') => `<div class="prow"><div><div class="k">${k}${extra}</div>${sub?`<div class="xs muted">${sub}</div>`:''}</div><div class="num v ${sign==='+'?'pos':''}">${sign==='+'?'+ ':'− '}${money(Math.abs(v))}</div></div>`;
  let left;
  if (noIncome){
    left = `<div class="pl-label">${icon('wallet')}Quanto você recebe por mês?</div>
      <div style="font-size:24px;font-weight:800;letter-spacing:-.02em;margin:10px 0 6px">Defina sua renda mensal</div>
      <p style="margin:0 0 16px;opacity:.9;font-size:14px">Com ela, a gente desconta assinaturas, despesas fixas e a fatura do cartão e mostra quanto você realmente tem para gastar no mês.</p>
      <button class="btn pl-btn" data-act="editIncome" data-write>${icon('edit')}Definir renda mensal</button>`;
  } else {
    const perDay = daysLeft && p.avail > 0 ? p.avail / daysLeft : null;
    left = `<div class="pl-label">${icon('wallet')}Disponível para gastar em ${mName}</div>
      <div class="big-avail num">${p.avail < 0 ? '−' : ''}${money(Math.abs(p.avail))}</div>
      <div class="pl-sub">${p.avail < 0 ? `Você passou ${money(-p.avail)} do que tinha para o mês.` : perDay ? `≈ <b class="num">${money(perDay)}</b> por dia nos próximos ${daysLeft} ${daysLeft===1?'dia':'dias'}` : ym < ymNow() ? 'Sobra do mês' : 'Previsto para o mês'}</div>
      <div class="pl-bar"><i style="width:${usedPct*100}%"></i></div>
      <div class="pl-sub small">Livre no início do mês: <b class="num">${money(p.start)}</b> · já gastou <b class="num">${money(p.variable)}</b> (${PCT(usedPct)})</div>
      <div class="row wrap" style="margin-top:16px;gap:8px"><button class="btn sm pl-btn" data-act="newTx" data-write>${icon('plus')}Lançar gasto</button><button class="btn sm pl-btn ghosty" data-act="editIncome" data-write>${icon('edit')}Renda: ${money(p.cfg || p.renda)}</button></div>`;
  }
  const right = `
    ${row('Renda mensal', p.renda, '+', p.usedSalTx ? 'ajustada neste mês (lançamento de Salário)' : p.cfg ? `entra em ${fmtDate(p.payDate).slice(0,5)} · ${payDayLabel()}` : (p.salTx ? 'lançamentos de salário' : 'não definida'), ` <button class="icon-btn sm-ic" data-act="editIncome" aria-label="Editar renda" data-write>${icon('edit')}</button>`)}
    ${row('Assinaturas', p.subs, '−', `${p.subsN} cobrança(s) neste mês · <a href="#assinaturas">ver</a>`)}
    ${row('Despesas fixas', p.fixed, '−', `${p.fixedN} conta(s)${p.fixP ? ` · ${money(p.fixP)} a pagar` : ''} · <a href="#fixas">ver</a>`)}
    ${row('Fatura do cartão', p.card, '−', sp.cards.length ? `vence em ${mName} · <a href="#cartao">ver fatura</a>` : '<a href="#cartao">cadastrar cartão</a>')}
    <div class="prow total"><div class="k">Livre no início do mês</div><div class="num v ${p.start<0?'neg':''}">${money(p.start)}</div></div>
    ${p.extras ? row('Entradas extras', p.extras, '+', 'freelas, reembolsos, rendimentos…') : ''}
    ${row('Gastos do mês', p.variable, '−', 'débito, Pix, dinheiro e o que você guardou')}
    <div class="prow total grand"><div class="k">Disponível agora</div><div class="num v ${p.avail<0?'neg':''}">${money(p.avail)}</div></div>
    ${p.usedSalTx ? `<div class="xs muted" style="margin-top:6px">Neste mês a renda automática foi substituída pelo que você lançou na categoria Salário.</div>` : ''}`;
  return `<div class="card plan"><div class="pl">${left}</div><div class="pr">${right}</div></div>`;
}
export function homeCardsCard(ym){
  const sp = SP();
  if (!sp.cards.length) return `<div class="card"><div class="card-h"><h3>Cartão de crédito</h3></div><p class="t2 small" style="margin:0 0 12px">Cadastre seus cartões para acompanhar fatura, parcelas e limite disponível.</p><a class="btn sm ghost" href="#cartao" data-write>Cadastrar cartão</a></div>`;
  return `<div class="card"><div class="card-h"><h3>Cartões</h3><span class="sub">fatura de ${MONTHS[+ym.slice(5)-1]}</span><div class="right"><a class="btn xs ghost" href="#cartao">Abrir</a></div></div><div class="list">${sp.cards.map(c => {
    const tot = invoiceTotal(c, ym), st = invoiceStatus(c, ym), used = cardUsed(c), lim = Number(c.limit)||0;
    return `<div class="item click" data-act="goCard" data-id="${esc(c.id)}" role="button" tabindex="0"><div class="cc-dot" style="background:${cardGrad(c)}"></div><div class="main"><div class="title">${esc(c.name)}</div><div class="meta">${statusPill(st.pill)}${lim?`<span>Limite livre ${money(lim-used)}</span>`:''}</div></div><div class="amt num">${money(tot)}</div></div>`; }).join('')}</div></div>`;
}
export function homeFixedCard(ym){
  const sp = SP(); const fx = sp.fixed.filter(f=>fixedIn(f, ym));
  if (!fx.length) return `<div class="card"><div class="card-h"><h3>Despesas fixas</h3></div><p class="t2 small" style="margin:0 0 12px">Cadastre aluguel, internet, luz e outras contas que se repetem todo mês.</p><a class="btn sm ghost" href="#fixas" data-write>Adicionar despesas fixas</a></div>`;
  const paid = fx.filter(f => linkedTx('fixed', f.id, ym).length);
  const pending = fx.filter(f => !linkedTx('fixed', f.id, ym).length).sort((a,b)=>(a.dueDay||0)-(b.dueDay||0));
  return `<div class="card"><div class="card-h"><h3>Despesas fixas</h3><span class="sub">${paid.length}/${fx.length} pagas</span><div class="right"><a class="btn xs ghost" href="#fixas">Todas</a></div></div>
    <div class="bar thin t-good" style="margin-bottom:6px"><i style="width:${fx.length?paid.length/fx.length*100:0}%"></i></div>
    ${pending.length ? `<div class="list">${pending.slice(0,3).map(f => `<div class="item"><div class="emoji sm">${esc(catById(f.cat).emoji)}</div><div class="main"><div class="title">${esc(f.name)}</div><div class="meta">${fixedStatus(f, ym)}</div></div><div class="amt num">${money(f.amount)}</div><button class="btn xs" data-act="payFixed" data-id="${esc(f.id)}" data-write>Pagar</button></div>`).join('')}</div>` : `<div class="status good" style="margin-top:8px">${icon('checkCircle')}Tudo pago neste mês</div>`}
  </div>`;
}
export function fixedStatus(f, ym){
  const paid = linkedTx('fixed', f.id, ym);
  if (paid.length) return statusPill({cls:'good', ic:'checkCircle', label:'Pago em ' + fmtDate(paid[0].date).slice(0,5)});
  const due = f.dueDay ? `${pad(Math.min(f.dueDay, dim(+ym.slice(0,4), +ym.slice(5))))}/${ym.slice(5)}` : '';
  const today = todayISO();
  const dueISO = f.dueDay ? `${ym}-${due.slice(0,2)}` : null;
  if (dueISO && dueISO < today) return statusPill({cls:'crit', ic:'alertCircle', label:'Atrasada · venceu ' + due});
  return statusPill({cls:'info', ic:'clock', label: due ? 'Vence ' + due : 'Pendente'});
}
export function upcomingSubs(n){
  const sp = SP(); const arr = sp.subs.filter(s=>s.active!==false).map(s => ({s, d: nextCharge(s)})).filter(x=>x.d).sort((a,b)=>a.d.localeCompare(b.d)).slice(0,n);
  if (!arr.length) return `<p class="t2 small" style="margin:10px 0 0">Nenhuma assinatura cadastrada.</p>`;
  return `<div class="list" style="margin-top:8px">${arr.map(({s,d}) => `<div class="item"><div class="emoji sm">${esc(s.emoji||'📺')}</div><div class="main"><div class="title">${esc(s.name)}</div><div class="meta">Próxima cobrança: ${fmtDate(d)}</div></div><div class="amt num">${money(s.amount)}</div></div>`).join('')}</div>`;
}

