import { toast } from '../bus.js';
import { colRef, put } from '../data/store.js';
import { saveTx } from './lancamento.js';
import { catById, chargesInMonth } from '../selectors.js';
import { state } from '../state.js';
import { catOptions, closeModal, defaultDate, mHead, openModal } from '../ui.js';
import { $, clamp, dim, esc, icon, money, moneyInputVal, pad, parseMoney, todayISO, ymLabel, ymNow } from '../utils.js';

/* --- Fixed modal --- */
export function fixedModal(f){
  const isEdit = !!f; f = f || {name:'', amount:'', dueDay: 10, cat:'moradia', variable:false, active:true};
  const m = openModal(`<form data-form="fixed">${mHead(isEdit?'Editar despesa fixa':'Nova despesa fixa')}<div class="modal-b">
    <div class="field"><label for="x-name">Nome</label><input class="input" id="x-name" name="name" placeholder="Ex.: Aluguel, Internet, Luz…" value="${esc(f.name)}" required maxlength="40" autofocus list="fixedSugg"><datalist id="fixedSugg">${['Aluguel','Condomínio','Internet','Luz','Água','Gás','Celular','IPTU','Plano de saúde','Academia','Escola','Financiamento'].map(x=>`<option value="${x}">`).join('')}</datalist></div>
    <div class="fields-2"><div class="field"><label for="x-amount">Valor mensal (R$)</label><input class="input num" id="x-amount" name="amount" inputmode="numeric" data-money placeholder="0,00" value="${moneyInputVal(f.amount)}" required></div>
    <div class="field"><label for="x-due">Dia do vencimento</label><input class="input" type="number" min="1" max="31" id="x-due" name="dueDay" value="${esc(f.dueDay||'')}"></div></div>
    <div class="field"><label for="x-cat">Categoria</label><select class="select" id="x-cat" name="cat">${catOptions('out', f.cat)}</select></div>
    <label class="check"><input type="checkbox" name="variable" ${f.variable?'checked':''}> O valor varia todo mês (ex.: luz, água) — vou confirmar o valor ao pagar</label>
    ${isEdit ? `<label class="check"><input type="checkbox" name="active" ${f.active!==false?'checked':''}> Ativa</label>` : ''}
  </div><div class="modal-f">${isEdit?`<button type="button" class="btn danger" data-act="delFixed" data-id="${esc(f.id)}" style="margin-right:auto">${icon('trash')}Apagar</button>`:''}<button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Salvar</button></div></form>`);
  m.querySelector('form')._obj = f;
}
export async function submitFixed(form){
  const f = form._obj; const amount = parseMoney(form.amount.value);
  if (!(amount > 0)) return toast('Informe um valor válido.');
  const data = {name: form.name.value.trim(), amount, dueDay: clamp(parseInt(form.dueDay.value)||1, 1, 31), cat: form.cat.value, variable: form.variable.checked, active: form.active ? form.active.checked : true, createdAt: f.createdAt || (state.month < ymNow() ? state.month + '-01' : todayISO())};
  closeModal();
  await put(f.id ? colRef(state.space,'fixed').doc(f.id) : colRef(state.space,'fixed').doc(), data).then(()=>toast('Despesa fixa salva')).catch(()=>{});
}
export function payModal(kind, obj){
  const ym = state.month;
  const due = kind === 'fixed' ? `${ym}-${pad(Math.min(obj.dueDay||1, dim(+ym.slice(0,4), +ym.slice(5))))}` : (chargesInMonth(obj, ym)[0] || defaultDate());
  const date = ym === ymNow() ? todayISO() : due;
  const m = openModal(`<form data-form="pay">${mHead(kind==='fixed'?'Registrar pagamento':'Lançar cobrança')}<div class="modal-b">
    <div class="row"><div class="emoji">${esc(kind==='fixed'?catById(obj.cat).emoji:(obj.emoji||'📺'))}</div><div><div style="font-weight:800">${esc(obj.name)}</div><div class="small muted">${ymLabel(ym)}</div></div></div>
    <div class="fields-2"><div class="field"><label for="p-amount">Valor pago (R$)</label><input class="input num amount-input" id="p-amount" name="amount" inputmode="numeric" data-money value="${moneyInputVal(obj.amount)}" required autofocus></div>
    <div class="field"><label for="p-date">Data</label><input class="input" type="date" id="p-date" name="date" value="${date}" required style="padding:16px 12px"></div></div>
  </div><div class="modal-f"><button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Confirmar</button></div></form>`);
  const form = m.querySelector('form'); form._kind = kind; form._obj = obj; form._ym = ym;
}
export async function submitPay(form){
  const o = form._obj, amount = parseMoney(form.amount.value);
  if (!(amount > 0)) return toast('Informe um valor válido.');
  const data = {type:'out', amount, date: form.date.value, desc: o.name, cat: o.cat, tags: [], by: state.uid, createdAt: new Date().toISOString(), src: form._kind, srcId: o.id, srcMonth: form._ym};
  closeModal();
  await saveTx(null, data).then(()=>toast(form._kind==='fixed' ? 'Pagamento registrado' : 'Cobrança lançada')).catch(()=>{});
}

