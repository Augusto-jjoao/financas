import { changed, toast } from './bus.js';
import { hideTip } from './charts.js';
import { DEFAULT_RATES } from './constants.js';
import { AUTH, DB, colRef, createHousehold, del, ensureYears, exportBackup, householdId, joinHousehold, leaveHousehold, put, saveSettings, startSpace } from './data/store.js';
import { subModal, submitSub } from './modals/assinatura.js';
import { importModal, submitImport } from './modals/backup.js';
import { buyModal, cardModal, submitBuy, submitCard } from './modals/cartao.js';
import { catModal, submitCat } from './modals/categoria.js';
import { fixedModal, payModal, submitFixed, submitPay } from './modals/fixa.js';
import { findTx, submitTx, txModal } from './modals/lancamento.js';
import { goalModal, moveModal, submitGoal, submitMove } from './modals/meta.js';
import { incomeModal, incomeModalMount, submitIncome } from './modals/renda.js';
import { NAV_MAIN, NAV_SEC, ROUTES } from './render.js';
import { cardById, catById, cats, goalSaved, incomeItems, incomes, invoiceTotal, linkedTx, monthItems, monthsUntil, payDayLabel, settings } from './selectors.js';
import { SP, state } from './state.js';
import { closeModal, confirmBox, mHead, openModal } from './ui.js';
import { $, MONTHS, addMonths, esc, fmtDay, icon, lsSet, money, parseMoney, todayISO } from './utils.js';

/* ================= Actions ================= */
export const ACT = {
  closeModal,
  newTx(){ if (state.readOnly) return; txModal(); },
  editTx(d){ const t = findTx(d.id, d.y); if (t && !state.readOnly) txModal(t); },
  async delTx(){ const form = $('#modal-root form'); const t = form && form._tx; if (!t) return; closeModal(); if (!await confirmBox('Apagar lançamento?', `“${esc(t.desc || catById(t.cat).name)}” de ${money(t.amount)} será apagado.`)) return; await del(colRef(state.space, 'tx'+t._y).doc(t.id)).then(()=>toast('Lançamento apagado')).catch(()=>{}); },
  prevMonth(){ state.month = addMonths(state.month, -1); ensureYears(); changed(); },
  nextMonth(){ state.month = addMonths(state.month, 1); ensureYears(); changed(); },
  toggleTheme(){ setTheme(state.theme === 'dark' ? 'light' : 'dark'); },
  setTheme(d){ setTheme(d.v); },
  toggleHide(){ state.hide = !state.hide; lsSet('hide', state.hide); changed(); },
  setSpace(d){ setSpace(d.v); },
  toggleSpace(){ setSpace(state.space === 'personal' ? 'joint' : 'personal'); toast(state.space === 'joint' ? 'Conta conjunta' : 'Conta pessoal'); },
  moreNav(){ openModal(`${mHead('Menu')}<div class="modal-b" style="padding-bottom:20px"><div class="space-switch">${['personal','joint'].map(k=>`<button data-act="setSpace" data-v="${k}" aria-pressed="${state.space===k}">${icon(k==='personal'?'lock':'users')}${k==='personal'?'Pessoal':'Conjunta'}</button>`).join('')}</div><div class="sheet-nav">${[...NAV_MAIN, ...NAV_SEC].map(k=>`<a href="#${k}" data-act="closeModal">${icon(ROUTES[k].i)}${ROUTES[k].t}</a>`).join('')}</div></div>`); },
  txType(d){ state.txf.type = d.v; changed(); },
  clearTxf(){ state.txf = {q:'', type:'all', cat:'all', tag:'all'}; changed(); },
  newSub(){ subModal(); }, editSub(d){ const s = SP().subs.find(x=>x.id===d.id); if (s) subModal(s); },
  async delSub(d){ closeModal(); const s = SP().subs.find(x=>x.id===d.id); if (!s || !await confirmBox('Apagar assinatura?', `“${esc(s.name)}” será removida. Lançamentos já feitos continuam no histórico.`)) return; await del(colRef(state.space,'subs').doc(d.id)).then(()=>toast('Assinatura apagada')).catch(()=>{}); },
  async toggleSub(d){ const s = SP().subs.find(x=>x.id===d.id); if (!s) return; const {id, ...rest} = s; await put(colRef(state.space,'subs').doc(id), Object.assign(rest, {active: s.active === false})).then(()=>toast(s.active===false?'Assinatura reativada':'Assinatura pausada')).catch(()=>{}); },
  launchSub(d){ const s = SP().subs.find(x=>x.id===d.id); if (s) payModal('sub', s); },
  newFixed(){ fixedModal(); }, editFixed(d){ const f = SP().fixed.find(x=>x.id===d.id); if (f) fixedModal(f); },
  async delFixed(d){ closeModal(); const f = SP().fixed.find(x=>x.id===d.id); if (!f || !await confirmBox('Apagar despesa fixa?', `“${esc(f.name)}” deixará de aparecer nos próximos meses. Pagamentos já registrados continuam no histórico.`)) return; await del(colRef(state.space,'fixed').doc(d.id)).then(()=>toast('Despesa fixa apagada')).catch(()=>{}); },
  payFixed(d){ const f = SP().fixed.find(x=>x.id===d.id); if (f) payModal('fixed', f); },
  async unpayFixed(d){ const ts = linkedTx('fixed', d.id, state.month); for (const t of ts) await del(colRef(state.space,'tx'+t._y).doc(t.id)).catch(()=>{}); toast('Pagamento desfeito'); },
  apply8020(d){ saveSettings({budgetTotal: Math.round(+d.v)}).then(()=>toast('Orçamento definido')).catch(()=>{}); },
  newGoal(){ goalModal(); }, editGoal(d){ const g = SP().goals.find(x=>x.id===d.id); if (g) goalModal(g); },
  async delGoal(d){ closeModal(); const sp = SP(); const g = sp.goals.find(x=>x.id===d.id); if (!g || !await confirmBox('Apagar meta?', `A meta “${esc(g.name)}” e o histórico de movimentações dela serão apagados.`)) return; try { for (const mv of sp.moves.filter(m=>m.goalId===g.id)) await del(colRef(state.space,'moves').doc(mv.id)); await del(colRef(state.space,'goals').doc(g.id)); toast('Meta apagada'); } catch {} },
  moveGoal(d){ const g = SP().goals.find(x=>x.id===d.id); if (g) moveModal(g, d.v); },
  async delMove(d){ const mv = SP().moves.find(x=>x.id===d.id); if (!mv || !await confirmBox('Apagar movimentação?', `${mv.amount>0?'Depósito':'Retirada'} de ${money(Math.abs(mv.amount))} será apagado${mv.txId?', junto com o lançamento vinculado':''}.`)) return; try { if (mv.txId) await del(colRef(state.space,'tx'+mv.txYear).doc(mv.txId)); await del(colRef(state.space,'moves').doc(mv.id)); toast('Movimentação apagada'); } catch {} },
  repTable(){ state.repTable = !state.repTable; changed(); },
  editIncome(){ incomeModal(); incomeModalMount(); },
  incomeEntry(d){ const ym = d.ym; const it = incomeItems(ym)[0]; if (!it) return; openModal(`${mHead('Renda de ' + MONTHS[+ym.slice(5)-1])}<div class="modal-b"><div class="row"><div class="emoji">💼</div><div><div class="num" style="font-size:24px;font-weight:800">${money(it.amount)}</div><div class="small t2">${it.future ? 'Agendada para' : 'Entrou em'} ${fmtDay(it.date)} · ${payDayLabel()}</div></div></div><p class="small t2" style="margin:0">Essa entrada é criada automaticamente todo mês a partir da sua renda mensal. Se neste mês você recebeu um valor diferente, ajuste só este mês; para mudar daqui pra frente, altere a renda mensal.</p></div><div class="modal-f" data-write><button class="btn ghost" data-act="incomeAdjust" data-ym="${ym}">Ajustar só este mês</button><button class="btn" data-act="editIncome">${icon('edit')}Alterar renda mensal</button></div>`); },
  incomeAdjust(d){ const it = incomeItems(d.ym)[0]; closeModal(); txModal(null, {type:'in', amount: it ? it.amount : '', date: it ? it.date : `${d.ym}-05`, desc:'Renda mensal', cat:'salario'}); toast('Salve com o valor recebido: ele substitui a renda automática deste mês'); },
  async delIncome(d){ closeModal(); await saveSettings({incomes: incomes().filter(it => it.from !== d.v)}).then(()=>toast('Valor removido do histórico')).catch(()=>{}); },
  newCard(){ cardModal(); }, editCard(d){ const c = cardById(d.id); if (c) cardModal(c); },
  selCard(d){ state.cardSel = d.id; lsSet('cardSel', d.id); changed(); },
  goCard(d){ if (d.id){ state.cardSel = d.id; lsSet('cardSel', d.id); } location.hash = 'cartao'; },
  async delCard(d){ closeModal(); const sp = SP(); const c = cardById(d.id); if (!c) return; const buys = sp.cardbuys.filter(b => b.cardId === c.id); if (!await confirmBox('Apagar cartão?', `O cartão “${esc(c.name)}” e ${buys.length} compra(s) lançada(s) nele serão apagados.`)) return; try { for (const b of buys) await del(colRef(state.space,'cardbuys').doc(b.id)); for (const p of sp.cardpay.filter(p => p.cardId === c.id)) await del(colRef(state.space,'cardpay').doc(p.id)); await del(colRef(state.space,'cards').doc(c.id)); toast('Cartão apagado'); } catch {} },
  newBuy(){ buyModal(); },
  editBuy(d){ const b = SP().cardbuys.find(x => x.id === d.id); if (b && !state.readOnly) buyModal(b); },
  async delBuy(d){ closeModal(); const b = SP().cardbuys.find(x => x.id === d.id); if (!b || !await confirmBox('Apagar compra?', `“${esc(b.desc)}” (${b.n||1}x de ${money(b.inst)}) sairá de todas as faturas.`)) return; await del(colRef(state.space,'cardbuys').doc(b.id)).then(()=>toast('Compra apagada')).catch(()=>{}); },
  async payInvoice(d){ const c = cardById(d.id); if (!c) return; const ym = state.month; await put(colRef(state.space,'cardpay').doc(`${c.id}_${ym}`), {cardId: c.id, ym, paidAt: todayISO(), amount: invoiceTotal(c, ym)}).then(()=>toast('Fatura marcada como paga — limite liberado')).catch(()=>{}); },
  async unpayInvoice(d){ await del(colRef(state.space,'cardpay').doc(`${d.id}_${state.month}`)).then(()=>toast('Pagamento da fatura desfeito')).catch(()=>{}); },
  invUse(d){ state.inv.amount = +d.v; changed(); },
  invGoal(d){ const g = SP().goals.find(x=>x.id===d.id); if (!g) return; const s = goalSaved(g); state.inv.amount = Math.round(Math.max(s, 0)) || Number(g.target) || 1000; const m = monthsUntil(g.deadline); if (m > 0){ const opts = [3,6,12,18,24,36,60,120]; state.inv.months = opts.reduce((a,b)=> Math.abs(b-m) < Math.abs(a-m) ? b : a); } state.inv.liq = !!g.isReserve; changed(); },
  resetRates(){ state.rates = Object.assign({}, DEFAULT_RATES); lsSet('rates', {}); changed(); },
  newCat(){ catModal(); }, editCat(d){ const c = cats().find(x=>x.id===d.id); if (c) catModal(c); },
  async delCat(d){ closeModal(); const c = cats().find(x=>x.id===d.id); if (!c) return; if (cats().filter(x=>x.kind===c.kind).length <= 1) return toast('Mantenha pelo menos uma categoria.'); if (!await confirmBox('Remover categoria?', `Lançamentos antigos de “${esc(c.name)}” continuam salvos, mas aparecerão como “Categoria removida”.`, 'Remover')) return; await saveSettings({categories: cats().filter(x=>x.id!==c.id)}).then(()=>toast('Categoria removida')).catch(()=>{}); },
  async resetCats(){ if (!await confirmBox('Restaurar categorias padrão?', 'Categorias criadas por você serão removidas da lista.', 'Restaurar')) return; saveSettings({categories: null}).catch(()=>{}); },
  /* --- Conta (Firebase) --- */
  async signIn(){ try { await AUTH.signIn(); } catch (e) { console.warn(e); if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toast('Não foi possível entrar: ' + (e.code || e.message || 'erro')); } },
  async signOut(){ if (!AUTH) return; if (!await confirmBox('Sair da sua conta?', 'Você poderá entrar de novo a qualquer momento com sua conta Google. Os dados continuam salvos.', 'Sair')) return; await AUTH.signOut(); location.hash = ''; location.reload(); },
  /* --- Conta conjunta --- */
  async createHousehold(){ try { await createHousehold(); setSpace('joint'); location.hash = 'conjunta'; toast('Conta conjunta criada! Envie o código para quem você quiser convidar.'); } catch (e) { console.warn(e); } },
  async joinHousehold(){ const code = ($('#joinCode') || {}).value; try { await joinHousehold(code); setSpace('joint'); location.hash = 'conjunta'; toast('Você entrou na conta conjunta 🎉'); } catch (e) { toast(e && (e.code === 'bad_code' || e.code === 'not_found' || e.code === 'permission_denied') ? 'Código inválido. Confira e tente de novo.' : 'Não foi possível entrar. Verifique sua conexão.'); } },
  async leaveHousehold(){ if (!await confirmBox('Sair da conta conjunta?', 'Você deixará de ver os dados da conta conjunta. Eles continuam disponíveis para os outros membros. Para voltar, será preciso o código de novo.', 'Sair')) return; state.space = 'personal'; lsSet('space', 'personal'); try { await leaveHousehold(); toast('Você saiu da conta conjunta'); } catch (e) { console.warn(e); } changed(); },
  copyInvite(){ copyText(householdId(), 'Código copiado'); },
  /* --- Backup --- */
  downloadJson(){ const name = `financas-${state.space === 'joint' ? 'conjunta' : 'pessoal'}-${todayISO()}.json`; downloadText(name, JSON.stringify(exportBackup(), null, 2), 'application/json'); },
  downloadCsv(){ const rows = [['data','tipo','valor','descricao','categoria','tags']].concat(monthItems(state.month).sort((a,b)=>a.date.localeCompare(b.date)).map(t => [t.date, t.type==='in'?'entrada':'saida', String(t.amount).replace('.',','), t.desc||'', catById(t.cat).name, (t.tags||[]).join(' ')])); const csv = '﻿' + rows.map(r => r.map(v => /[;"\n]/.test(v) ? '"' + String(v).replace(/"/g,'""') + '"' : v).join(';')).join('\n'); downloadText(`lancamentos-${state.month}.csv`, csv, 'text/csv'); },
  importOpen(){ importModal(); },
  async wipeLocal(){ if (!await confirmBox('Apagar todos os dados deste navegador?', 'Isso remove lançamentos, cartões, metas e ajustes salvos no modo local. Não dá para desfazer — baixe um backup antes, se quiser.', 'Apagar tudo')) return; DB.wipe && DB.wipe(); location.reload(); },
};
/** Faz o navegador baixar um arquivo de texto gerado na hora. */
export function downloadText(filename, text, type){
  const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Arquivo baixado: ' + filename);
}
export async function copyText(t, msg){ try { await navigator.clipboard.writeText(t); toast(msg); } catch { openModal(`${mHead('Copie o conteúdo')}<div class="modal-b" style="padding-bottom:20px"><textarea class="input" style="width:100%;height:260px;font-family:monospace;font-size:12px" readonly>${esc(t)}</textarea></div>`); const ta = $('#modal-root textarea'); ta.focus(); ta.select(); } }
export function setTheme(t){ state.theme = t; lsSet('theme', t); document.documentElement.dataset.theme = t; changed(); }
export function setSpace(k){ if (state.space === k) return; state.space = k; lsSet('space', k); startSpace(k); ensureYears(k); state.txf = {q:'', type:'all', cat:'all', tag:'all'}; closeModal(); changed(); }
export function setReadOnly(v){ state.readOnly = v; changed(); }

document.addEventListener('click', e => {
  if (e.target.matches('[data-overlay]')) return closeModal();
  const a = e.target.closest('[data-act]'); if (!a) return;
  const fn = ACT[a.dataset.act]; if (!fn) return;
  if (a.tagName !== 'A') e.preventDefault();
  fn(a.dataset, a, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#modal-root').classList.contains('open')) return closeModal();
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  if (!typing && !$('#modal-root').classList.contains('open') && (e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey){ e.preventDefault(); ACT.newTx(); }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.item.click[data-act]')){ e.preventDefault(); e.target.click(); }
});
document.addEventListener('submit', e => {
  e.preventDefault(); const f = e.target; const fn = {imp:submitImport, tx:submitTx, sub:submitSub, fixed:submitFixed, pay:submitPay, goal:submitGoal, move:submitMove, cat:submitCat, income:submitIncome, card:submitCard, buy:submitBuy}[f.dataset.form];
  fn && fn(f);
});
export let inputTimer = null;
document.addEventListener('input', e => {
  const el = e.target, on = el.dataset.on; if (!on) return;
  if (on === 'txf'){ state.txf[el.dataset.k] = el.value; clearTimeout(inputTimer); inputTimer = setTimeout(changed, el.tagName === 'SELECT' ? 0 : 120); }
  if (on === 'invAmount'){ const v = parseMoney(el.value); if (v >= 0) state.inv.amount = v; }
  if (on === 'rate'){ const v = parseFloat(String(el.value).replace(',', '.')); if (isFinite(v)){ state.rates[el.dataset.k] = v; const saved = {}; Object.keys(DEFAULT_RATES).forEach(k => { if (k!=='ref' && state.rates[k] !== DEFAULT_RATES[k]) saved[k] = state.rates[k]; }); lsSet('rates', saved); } }
});
document.addEventListener('change', e => {
  const el = e.target, on = el.dataset.on; if (!on) return;
  if (on === 'txf'){ state.txf[el.dataset.k] = el.value; changed(); }
  if (on === 'invMonths'){ state.inv.months = +el.value; changed(); }
  if (on === 'invLiq'){ state.inv.liq = el.checked; changed(); }
  if (on === 'invAmount' || on === 'rate'){ changed(); }
  if (on === 'budgetTotal'){ const v = parseMoney(el.value); const cur = Number(settings().budgetTotal)||0; const nv = v > 0 ? v : 0; if (nv !== cur) saveSettings({budgetTotal: nv}).then(()=>toast('Limite salvo')).catch(()=>{}); }
  if (on === 'budgetCat'){ const v = parseMoney(el.value); const bc = Object.assign({}, settings().budgetCats||{}); const cur = Number(bc[el.dataset.id])||0; const nv = v > 0 ? v : 0; if (nv === cur) return; if (nv) bc[el.dataset.id] = nv; else delete bc[el.dataset.id]; saveSettings({budgetCats: bc}).then(()=>toast('Limite da categoria salvo')).catch(()=>{}); }
  if (on === 'jointName'){ const v = el.value.trim().slice(0,40); if (v !== (settings().name||'')) saveSettings({name: v}).then(()=>toast('Nome salvo')).catch(()=>{}); }
});

export function route(){ const h = (location.hash||'').replace('#',''); state.route = ROUTES[h] ? h : 'inicio'; hideTip(); changed(); window.scrollTo(0,0); }
window.addEventListener('hashchange', route);
export let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(changed, 150); });

