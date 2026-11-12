import { catById, fixedIn, linkedTx } from '../selectors.js';
import { SP, state } from '../state.js';
import { emptyState, kpi, statusPill } from '../ui.js';
import { $, MONTHS, esc, icon, money, sum } from '../utils.js';
import { fixedStatus } from './inicio.js';

/* ---------- Fixed ---------- */
export function viewFixed(){
  const sp = SP(), ym = state.month;
  const fx = sp.fixed.filter(f => fixedIn(f, ym));
  const total = sum(fx, f => f.amount);
  const paidAmt = sum(fx, f => sum(linkedTx('fixed', f.id, ym), t => t.amount));
  const pendingList = fx.filter(f => !linkedTx('fixed', f.id, ym).length);
  let h = `<div class="grid g-3">
    ${kpi('Total fixo previsto', money(total), `${fx.length} conta(s) por mês`, 'cal', 'hero')}
    ${kpi('Já pago em ' + MONTHS[+ym.slice(5)-1], money(paidAmt), `${fx.length - pendingList.length} de ${fx.length} pagas`, 'checkCircle')}
    ${kpi('Falta pagar', money(sum(pendingList, f=>f.amount)), pendingList.length ? `${pendingList.length} pendente(s)` : 'Tudo em dia 🎉', 'clock')}
  </div>
  <div class="section-title"><h2>Contas do mês</h2><div class="right"><button class="btn" data-act="newFixed" data-write>${icon('plus')}Nova despesa fixa</button></div></div>`;
  if (!sp.fixed.length) return h + `<div class="card">${emptyState('🏠','Nenhuma despesa fixa','Cadastre aluguel, condomínio, internet, luz, água, plano de celular… Elas aparecem todo mês para você marcar como pagas.', `<button class="btn sm" data-act="newFixed" data-write>${icon('plus')}Adicionar despesa fixa</button>`)}</div>`;
  const sorted = [...sp.fixed].filter(f => !f.createdAt || String(f.createdAt).slice(0,7) <= ym).sort((a,b) => (b.active!==false)-(a.active!==false) || (a.dueDay||99)-(b.dueDay||99));
  h += `<div class="card"><div class="list">${sorted.map(f => {
    const paid = linkedTx('fixed', f.id, ym); const on = f.active !== false; const c = catById(f.cat);
    return `<div class="item" style="${on?'':'opacity:.55'}"><div class="emoji">${esc(c.emoji)}</div>
      <div class="main"><div class="title">${esc(f.name)}</div><div class="meta">${esc(c.name)}${f.dueDay?` · vence dia ${f.dueDay}`:''}${f.variable?' · valor variável':''} ${on?fixedStatus(f, ym):statusPill({cls:'',ic:'pause',label:'Inativa'})}</div></div>
      <div class="amt num">${money(paid.length ? sum(paid,t=>t.amount) : f.amount)}${f.variable && !paid.length ? '<div class="xs muted" style="font-weight:600">estimado</div>' : ''}</div>
      <div class="row">${on ? (paid.length ? `<button class="btn xs ghost" data-act="unpayFixed" data-id="${esc(f.id)}" data-write>Desfazer</button>` : `<button class="btn xs" data-act="payFixed" data-id="${esc(f.id)}" data-write>Marcar pago</button>`) : ''}<button class="icon-btn" data-act="editFixed" data-id="${esc(f.id)}" aria-label="Editar" data-write>${icon('edit')}</button></div></div>`;
  }).join('')}</div></div>`;
  return h;
}

