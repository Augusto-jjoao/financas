import { cardById, catById, cats, displayName, payDayLabel } from './selectors.js';
import { state } from './state.js';
import { $, esc, fmtDate, icon, moneySigned, todayISO, ymNow } from './utils.js';

/* ---------- small components ---------- */
export function kpi(label, value, foot='', ic='wallet', cls=''){ return `<div class="card kpi ${cls}"><div class="label"><span class="dot">${icon(ic)}</span>${label}</div><div class="value num">${value}</div>${foot?`<div class="foot">${foot}</div>`:''}</div>`; }
export function budgetStatus(pct){
  if (pct >= 1) return {cls:'crit', t:'crit', label:'Estourado', ic:'alertCircle'};
  if (pct >= .8) return {cls:'warn', t:'warn', label:'Atenção', ic:'alert'};
  return {cls:'good', t:'', label:'No limite', ic:'checkCircle'};
}
export const statusPill = (s) => `<span class="status ${s.cls}">${icon(s.ic)}${s.label}</span>`;
export function emptyState(emoji, title, text, btn){ return `<div class="empty"><div class="big">${emoji}</div><h3>${title}</h3><p>${text}</p>${btn||''}</div>`; }
export function txRow(t, opts={}){
  const c = catById(t.cat);
  const tags = (t.tags||[]).map(g => `<span class="chip tag">#${esc(g)}</span>`).join('');
  const by = state.space === 'joint' && t.by ? `<span class="chip">${esc(displayName(t.by))}</span>` : '';
  const srcChip = t.src === 'fixed' ? '<span class="chip">fixa</span>' : t.src === 'sub' ? '<span class="chip">assinatura</span>' : t.src === 'goal' ? '<span class="chip">meta</span>' : t.src === 'card' ? `<span class="chip">💳 ${esc((cardById(t.cardId)||{}).name||'cartão')}${t.k >= 0 ? (t.n > 1 ? ` · ${t.k+1}/${t.n}` : '') : (t.n > 1 ? ` · ${t.n}x` : '')}</span>` : '';
  const act = t._income ? `data-act="incomeEntry" data-ym="${esc(String(t.date).slice(0,7))}"` : t._virtual ? `data-act="editBuy" data-id="${esc(t._buy)}"` : `data-act="editTx" data-id="${esc(t.id)}" data-y="${esc(t._y)}"`;
  const incChip = t._income ? (t.future ? `<span class="chip">${icon('clock')} agendada · ${payDayLabel()}</span>` : `<span class="chip">automática · ${payDayLabel()}</span>`) : '';
  return `<div class="item click" ${act} role="button" tabindex="0">
    <div class="emoji">${esc(c.emoji)}</div>
    <div class="main"><div class="title">${esc(t.desc || c.name)}</div>
      <div class="meta">${esc(c.name)}${opts.date ? ' · ' + fmtDate(t.date) : ''} ${srcChip}${incChip}${tags}${by}</div></div>
    <div class="amt num ${t.type==='in'?'pos':''}">${moneySigned(t.amount, t.type)}</div></div>`;
}

/* ================= Modals ================= */
export function openModal(html, {wide=false, onMount}={}){
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay" data-overlay><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true">${html}</div></div>`;
  root.classList.add('open');
  const m = root.querySelector('.modal');
  onMount && onMount(m);
  const f = m.querySelector('[autofocus]') || m.querySelector('input:not([type=hidden]),select,textarea');
  if (f && matchMedia('(min-width: 861px)').matches) setTimeout(() => { if (!m.contains(document.activeElement)){ f.focus(); f.select && f.select(); } }, 30);
  return m;
}
export function closeModal(){ const root = $('#modal-root'); root.classList.remove('open'); root.innerHTML = ''; }
export const mHead = t => `<div class="modal-h"><h2>${t}</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="Fechar">${icon('x')}</button></div>`;
export function confirmBox(title, text, okLabel='Apagar'){
  return new Promise(res => {
    const m = openModal(`${mHead(title)}<div class="modal-b"><p class="t2" style="margin:0">${text}</p></div><div class="modal-f"><button class="btn ghost" data-r="0">Cancelar</button><button class="btn" style="background:var(--crit);color:#fff" data-r="1">${okLabel}</button></div>`);
    m.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b){ closeModal(); res(b.dataset.r === '1'); } });
  });
}
export function catOptions(kind, selected){
  return cats().filter(c => c.kind === kind).map(c => `<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.emoji+' '+c.name)}</option>`).join('');
}
export function defaultDate(){ return state.month === ymNow() ? todayISO() : `${state.month}-01`; }

