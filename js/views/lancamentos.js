import { allTags, catById, cats, monthItems, totals } from '../selectors.js';
import { state } from '../state.js';
import { emptyState, kpi, txRow } from '../ui.js';
import { $, esc, fmtDay, icon, money, ymLabel } from '../utils.js';

/* ---------- Transactions ---------- */
export function viewTx(){
  const ym = state.month, f = state.txf, cs = cats();
  let list = monthItems(ym);
  const q = f.q.trim().toLowerCase();
  if (f.type !== 'all') list = list.filter(t => t.type === f.type);
  if (f.cat !== 'all') list = list.filter(t => t.cat === f.cat);
  if (f.tag !== 'all') list = list.filter(t => (t.tags||[]).includes(f.tag));
  if (q) list = list.filter(t => [t.desc, catById(t.cat).name, ...(t.tags||[])].join(' ').toLowerCase().includes(q) || String(t.amount).includes(q));
  list.sort((a,b) => (b.date + (b.createdAt||0)).localeCompare(a.date + (a.createdAt||0)));
  const T = totals(list), tags = allTags();
  let h = `<div class="filters">
    <input class="input search" id="txq" placeholder="Buscar por descrição, categoria ou tag…" value="${esc(f.q)}" data-on="txf" data-k="q" aria-label="Buscar">
    <div class="seg" role="group" aria-label="Tipo">${[['all','Todos'],['out','Saídas'],['in','Entradas']].map(([v,l])=>`<button data-act="txType" data-v="${v}" aria-pressed="${f.type===v}">${l}</button>`).join('')}</div>
    <select class="select" data-on="txf" data-k="cat" aria-label="Categoria"><option value="all">Todas as categorias</option>${cs.map(c=>`<option value="${esc(c.id)}" ${f.cat===c.id?'selected':''}>${esc(c.emoji+' '+c.name)}</option>`).join('')}</select>
    <select class="select" data-on="txf" data-k="tag" aria-label="Tag"><option value="all">Todas as tags</option>${tags.map(g=>`<option value="${esc(g)}" ${f.tag===g?'selected':''}>#${esc(g)}</option>`).join('')}</select>
    <button class="btn" data-act="newTx" data-write>${icon('plus')}Novo</button>
  </div>
  <div class="grid g-3" style="margin-bottom:16px">
    ${kpi('Entradas filtradas', `<span class="pos">${money(T.in)}</span>`, '', 'up')}
    ${kpi('Saídas filtradas', money(T.out), '', 'down')}
    ${kpi('Resultado', money(T.bal), `${list.length} lançamento(s)`, 'wallet')}
  </div>`;
  if (!list.length){
    const any = monthItems(ym).length;
    h += `<div class="card">${any ? emptyState('🔎','Nada encontrado','Nenhum lançamento corresponde aos filtros.', `<button class="btn sm ghost" data-act="clearTxf">Limpar filtros</button>`) : emptyState('🧾', 'Nenhum lançamento em ' + ymLabel(ym), 'Use o botão “Novo” (ou a tecla N) para registrar uma entrada ou saída.', `<button class="btn sm" data-act="newTx" data-write>${icon('plus')}Novo lançamento</button>`)}</div>`;
    return h;
  }
  const byDay = {}; list.forEach(t => (byDay[t.date] = byDay[t.date] || []).push(t));
  h += `<div class="card" style="padding-top:6px">${Object.keys(byDay).sort().reverse().map(d => { const dt = totals(byDay[d]); return `<div class="day-h"><span>${fmtDay(d)}</span><span class="num">${dt.bal>=0?'+':'−'} ${money(Math.abs(dt.bal))}</span></div><div class="list">${byDay[d].map(t=>txRow(t)).join('')}</div>`; }).join('')}</div>`;
  return h;
}

