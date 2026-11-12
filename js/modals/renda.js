import { toast } from '../bus.js';
import { saveSettings } from '../data/store.js';
import { incomeFor, incomes, payDate, settings } from '../selectors.js';
import { state } from '../state.js';
import { closeModal, mHead, openModal } from '../ui.js';
import { $, addMonths, esc, fmtDay, icon, money, moneyInputVal, parseMoney, todayISO, ymLabel, ymNow } from '../utils.js';

/* --- Income --- */
export function incomeModal(){
  const list = incomes(), cur = incomeFor(ymNow());
  const m = openModal(`<form data-form="income">${mHead('Renda mensal')}<div class="modal-b">
    <p class="t2 small" style="margin:0">Quanto ${state.space==='joint'?'vocês colocam por mês na conta conjunta':'você recebe por mês (líquido)'}? Esse valor é a base do “disponível para gastar”. Se a renda mudar, cadastre o novo valor a partir do mês em que mudou — os meses anteriores continuam com o valor antigo.</p>
    <div class="fields-2"><div class="field"><label for="i-amount">Valor mensal (R$)</label><input class="input num amount-input" id="i-amount" name="amount" inputmode="numeric" data-money placeholder="0,00" value="${moneyInputVal(cur||'')}" required autofocus></div>
    <div class="field"><label for="i-from">A partir de</label><input class="input" type="month" id="i-from" name="from" value="${state.month < ymNow() ? state.month : ymNow()}" required style="padding:16px 12px"></div></div>
    <div class="field"><label for="i-day">Quando a renda cai na conta</label><select class="select" id="i-day" name="payDay"><option value="5du" ${(settings().payDay||'5du')==='5du'?'selected':''}>No 5º dia útil do mês</option>${Array.from({length:31},(_,i)=>`<option value="${i+1}" ${String(settings().payDay)===String(i+1)?'selected':''}>Todo dia ${i+1}</option>`).join('')}</select></div>
    <label class="check" id="i-satRow"><input type="checkbox" name="paySatFri" ${settings().paySatFri!==false?'checked':''}> Se o 5º dia útil cair num sábado, considerar a sexta-feira anterior</label>
    <p class="xs muted" style="margin:-6px 0 0">Na contagem da CLT o sábado conta como dia útil, mas domingos e feriados nacionais não. Muitas empresas antecipam para sexta quando cai no sábado. Próximo crédito: <b id="i-next"></b>.</p>
    ${list.length ? `<div><div class="flabel" style="margin-bottom:4px">Histórico</div><div class="list">${[...list].reverse().map(it => `<div class="item"><div class="main"><div class="title num">${money(it.amount)}</div><div class="meta">a partir de ${ymLabel(it.from).toLowerCase()}</div></div><button type="button" class="icon-btn" data-act="delIncome" data-v="${esc(it.from)}" aria-label="Apagar">${icon('trash')}</button></div>`).join('')}</div></div>` : ''}
  </div><div class="modal-f"><button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Salvar</button></div></form>`);
}
export function incomeModalMount(){
  const m = $('#modal-root .modal'); if (!m) return; const f = m.querySelector('form');
  const upd = () => { const sd = f.payDay.value === '5du'; m.querySelector('#i-satRow').style.display = sd ? '' : 'none'; const fake = {payDay: f.payDay.value, paySatFri: f.paySatFri.checked}; const sp = {settings: Object.assign({}, settings(), fake)}; let ym = ymNow(); let d = payDate(ym, sp); if (d < todayISO()){ ym = addMonths(ym, 1); d = payDate(ym, sp); } m.querySelector('#i-next').textContent = fmtDay(d) + ' de ' + d.slice(0,4); };
  f.payDay.addEventListener('change', upd); f.paySatFri.addEventListener('change', upd); upd();
}
export async function submitIncome(form){
  const amount = parseMoney(form.amount.value); const from = form.from.value;
  if (!(amount >= 0) || !from) return toast('Informe o valor e o mês.');
  const list = incomes().filter(it => it.from !== from); list.push({from, amount});
  closeModal(); await saveSettings({incomes: list, payDay: form.payDay.value, paySatFri: form.paySatFri.checked}).then(() => toast('Renda mensal salva')).catch(()=>{});
}

