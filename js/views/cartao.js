import { afterRender } from '../bus.js';
import { drawBars } from '../charts.js';
import { CARD_COLORS } from '../constants.js';
import { cardById, cardItems, cardUsed, catById, displayName, instValue, invoiceDates, invoicePaid, invoiceStatus, invoiceTotal, monthDiff } from '../selectors.js';
import { SP, state } from '../state.js';
import { emptyState, statusPill } from '../ui.js';
import { $, MONTHS, PCT, addMonths, clamp, esc, fmtDate, icon, money, sum, ymShort } from '../utils.js';

/* ---------- Credit card ---------- */
export function cardGrad(c){ return CARD_COLORS[c && c.color] || CARD_COLORS.roxo; }
export function viewCard(){
  const sp = SP(), ym = state.month;
  if (!sp.cards.length) return `<div class="card">${emptyState('💳','Nenhum cartão cadastrado','Cadastre seu cartão com limite, dia de fechamento e de vencimento. Depois lance as compras, à vista ou parceladas, e acompanhe cada fatura mês a mês.', `<button class="btn sm" data-act="newCard" data-write>${icon('plus')}Cadastrar cartão</button>`)}</div>`;
  const card = cardById(state.cardSel) || sp.cards[0];
  const used = cardUsed(card), lim = Number(card.limit)||0, avail = lim - used;
  const items = cardItems(ym, sp, card.id).sort((a,b) => String(b.buyDate).localeCompare(String(a.buyDate)) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const tot = sum(items, t => t.amount), st = invoiceStatus(card, ym), {due, close} = invoiceDates(card, ym), paid = invoicePaid(card, ym);
  const mName = MONTHS[+ym.slice(5)-1];
  let h = `<div class="row wrap" style="gap:8px;margin-bottom:16px">${sp.cards.map(c => `<button class="cc-pill" data-act="selCard" data-id="${esc(c.id)}" aria-pressed="${c.id===card.id}"><i style="background:${cardGrad(c)}"></i>${esc(c.name)}</button>`).join('')}<button class="btn sm ghost" data-act="newCard" data-write>${icon('plus')}Novo cartão</button></div>
  <div class="grid g-main">
    <div class="cc" style="background:${cardGrad(card)}">
      <div class="row"><div class="cc-name">${esc(card.name)}</div><button class="icon-btn cc-edit" data-act="editCard" data-id="${esc(card.id)}" aria-label="Editar cartão" data-write>${icon('edit')}</button></div>
      <div class="cc-chip"></div>
      <div class="cc-label">Limite disponível</div>
      <div class="cc-big num">${lim ? money(avail) : '—'}</div>
      ${lim ? `<div class="cc-bar"><i style="width:${clamp(used/lim,0,1)*100}%"></i></div><div class="cc-foot"><span>Usado ${money(used)}</span><span>Limite ${money(lim)}</span></div>` : '<div class="cc-foot"><span>Defina o limite para acompanhar o uso</span></div>'}
      <div class="cc-foot" style="margin-top:12px;opacity:.85"><span>Fecha dia ${card.closingDay} · vence dia ${card.dueDay}</span><span>Melhor dia de compra: ${card.closingDay}</span></div>
    </div>
    <div class="card"><div class="card-h"><h3>Fatura de ${mName}</h3><div class="right">${statusPill(st.pill)}</div></div>
      <div class="num" style="font-size:34px;font-weight:800;letter-spacing:-.03em">${money(tot)}</div>
      <div class="small t2" style="margin-top:4px">Fecha em ${fmtDate(close)} · vence em ${fmtDate(due)} · ${items.length} item(ns)</div>
      ${lim && tot ? `<div class="small muted" style="margin-top:2px">${PCT(tot/lim)} do limite</div>` : ''}
      <div class="row wrap" style="margin-top:18px;gap:8px" data-write>
        <button class="btn" data-act="newBuy">${icon('plus')}Nova compra</button>
        ${paid === 'auto' ? '' : paid ? `<button class="btn ghost" data-act="unpayInvoice" data-id="${esc(card.id)}">Desfazer pagamento</button>` : tot ? `<button class="btn ghost" data-act="payInvoice" data-id="${esc(card.id)}">${icon('check')}Marcar fatura como paga</button>` : ''}
      </div>
      <p class="xs muted" style="margin:14px 0 0">A fatura que vence em ${mName} já é descontada do seu valor disponível do mês na Visão geral. Pagar a fatura libera o limite.</p>
    </div>
  </div>
  <div class="section-title"><h2>Compras nesta fatura</h2><span class="muted small">use as setas do mês no topo para ver outras faturas</span></div>
  <div class="card">${items.length ? `<div class="list">${items.map(t => { const c = catById(t.cat); return `<div class="item click" data-act="editBuy" data-id="${esc(t._buy)}" role="button" tabindex="0"><div class="emoji">${esc(c.emoji)}</div><div class="main"><div class="title">${esc(t.desc)}</div><div class="meta">${esc(c.name)} · comprado em ${fmtDate(t.buyDate)} ${t.n>1?`<span class="chip">parcela ${t.k+1} de ${t.n}</span>`:'<span class="chip">à vista</span>'}${(t.tags||[]).map(g=>`<span class="chip tag">#${esc(g)}</span>`).join('')}${state.space==='joint'&&t.by?`<span class="chip">${esc(displayName(t.by))}</span>`:''}</div></div><div class="amt num">${money(t.amount)}</div></div>`; }).join('')}</div>` : emptyState('🧾', 'Fatura vazia', `Nenhuma compra cai na fatura de ${mName}.`, `<button class="btn sm" data-act="newBuy" data-write>${icon('plus')}Lançar compra</button>`)}</div>`;
  // Active installment plans
  const active = sp.cardbuys.filter(b => b.cardId === card.id && (b.n||1) > 1).map(b => { const k = monthDiff(b.firstDue, ym); const last = addMonths(b.firstDue, (b.n||1)-1); let remaining = 0, rc = 0; for (let i = Math.max(0,k); i < b.n; i++){ remaining += instValue(b, i); rc++; } return {b, k, last, remaining, rc}; }).filter(x => x.last >= ym).sort((a,b) => b.remaining - a.remaining);
  h += `<div class="grid g-2" style="margin-top:16px">
    <div class="card"><div class="card-h"><h3>Próximas faturas</h3><span class="sub">compras já lançadas</span></div><div class="chart" id="ccBars" data-h="220"></div></div>
    <div class="card"><div class="card-h"><h3>Parcelamentos em andamento</h3><span class="sub">${active.length}</span></div>
      ${active.length ? `<div class="list">${active.map(({b,k,last,remaining,rc}) => `<div class="item click" data-act="editBuy" data-id="${esc(b.id)}" role="button" tabindex="0"><div class="emoji sm">${esc(catById(b.cat).emoji)}</div><div class="main"><div class="title">${esc(b.desc)}</div><div class="meta">${b.n}x de ${money(b.inst)} · ${k < 0 ? `começa em ${ymShort(b.firstDue)}` : `parcela ${k+1}/${b.n} agora`} · termina em ${ymShort(last)}</div><div class="bar thin" style="margin-top:6px"><i style="width:${clamp((Math.max(0,k))/b.n,0,1)*100}%"></i></div></div><div class="amt num">${money(remaining)}<div class="xs muted" style="font-weight:600">${rc} restante(s)</div></div></div>`).join('')}</div>` : '<p class="t2 small" style="margin:0">Nenhuma compra parcelada em aberto neste cartão.</p>'}</div>
  </div>`;
  afterRender.push(() => { const months = Array.from({length:6}, (_,i) => addMonths(ym, i)); drawBars($('#ccBars'), {labels: months.map(ymShort), months, series:[{name:'Fatura', color:'--s1', values: months.map(m => invoiceTotal(card, m))}]}); });
  return h;
}

