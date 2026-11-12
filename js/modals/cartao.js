import { toast } from '../bus.js';
import { CARD_COLORS } from '../constants.js';
import { colRef, put } from '../data/store.js';
import { cardById, firstDueFor } from '../selectors.js';
import { SP, state } from '../state.js';
import { catOptions, closeModal, defaultDate, mHead, openModal } from '../ui.js';
import { $, $$, addMonths, clamp, esc, icon, lsSet, money, moneyInputVal, parseMoney, sum, todayISO, ymLabel } from '../utils.js';

/* --- Cards --- */
export function cardModal(c){
  const isEdit = !!c; c = c || {name:'', limit:'', closingDay: 3, dueDay: 10, color:'roxo'};
  const m = openModal(`<form data-form="card">${mHead(isEdit?'Editar cartão':'Novo cartão')}<div class="modal-b">
    <div class="field"><label for="k-name">Nome do cartão</label><input class="input" id="k-name" name="name" placeholder="Ex.: Nubank, Itaú Visa…" value="${esc(c.name)}" required maxlength="30" autofocus></div>
    <div class="field"><label for="k-limit">Limite total (R$)</label><input class="input num" id="k-limit" name="limit" inputmode="numeric" data-money placeholder="0,00" value="${moneyInputVal(c.limit)}"></div>
    <div class="fields-2"><div class="field"><label for="k-close">Dia do fechamento</label><input class="input" type="number" min="1" max="31" id="k-close" name="closingDay" value="${esc(c.closingDay)}" required></div>
    <div class="field"><label for="k-due">Dia do vencimento</label><input class="input" type="number" min="1" max="31" id="k-due" name="dueDay" value="${esc(c.dueDay)}" required></div></div>
    <div class="field"><span class="flabel">Cor</span><div class="emoji-pick" id="ccColors">${Object.entries(CARD_COLORS).map(([k,g]) => `<button type="button" data-c="${k}" aria-pressed="${c.color===k}" aria-label="${k}" style="background:${g}"></button>`).join('')}</div><input type="hidden" name="color" value="${esc(c.color||'roxo')}"></div>
    <p class="xs muted" style="margin:0">Compras feitas a partir do dia do fechamento entram na fatura seguinte.</p>
  </div><div class="modal-f">${isEdit?`<button type="button" class="btn danger" data-act="delCard" data-id="${esc(c.id)}" style="margin-right:auto">${icon('trash')}Apagar</button>`:''}<button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Salvar</button></div></form>`);
  m.querySelector('form')._obj = c;
  m.querySelector('#ccColors').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; m.querySelector('[name=color]').value = b.dataset.c; $$('#ccColors button', m).forEach(x => x.setAttribute('aria-pressed', x === b)); });
}
export async function submitCard(form){
  const c = form._obj; const limit = parseMoney(form.limit.value);
  const data = {name: form.name.value.trim(), limit: limit > 0 ? limit : 0, closingDay: clamp(parseInt(form.closingDay.value)||1,1,31), dueDay: clamp(parseInt(form.dueDay.value)||10,1,31), color: form.color.value, createdAt: c.createdAt || todayISO()};
  closeModal();
  const ref = c.id ? colRef(state.space,'cards').doc(c.id) : colRef(state.space,'cards').doc();
  await put(ref, data).then(() => { state.cardSel = ref.id; lsSet('cardSel', ref.id); toast('Cartão salvo'); }).catch(()=>{});
}
export function buyModal(b){
  const sp = SP(); const isEdit = !!b;
  if (!sp.cards.length){ toast('Cadastre um cartão primeiro.'); return cardModal(); }
  const card0 = cardById(b ? b.cardId : state.cardSel) || sp.cards[0];
  b = b || {cardId: card0.id, desc:'', total:'', n:1, inst:'', date: defaultDate(), cat:'compras', tags:[]};
  const first = b.firstDue || firstDueFor(card0, b.date);
  const m = openModal(`<form data-form="buy">${mHead(isEdit?'Editar compra no cartão':'Nova compra no cartão')}<div class="modal-b">
    <div class="field"><label for="b-card">Cartão</label><select class="select" id="b-card" name="cardId">${sp.cards.map(c => `<option value="${esc(c.id)}" ${c.id===b.cardId?'selected':''}>💳 ${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="b-desc">Descrição</label><input class="input" id="b-desc" name="desc" placeholder="Ex.: Geladeira, Passagem aérea…" value="${esc(b.desc)}" required maxlength="60" autofocus></div>
    <div class="fields-2"><div class="field"><label for="b-total">Valor total (R$)</label><input class="input num" id="b-total" name="total" inputmode="numeric" data-money placeholder="0,00" value="${moneyInputVal(b.total)}"></div>
    <div class="field"><label for="b-n">Parcelas</label><input class="input" type="number" min="1" max="72" id="b-n" name="n" value="${esc(b.n||1)}"></div></div>
    <div class="fields-2"><div class="field"><label for="b-inst">Valor da parcela (R$)</label><input class="input num" id="b-inst" name="inst" inputmode="numeric" data-money placeholder="0,00" value="${moneyInputVal(b.inst)}"></div>
    <div class="field"><label for="b-date">Data da compra</label><input class="input" type="date" id="b-date" name="date" value="${esc(b.date)}" required></div></div>
    <div class="fields-2"><div class="field"><label for="b-cat">Categoria</label><select class="select" id="b-cat" name="cat">${catOptions('out', b.cat)}</select></div>
    <div class="field"><label for="b-first">1ª parcela na fatura de</label><input class="input" type="month" id="b-first" name="firstDue" value="${esc(first)}" required></div></div>
    <div class="field"><label for="b-tags">Tags (separe por vírgula)</label><input class="input" id="b-tags" name="tags" placeholder="ex.: casa, presente" value="${esc((b.tags||[]).join(', '))}"></div>
    <div class="banner info" style="margin:0" id="b-sum"></div>
    <p class="xs muted" style="margin:0">Compra antiga que ainda está sendo paga? Coloque a data original: as faturas anteriores ao cadastro do cartão são consideradas pagas.</p>
  </div><div class="modal-f">${isEdit?`<button type="button" class="btn danger" data-act="delBuy" data-id="${esc(b.id)}" style="margin-right:auto">${icon('trash')}Apagar</button>`:''}<button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Salvar</button></div></form>`);
  const f = m.querySelector('form'); f._obj = b; let firstTouched = !!b.firstDue, instTouched = isEdit && Math.abs((Number(b.inst)||0)*(b.n||1) - (Number(b.total)||0)) > 0.05;
  const upd = (src) => {
    const n = clamp(parseInt(f.n.value)||1, 1, 72); const total = parseMoney(f.total.value), inst = parseMoney(f.inst.value);
    if (src === 'inst') instTouched = true;
    if (src === 'total' || src === 'n'){ if (!instTouched || src === 'total'){ instTouched = false; if (total > 0) f.inst.value = moneyInputVal(Math.round(total/n*100)/100); } else if (inst > 0) f.total.value = moneyInputVal(Math.round(inst*n*100)/100); }
    if (src === 'inst' && inst > 0) f.total.value = moneyInputVal(Math.round(inst*n*100)/100);
    if (src === 'first') firstTouched = true;
    if ((src === 'card' || src === 'date') && !firstTouched) f.firstDue.value = firstDueFor(cardById(f.cardId.value), f.date.value);
    const iv = parseMoney(f.inst.value), fd = f.firstDue.value;
    $('#b-sum', m).innerHTML = iv > 0 && fd ? `${icon('card')}<div><b>${n}x de ${money(iv)}</b>${n>1?` · total ${money(parseMoney(f.total.value)||iv*n)}`:''}<br><span class="small">${n>1?`Faturas de ${ymLabel(fd).toLowerCase()} a ${ymLabel(addMonths(fd,n-1)).toLowerCase()}`:`Entra na fatura de ${ymLabel(fd).toLowerCase()}`}</span></div>` : `${icon('info')}<div class="small">Informe o valor total ou o valor da parcela.</div>`;
  };
  f.total.addEventListener('input', () => upd('total')); f.n.addEventListener('input', () => upd('n')); f.inst.addEventListener('input', () => upd('inst'));
  f.cardId.addEventListener('change', () => upd('card')); f.date.addEventListener('change', () => upd('date')); f.firstDue.addEventListener('change', () => upd('first'));
  upd();
}
export async function submitBuy(form){
  const b = form._obj; const n = clamp(parseInt(form.n.value)||1, 1, 72);
  let total = parseMoney(form.total.value), inst = parseMoney(form.inst.value);
  if (!(inst > 0) && total > 0) inst = Math.round(total/n*100)/100;
  if (!(total > 0) && inst > 0) total = Math.round(inst*n*100)/100;
  if (!(inst > 0)) return toast('Informe o valor da compra.');
  if (!form.firstDue.value) return toast('Informe a fatura da 1ª parcela.');
  const tags = form.tags.value.split(',').map(x => x.trim().replace(/^#/,'').replace(/\s+/g,'-').toLowerCase()).filter(Boolean).slice(0,10);
  const data = {cardId: form.cardId.value, desc: form.desc.value.trim(), total, n, inst, date: form.date.value, cat: form.cat.value, tags, firstDue: form.firstDue.value, by: b.by || state.uid, createdAt: b.createdAt || new Date().toISOString()};
  closeModal();
  await put(b.id ? colRef(state.space,'cardbuys').doc(b.id) : colRef(state.space,'cardbuys').doc(), data).then(() => toast(n > 1 ? `${n}x de ${money(inst)} lançado no cartão` : 'Compra lançada no cartão')).catch(()=>{});
}

