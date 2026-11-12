import { tip } from '../charts.js';
import { CYCLES } from '../constants.js';
import { chargesInMonth, linkedTx, monthIncome, monthItems, nextCharge, subMonthly, totals } from '../selectors.js';
import { SP, state } from '../state.js';
import { emptyState, kpi, statusPill } from '../ui.js';
import { $, MONTHS, PCT, esc, fmtDate, icon, money, sum } from '../utils.js';

/* ---------- Subscriptions ---------- */
export function viewSubs(){
  const sp = SP(), ym = state.month;
  const active = sp.subs.filter(s => s.active !== false), paused = sp.subs.filter(s => s.active === false);
  const monthly = sum(active, subMonthly), out = totals(monthItems(ym)).out;
  const inc = monthIncome(ym);
  let h = `<div class="grid g-4">
    ${kpi('Custo mensal', money(monthly), 'Equivalente mensal de todos os ciclos', 'repeat', 'hero')}
    ${kpi('Custo anual', money(monthly*12), 'Projeção de 12 meses', 'cal')}
    ${kpi('Assinaturas ativas', String(active.length), paused.length ? `${paused.length} pausada(s) · economia de ${money(sum(paused, subMonthly))}/mês` : 'Nenhuma pausada', 'list')}
    ${kpi('Peso na renda', inc ? PCT(monthly/inc) : '—', inc ? `da renda de ${MONTHS[+ym.slice(5)-1]}` : 'Lance suas entradas para calcular', 'gauge')}
  </div>`;
  h += `<div class="section-title"><h2>Seus planos</h2><div class="right"><button class="btn" data-act="newSub" data-write>${icon('plus')}Nova assinatura</button></div></div>`;
  if (!sp.subs.length) return h + `<div class="card">${emptyState('📺','Nenhuma assinatura','Adicione streaming, música, nuvem, academia… e veja quanto elas custam por mês e por ano.', `<button class="btn sm" data-act="newSub" data-write>${icon('plus')}Adicionar assinatura</button>`)}</div>`;
  const sorted = [...sp.subs].sort((a,b) => (b.active!==false) - (a.active!==false) || subMonthly(b) - subMonthly(a));
  const maxM = Math.max(...active.map(subMonthly), 1);
  h += `<div class="grid g-main"><div class="card"><div class="list">${sorted.map(s => {
    const charges = chargesInMonth(s, ym), launched = linkedTx('sub', s.id, ym).length, nc = nextCharge(s);
    const on = s.active !== false;
    let st = '';
    if (!on) st = statusPill({cls:'', ic:'pause', label:'Pausada'});
    else if (charges.length && launched >= charges.length) st = statusPill({cls:'good', ic:'checkCircle', label:'Lançada no mês'});
    else if (charges.length) st = `<button class="btn xs" data-act="launchSub" data-id="${esc(s.id)}" data-write>Lançar cobrança</button>`;
    return `<div class="item" style="${on?'':'opacity:.6'}"><div class="emoji">${esc(s.emoji||'📺')}</div>
      <div class="main"><div class="title">${esc(s.name)}</div><div class="meta">${money(s.amount)} · ${CYCLES[s.cycle]?.label||''}${s.cycle!=='mensal'?` (${money(subMonthly(s))}/mês)`:''}${on&&nc?` · próxima ${fmtDate(nc)}`:''}</div></div>
      <div class="row">${st}<button class="icon-btn" data-act="toggleSub" data-id="${esc(s.id)}" title="${on?'Pausar':'Reativar'}" aria-label="${on?'Pausar':'Reativar'}" data-write>${icon(on?'pause':'play')}</button><button class="icon-btn" data-act="editSub" data-id="${esc(s.id)}" aria-label="Editar" data-write>${icon('edit')}</button></div></div>`;
  }).join('')}</div></div>
  <div class="card"><div class="card-h"><h3>Custo mensal por assinatura</h3></div>
    ${active.length ? `<div class="hbars">${[...active].sort((a,b)=>subMonthly(b)-subMonthly(a)).map(s => `<div class="hb"><div class="top"><span class="n">${esc(s.emoji||'📺')} ${esc(s.name)}</span><span class="num t2">${money(subMonthly(s))} · ${PCT(subMonthly(s)/monthly)}</span></div><div class="track"><i style="width:${subMonthly(s)/maxM*100}%"></i></div></div>`).join('')}</div>` : '<p class="t2 small">Nenhuma assinatura ativa.</p>'}
    <div class="tip-card" style="margin-top:18px"><div class="ic">${icon('bulb')}</div><div><h4>Dica</h4><p>Revise as que você não usou no último mês. Cancelar ${active.length ? esc(([...active].sort((a,b)=>subMonthly(b)-subMonthly(a))[0]||{}).name) : 'uma assinatura'} economizaria ${money(active.length ? Math.max(...active.map(subMonthly))*12 : 0)} por ano.</p></div></div>
  </div></div>`;
  return h;
}

