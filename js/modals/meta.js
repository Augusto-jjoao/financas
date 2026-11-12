import { toast } from '../bus.js';
import { GOAL_EMOJIS } from '../constants.js';
import { colRef, put } from '../data/store.js';
import { emojiPicker } from './assinatura.js';
import { saveTx } from './lancamento.js';
import { goalSaved } from '../selectors.js';
import { state } from '../state.js';
import { closeModal, defaultDate, mHead, openModal } from '../ui.js';
import { $, esc, icon, money, moneyInputVal, parseMoney, todayISO } from '../utils.js';

/* --- Goals --- */
export function goalModal(g){
  const isEdit = !!g; g = g || {name:'', emoji:'✈️', target:'', deadline:'', isReserve:false};
  const m = openModal(`<form data-form="goal">${mHead(isEdit?'Editar meta':'Nova meta')}<div class="modal-b">
    <div class="field"><span class="flabel">Ícone</span><div class="emoji-pick" id="ep">${GOAL_EMOJIS.map(e=>`<button type="button" data-e="${e}" aria-pressed="${g.emoji===e}">${e}</button>`).join('')}</div><input type="hidden" name="emoji" value="${esc(g.emoji)}"></div>
    <div class="field"><label for="g-name">Nome da meta</label><input class="input" id="g-name" name="name" placeholder="Ex.: Viagem para o Chile, Computador novo…" value="${esc(g.name)}" required maxlength="40" autofocus></div>
    <div class="fields-2"><div class="field"><label for="g-target">Quanto precisa (R$)</label><input class="input num" id="g-target" name="target" inputmode="numeric" data-money placeholder="0,00" value="${moneyInputVal(g.target)}"></div>
    <div class="field"><label for="g-deadline">Até quando? (opcional)</label><input class="input" type="month" id="g-deadline" name="deadline" value="${esc(g.deadline||'')}"></div></div>
    ${isEdit ? '' : `<div class="field"><label for="g-init">Já tem algum valor guardado? (opcional)</label><input class="input num" id="g-init" name="init" inputmode="numeric" data-money placeholder="0,00"></div>`}
    <label class="check"><input type="checkbox" name="isReserve" ${g.isReserve?'checked':''}> Esta meta é minha reserva de emergência</label>
  </div><div class="modal-f">${isEdit?`<button type="button" class="btn danger" data-act="delGoal" data-id="${esc(g.id)}" style="margin-right:auto">${icon('trash')}Apagar</button>`:''}<button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Salvar</button></div></form>`);
  m.querySelector('form')._obj = g; emojiPicker(m);
}
export async function submitGoal(form){
  const g = form._obj; const target = parseMoney(form.target.value);
  const data = {name: form.name.value.trim(), emoji: form.emoji.value, target: target > 0 ? target : 0, deadline: form.deadline.value || '', isReserve: form.isReserve.checked, createdAt: g.createdAt || new Date().toISOString(), order: g.order || Date.now()};
  const init = form.init ? parseMoney(form.init.value) : NaN;
  closeModal();
  try {
    const ref = g.id ? colRef(state.space,'goals').doc(g.id) : colRef(state.space,'goals').doc();
    await put(ref, data);
    if (init > 0) await put(colRef(state.space,'moves').doc(), {goalId: ref.id, amount: init, date: todayISO(), note:'Saldo inicial', by: state.uid, createdAt: new Date().toISOString()});
    toast('Meta salva');
  } catch {}
}
export function moveModal(g, dir){
  const saved = goalSaved(g);
  const m = openModal(`<form data-form="move">${mHead(dir==='in'?'Guardar dinheiro':'Retirar dinheiro')}<div class="modal-b">
    <div class="row"><div class="emoji">${esc(g.emoji||'🎯')}</div><div><div style="font-weight:800">${esc(g.name)}</div><div class="small muted">Guardado: ${money(saved)}</div></div></div>
    <div class="fields-2"><div class="field"><label for="mv-amount">Valor (R$)</label><input class="input num amount-input" id="mv-amount" name="amount" inputmode="numeric" data-money placeholder="0,00" required autofocus></div>
    <div class="field"><label for="mv-date">Data</label><input class="input" type="date" id="mv-date" name="date" value="${defaultDate()}" style="padding:16px 12px"></div></div>
    <div class="field"><label for="mv-note">Observação (opcional)</label><input class="input" id="mv-note" name="note" maxlength="60" placeholder="${dir==='in'?'Ex.: sobra do mês':'Ex.: paguei a passagem'}"></div>
    <label class="check"><input type="checkbox" name="asTx"> ${dir==='in' ? 'Registrar também como saída do mês (categoria “Guardado / Investido”), descontando do saldo' : 'Registrar também como entrada do mês, somando ao saldo'}</label>
  </div><div class="modal-f"><button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Confirmar</button></div></form>`);
  const form = m.querySelector('form'); form._goal = g; form._dir = dir; form._saved = saved;
}
export async function submitMove(form){
  const g = form._goal, dir = form._dir; let amount = parseMoney(form.amount.value);
  if (!(amount > 0)) return toast('Informe um valor válido.');
  if (dir === 'out' && amount > form._saved + 0.001) return toast('Valor maior que o guardado nesta meta.');
  const date = form.date.value || todayISO();
  const move = {goalId: g.id, amount: dir === 'in' ? amount : -amount, date, note: form.note.value.trim(), by: state.uid, createdAt: new Date().toISOString()};
  const asTx = form.asTx.checked;
  closeModal();
  try {
    if (asTx){
      const ref = await saveTx(null, {type: dir==='in'?'out':'in', amount, date, desc: (dir==='in'?'Guardado em: ':'Retirado de: ') + g.name, cat: dir==='in'?'investimentos':'outros_in', tags: [], by: state.uid, createdAt: new Date().toISOString(), src:'goal', srcId: g.id, srcMonth: date.slice(0,7)});
      move.txId = ref.id; move.txYear = date.slice(0,4);
    }
    await put(colRef(state.space,'moves').doc(), move);
    toast(dir === 'in' ? `+ ${money(amount)} em ${g.name}` : `− ${money(amount)} de ${g.name}`);
  } catch {}
}

