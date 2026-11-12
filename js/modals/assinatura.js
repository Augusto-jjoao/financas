import { toast } from '../bus.js';
import { CYCLES, SUB_EMOJIS } from '../constants.js';
import { colRef, put } from '../data/store.js';
import { state } from '../state.js';
import { catOptions, closeModal, defaultDate, mHead, openModal } from '../ui.js';
import { $, $$, esc, icon, moneyInputVal, parseMoney, todayISO } from '../utils.js';

/* --- Subscription modal --- */
export function subModal(s){
  const isEdit = !!s; s = s || {name:'', amount:'', cycle:'mensal', nextDate: defaultDate(), cat:'assinaturas', emoji:'📺', active:true};
  const m = openModal(`<form data-form="sub">${mHead(isEdit?'Editar assinatura':'Nova assinatura')}<div class="modal-b">
    <div class="field"><span class="flabel">Ícone</span><div class="emoji-pick" id="ep">${SUB_EMOJIS.map(e=>`<button type="button" data-e="${e}" aria-pressed="${s.emoji===e}">${e}</button>`).join('')}</div><input type="hidden" name="emoji" value="${esc(s.emoji)}"></div>
    <div class="field"><label for="s-name">Nome</label><input class="input" id="s-name" name="name" placeholder="Ex.: Netflix, Spotify, iCloud…" value="${esc(s.name)}" required maxlength="40" autofocus></div>
    <div class="fields-2"><div class="field"><label for="s-amount">Valor (R$)</label><input class="input num" id="s-amount" name="amount" inputmode="decimal" placeholder="0,00" value="${moneyInputVal(s.amount)}" required></div>
    <div class="field"><label for="s-cycle">Cobrança</label><select class="select" id="s-cycle" name="cycle">${Object.entries(CYCLES).map(([k,v])=>`<option value="${k}" ${s.cycle===k?'selected':''}>${v.label}</option>`).join('')}</select></div></div>
    <div class="fields-2"><div class="field"><label for="s-next">Próxima cobrança</label><input class="input" type="date" id="s-next" name="nextDate" value="${esc(s.nextDate)}" required></div>
    <div class="field"><label for="s-cat">Categoria</label><select class="select" id="s-cat" name="cat">${catOptions('out', s.cat)}</select></div></div>
  </div><div class="modal-f">${isEdit?`<button type="button" class="btn danger" data-act="delSub" data-id="${esc(s.id)}" style="margin-right:auto">${icon('trash')}Apagar</button>`:''}<button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Salvar</button></div></form>`);
  m.querySelector('form')._obj = s; emojiPicker(m);
}
export function emojiPicker(m){ const ep = m.querySelector('#ep'); if (!ep) return; ep.addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (!b) return; m.querySelector('[name=emoji]').value = b.dataset.e; $$('button', ep).forEach(x => x.setAttribute('aria-pressed', x === b)); }); }
export async function submitSub(form){
  const s = form._obj; const amount = parseMoney(form.amount.value);
  if (!(amount > 0)) return toast('Informe um valor válido.');
  const data = {name: form.name.value.trim(), amount, cycle: form.cycle.value, nextDate: form.nextDate.value, cat: form.cat.value, emoji: form.emoji.value, active: s.active !== false, createdAt: s.createdAt || todayISO()};
  if (s.createdAt && data.nextDate.slice(0,7) < String(s.createdAt).slice(0,7)) data.createdAt = data.nextDate;
  if (!s.id && data.nextDate < data.createdAt) data.createdAt = data.nextDate;
  closeModal();
  await put(s.id ? colRef(state.space,'subs').doc(s.id) : colRef(state.space,'subs').doc(), data).then(()=>toast('Assinatura salva')).catch(()=>{});
}

