import { CYCLES, DEFAULT_CATS } from './constants.js';
import { SP, state } from './state.js';
import { $, addMonths, dim, fmtDate, pad, parseISO, sum, toISO, todayISO, ymNow } from './utils.js';

/* ================= Selectors ================= */
export function settings(sp = SP()){ return Object.assign({name:'', budgetTotal:0, budgetCats:{}, categories:null}, sp.settings||{}); }
export function cats(sp = SP()){ return settings(sp).categories || DEFAULT_CATS; }
export function catById(id, sp = SP()){ return cats(sp).find(c => c.id === id) || {id, name: id ? 'Categoria removida' : 'Sem categoria', emoji:'📦', kind:'out'}; }
export function allTx(sp = SP()){ return Object.values(sp.tx).flat(); }
export function txOfMonth(ym, sp = SP()){ return (sp.tx[ym.slice(0,4)] || []).filter(t => String(t.date).slice(0,7) === ym); }
export function totals(list){ const i = sum(list.filter(t=>t.type==='in'), t=>t.amount), o = sum(list.filter(t=>t.type==='out'), t=>t.amount); return {in:i, out:o, bal:i-o}; }
export function allTags(sp = SP()){ const s = new Set(); allTx(sp).forEach(t => (t.tags||[]).forEach(g => s.add(g))); return [...s].sort((a,b)=>a.localeCompare(b,'pt-BR')); }
export function subMonthly(s){ return (Number(s.amount)||0) * (CYCLES[s.cycle]?.f ?? 1); }
export function stepCycle(d, cycle, dir, anchor){
  if (cycle === 'semanal') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7*dir);
  const k = ({mensal:1, trimestral:3, semestral:6, anual:12}[cycle] || 1) * dir;
  const base = new Date(d.getFullYear(), d.getMonth() + k, 1);
  return new Date(base.getFullYear(), base.getMonth(), Math.min(anchor, dim(base.getFullYear(), base.getMonth()+1)));
}
export function chargesInMonth(s, ym){
  if (!s.nextDate) return [];
  const [y, m] = ym.split('-').map(Number);
  const ms = new Date(y, m-1, 1), me = new Date(y, m-1, dim(y, m));
  const anchor = parseISO(s.nextDate).getDate();
  let d = parseISO(s.nextDate), g = 0;
  while (d > me && g++ < 800) d = stepCycle(d, s.cycle, -1, anchor);
  while (d < ms && g++ < 1600) d = stepCycle(d, s.cycle, 1, anchor);
  const out = []; const since = s.createdAt ? String(s.createdAt).slice(0,7) : null;
  if (since && ym < since) return [];
  while (d <= me && g++ < 1700){ out.push(toISO(d)); d = stepCycle(d, s.cycle, 1, anchor); }
  return out;
}
export function nextCharge(s){
  if (!s.nextDate) return null;
  const t = parseISO(todayISO()); const anchor = parseISO(s.nextDate).getDate();
  let d = parseISO(s.nextDate), g = 0;
  while (d > t && g++ < 800){ const p = stepCycle(d, s.cycle, -1, anchor); if (p < t) break; d = p; }
  while (d < t && g++ < 1600) d = stepCycle(d, s.cycle, 1, anchor);
  return toISO(d);
}
export function fixedIn(f, ym){ return f.active !== false && (!f.createdAt || String(f.createdAt).slice(0,7) <= ym); }
export function linkedTx(src, id, ym, sp = SP()){ return txOfMonth(ym, sp).filter(t => t.src === src && t.srcId === id); }
export function goalSaved(g, sp = SP()){ return sum(sp.moves.filter(m => m.goalId === g.id), m => m.amount); }
export function totalSaved(sp = SP()){ return sum(sp.goals, g => goalSaved(g, sp)); }
export function monthsUntil(ym){ if (!ym) return null; const [y,m] = ym.split('-').map(Number); const [cy,cm] = ymNow().split('-').map(Number); return (y-cy)*12 + (m-cm); }
export function plannedForMonth(ym, sp = SP()){
  // commitments not yet launched: active fixed + subscription charges in the month
  const items = []; if (ym < ymNow()) return items;
  sp.fixed.filter(f => fixedIn(f, ym)).forEach(f => { if (!linkedTx('fixed', f.id, ym, sp).length) items.push({kind:'fixed', ref:f, amount:Number(f.amount)||0, cat:f.cat}); });
  sp.subs.filter(s => s.active !== false).forEach(s => { const n = chargesInMonth(s, ym).length - linkedTx('sub', s.id, ym, sp).length; if (n > 0) items.push({kind:'sub', ref:s, amount:n*(Number(s.amount)||0), cat:s.cat}); });
  return items;
}
/* --- Income --- */
export function incomes(sp = SP()){ return [...(settings(sp).incomes || [])].sort((a,b) => String(a.from).localeCompare(String(b.from))); }
export function incomeFor(ym, sp = SP()){
  const list = incomes(sp); if (!list.length) return 0;
  let cur = null; for (const it of list) if (it.from <= ym) cur = it;
  return Number((cur || list[0]).amount) || 0;
}
export function easter(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return new Date(y,mo-1,da); }
export const _hol = {};
export function holidays(y){ if (_hol[y]) return _hol[y]; const set = new Set(['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'].map(x => `${y}-${x}`)); const e = easter(y); set.add(toISO(new Date(e.getFullYear(), e.getMonth(), e.getDate()-2))); return (_hol[y] = set); }
export function fifthBusinessDay(ym, satToFri = true){
  const [y,m] = ym.split('-').map(Number); const hol = holidays(y); let n = 0;
  for (let d = 1; d <= dim(y,m); d++){
    const dt = new Date(y, m-1, d); if (dt.getDay() === 0 || hol.has(toISO(dt))) continue;
    if (++n === 5){
      if (dt.getDay() === 6 && satToFri){ const p = new Date(dt); do { p.setDate(p.getDate()-1); } while (p.getDay() === 0 || p.getDay() === 6 || hol.has(toISO(p))); return toISO(p); }
      return toISO(dt);
    }
  }
  return `${ym}-05`;
}
export function payDate(ym, sp = SP()){
  const set = settings(sp); const [y,m] = ym.split('-').map(Number);
  if (set.payDay && set.payDay !== '5du') return `${ym}-${pad(Math.min(+set.payDay || 5, dim(y,m)))}`;
  return fifthBusinessDay(ym, set.paySatFri !== false);
}
export function payDayLabel(sp = SP()){ const set = settings(sp); return set.payDay && set.payDay !== '5du' ? `todo dia ${set.payDay}` : '5º dia útil'; }
export function incomeItems(ym, sp = SP()){
  const list = incomes(sp); if (!list.length || ym < list[0].from) return [];
  if (txOfMonth(ym, sp).some(t => t.type === 'in' && t.cat === 'salario')) return [];
  const amount = incomeFor(ym, sp); if (!(amount > 0)) return [];
  const date = payDate(ym, sp);
  return [{id:'inc:'+ym, _virtual:true, _income:true, type:'in', amount, date, desc:'Renda mensal', cat:'salario', tags:[], src:'income', future: date > todayISO(), createdAt:''}];
}
export function monthIncome(ym, sp = SP()){ const p = monthPlan(ym, sp); return p.renda + p.extras; }

/* --- Credit cards --- */
export const monthDiff = (a, b) => { const [ay,am] = a.split('-').map(Number), [by,bm] = b.split('-').map(Number); return (by-ay)*12 + (bm-am); };
export function cardById(id, sp = SP()){ return sp.cards.find(c => c.id === id); }
export function invoiceDates(card, dueYm){
  const [y,m] = dueYm.split('-').map(Number);
  const closeYm = card.dueDay > card.closingDay ? dueYm : addMonths(dueYm, -1);
  const [cy,cm] = closeYm.split('-').map(Number);
  return {due: `${dueYm}-${pad(Math.min(card.dueDay, dim(y,m)))}`, close: `${closeYm}-${pad(Math.min(card.closingDay, dim(cy,cm)))}`};
}
export function firstDueFor(card, dateISO){
  if (!card || !dateISO) return ymNow();
  let closeYm = dateISO.slice(0,7);
  const [y,m] = closeYm.split('-').map(Number);
  if (parseISO(dateISO).getDate() >= Math.min(card.closingDay, dim(y,m))) closeYm = addMonths(closeYm, 1);
  return card.dueDay > card.closingDay ? closeYm : addMonths(closeYm, 1);
}
export function instValue(b, k){ const n = b.n||1, inst = Number(b.inst)||0; return k === 0 ? Math.round((Number(b.total||inst*n) - inst*(n-1))*100)/100 : inst; }
export function cardItems(ym, sp = SP(), cardId = null){
  const out = [];
  for (const b of sp.cardbuys){
    if (cardId && b.cardId !== cardId) continue;
    const card = cardById(b.cardId, sp); if (!card || !b.firstDue) continue;
    const k = monthDiff(b.firstDue, ym);
    if (k < 0 || k >= (b.n||1)) continue;
    out.push({id:`cb:${b.id}:${k}`, _virtual:true, _buy:b.id, type:'out', amount: instValue(b, k), date: invoiceDates(card, ym).due, desc: b.desc + ((b.n||1) > 1 ? ` (${k+1}/${b.n})` : ''), cat: b.cat, tags: b.tags||[], by: b.by, src:'card', cardId: b.cardId, k, n: b.n||1, buyDate: b.date, createdAt: b.createdAt||''});
  }
  return out;
}
export function monthItems(ym, sp = SP()){ return txOfMonth(ym, sp).concat(cardItems(ym, sp), incomeItems(ym, sp)); }
export function invoicePaid(card, ym, sp = SP()){ if (card.createdAt && ym < String(card.createdAt).slice(0,7)) return 'auto'; return sp.cardpay.find(p => p.id === `${card.id}_${ym}`) || null; }
export function invoiceTotal(card, ym, sp = SP()){ return sum(cardItems(ym, sp, card.id), t => t.amount); }
export function cardUsed(card, sp = SP()){
  let used = 0;
  for (const b of sp.cardbuys.filter(b => b.cardId === card.id)) for (let k = 0; k < (b.n||1); k++){ const ym = addMonths(b.firstDue, k); if (!invoicePaid(card, ym, sp)) used += instValue(b, k); }
  return used;
}
export function invoiceStatus(card, ym, sp = SP()){
  const paid = invoicePaid(card, ym, sp); const {due, close} = invoiceDates(card, ym); const t = todayISO();
  if (paid) return {key:'paid', pill:{cls:'good', ic:'checkCircle', label: paid === 'auto' ? 'Anterior ao cadastro' : 'Paga'}};
  if (!invoiceTotal(card, ym, sp)) return {key:'empty', pill:{cls:'', ic:'checkCircle', label: t < close ? 'Aberta · sem compras' : 'Sem compras'}};
  if (t < close) return {key:'open', pill:{cls:'info', ic:'clock', label:'Aberta · fecha ' + fmtDate(close).slice(0,5)}};
  if (t <= due) return {key:'closed', pill:{cls:'warn', ic:'alert', label:'Fechada · vence ' + fmtDate(due).slice(0,5)}};
  return {key:'late', pill:{cls:'crit', ic:'alertCircle', label:'Vencida em ' + fmtDate(due).slice(0,5)}};
}

/* --- The month plan: what is really available --- */
export function monthPlan(ym, sp = SP()){
  const raw = txOfMonth(ym, sp); const cfg = incomeFor(ym, sp);
  const salTx = sum(raw.filter(t => t.type==='in' && t.cat==='salario'), t => t.amount);
  const renda = salTx > 0 ? salTx : cfg;
  const extras = sum(raw.filter(t => t.type==='in' && t.cat !== 'salario'), t => t.amount);
  const activeSubs = sp.subs.filter(s => s.active !== false);
  const subsL = sum(raw.filter(t => t.type==='out' && t.src==='sub'), t => t.amount);
  const subsP = sum(activeSubs, s => Math.max(0, chargesInMonth(s, ym).length - linkedTx('sub', s.id, ym, sp).length) * (Number(s.amount)||0));
  const subsN = new Set([...activeSubs.filter(s => chargesInMonth(s, ym).length).map(s=>s.id), ...raw.filter(t=>t.src==='sub').map(t=>t.srcId)]).size;
  const fixL = sum(raw.filter(t => t.type==='out' && t.src==='fixed'), t => t.amount);
  const fixedM = sp.fixed.filter(f => fixedIn(f, ym));
  const fixP = sum(fixedM.filter(f => !linkedTx('fixed', f.id, ym, sp).length), f => Number(f.amount)||0);
  const card = sum(cardItems(ym, sp), t => t.amount);
  const variable = sum(raw.filter(t => t.type==='out' && t.src!=='sub' && t.src!=='fixed'), t => t.amount);
  const subs = subsL + subsP, fixed = fixL + fixP;
  const start = renda - subs - fixed - card;
  const avail = start + extras - variable;
  return {cfg, salTx, renda, extras, subs, subsN, fixed, fixedN: fixedM.length, fixP, card, variable, start, avail, usedSalTx: cfg > 0 && salTx > 0, payDate: payDate(ym, sp)};
}
export function displayName(id){ if (!id) return 'Alguém'; if (id === state.uid) return 'Você'; return state.names[id] || 'Parceiro(a)'; }

