import { toast } from '../bus.js';
import { colRef, del, ensureYear, put } from '../data/store.js';
import { allTags, cardById, catById, firstDueFor } from '../selectors.js';
import { SP, state } from '../state.js';
import { catOptions, closeModal, defaultDate, mHead, openModal } from '../ui.js';
import { $, $$, esc, icon, money, moneyInputVal, parseMoney, ymLabel, ymShort } from '../utils.js';

/* --- Transaction modal --- */
export function txModal(t, prefill){
  const isEdit = !!t; t = t || Object.assign({type:'out', amount:'', date: defaultDate(), desc:'', cat:'', tags:[]}, prefill || {});
  const tags = [...(t.tags||[])];
  const sugg = allTags().slice(0, 12);
  const m = openModal(`<form data-form="tx">${mHead(isEdit?'Editar lançamento':'Novo lançamento')}
    <div class="modal-b">
      <div class="typeseg" role="group" aria-label="Tipo"><button type="button" data-v="out" aria-pressed="${t.type==='out'}">${icon('down')}Saída</button><button type="button" data-v="in" aria-pressed="${t.type==='in'}">${icon('up')}Entrada</button></div>
      <input type="hidden" name="type" value="${esc(t.type)}">
      <div class="field"><label for="f-amount">Valor (R$)</label><input class="input num amount-input" id="f-amount" name="amount" inputmode="decimal" placeholder="0,00" value="${moneyInputVal(t.amount)}" required autofocus autocomplete="off"></div>
      <div class="fields-2"><div class="field"><label for="f-date">Data</label><input class="input" type="date" id="f-date" name="date" value="${esc(t.date)}" required></div>
      <div class="field"><label for="f-cat">Categoria</label><select class="select" id="f-cat" name="cat">${catOptions(t.type, t.cat)}</select></div></div>
      <div class="field"><label for="f-desc">Descrição</label><input class="input" id="f-desc" name="desc" placeholder="Ex.: Mercado do mês, Salário…" value="${esc(t.desc)}" maxlength="80" autocomplete="off"></div>
      ${!isEdit && SP().cards.length ? `<div class="fields-2" id="payRow" ${t.type==='in'?'hidden':''}><div class="field"><label for="f-pay">Forma de pagamento</label><select class="select" id="f-pay" name="pay"><option value="">Débito / Pix / dinheiro</option>${SP().cards.map(c => `<option value="${esc(c.id)}">💳 ${esc(c.name)} (crédito)</option>`).join('')}</select></div><div class="field" id="instField" hidden><label for="f-n">Parcelas</label><select class="select" id="f-n" name="n">${Array.from({length:24},(_,i)=>`<option value="${i+1}">${i===0?'À vista':(i+1)+'x'}</option>`).join('')}</select></div></div><div class="small t2" id="payHint" hidden></div>` : ''}
      <div class="field"><label for="f-tag">Tags</label><div class="tagbox" id="tagbox"><input id="f-tag" placeholder="Digite e tecle Enter" autocomplete="off" maxlength="24"></div>
        ${sugg.length ? `<div class="row wrap" style="gap:6px" id="tagSugg">${sugg.map(g=>`<button type="button" class="chip btnchip" data-tag="${esc(g)}">#${esc(g)}</button>`).join('')}</div>` : ''}</div>
      ${t.src ? `<div class="small muted">Vinculado a ${t.src==='fixed'?'uma despesa fixa':t.src==='sub'?'uma assinatura':'uma meta'}.</div>` : ''}
    </div>
    <div class="modal-f">${isEdit?`<button type="button" class="btn danger" data-act="delTx" style="margin-right:auto">${icon('trash')}Apagar</button>`:''}<button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Salvar</button></div></form>`);
  const form = m.querySelector('form'); form._tx = t; form._tags = tags;
  const box = m.querySelector('#tagbox'), tin = m.querySelector('#f-tag');
  const drawTags = () => { $$('.chip', box).forEach(c => c.remove()); tags.forEach((g,i) => { const c = document.createElement('span'); c.className = 'chip tag'; c.innerHTML = `#${esc(g)} <span class="x" data-i="${i}" role="button" aria-label="Remover">✕</span>`; box.insertBefore(c, tin); }); };
  const addTag = v => { v = v.trim().replace(/^#/, '').replace(/[,\s]+/g, '-').toLowerCase(); if (v && !tags.includes(v) && tags.length < 10) tags.push(v); tin.value = ''; drawTags(); };
  tin.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ',') && tin.value.trim()){ e.preventDefault(); addTag(tin.value); } else if (e.key === 'Backspace' && !tin.value && tags.length){ tags.pop(); drawTags(); } });
  tin.addEventListener('blur', () => { if (tin.value.trim()) addTag(tin.value); });
  box.addEventListener('click', e => { const x = e.target.closest('.x'); if (x){ tags.splice(+x.dataset.i, 1); drawTags(); } else tin.focus(); });
  m.querySelector('#tagSugg')?.addEventListener('click', e => { const b = e.target.closest('[data-tag]'); if (b) addTag(b.dataset.tag); });
  m.querySelector('.typeseg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; form.type.value = b.dataset.v; $$('.typeseg button', m).forEach(x => x.setAttribute('aria-pressed', x === b)); form.cat.innerHTML = catOptions(b.dataset.v); const pr = m.querySelector('#payRow'); if (pr){ pr.hidden = b.dataset.v === 'in'; if (b.dataset.v === 'in'){ form.pay.value = ''; payUpd(); } } });
  const payUpd = () => { if (!form.pay) return; const c = cardById(form.pay.value); m.querySelector('#instField').hidden = !c; const hint = m.querySelector('#payHint'); if (!c){ hint.hidden = true; return; } const n = +form.n.value||1, a = parseMoney(form.amount.value), fd = firstDueFor(c, form.date.value); hint.hidden = false; hint.innerHTML = `💳 ${n>1 && a>0 ? `${n}x de <b class="num">${money(Math.round(a/n*100)/100)}</b> · ` : ''}${n>1?'1ª parcela':'Entra'} na fatura de <b>${ymLabel(fd).toLowerCase()}</b> (não desconta do saldo de hoje)`; };
  if (form.pay){ form.pay.addEventListener('change', payUpd); form.n.addEventListener('change', payUpd); form.amount.addEventListener('input', payUpd); form.date.addEventListener('change', payUpd); }
  drawTags();
}
export async function submitTx(form){
  const t = form._tx; const amount = parseMoney(form.amount.value);
  if (!(amount > 0)) { form.amount.focus(); return toast('Informe um valor maior que zero.'); }
  if (!form.date.value) return toast('Informe a data.');
  if (form.querySelector('#f-tag').value.trim()) form.querySelector('#f-tag').dispatchEvent(new Event('blur'));
  if (!t.id && form.pay && form.pay.value && form.type.value === 'out'){
    const c = cardById(form.pay.value), n = +form.n.value || 1, inst = Math.round(amount/n*100)/100, fd = firstDueFor(c, form.date.value);
    const buy = {cardId: c.id, desc: form.desc.value.trim() || catById(form.cat.value).name, total: amount, n, inst, date: form.date.value, cat: form.cat.value, tags: form._tags, firstDue: fd, by: state.uid, createdAt: new Date().toISOString()};
    closeModal();
    return put(colRef(state.space,'cardbuys').doc(), buy).then(() => toast(`💳 ${n>1?n+'x de '+money(inst):money(amount)} no ${c.name} · fatura de ${ymShort(fd)}`)).catch(()=>{});
  }
  const data = {type: form.type.value, amount, date: form.date.value, desc: form.desc.value.trim(), cat: form.cat.value, tags: form._tags, by: t.by || state.uid, createdAt: t.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()};
  if (t.src){ data.src = t.src; data.srcId = t.srcId; data.srcMonth = t.srcMonth; }
  closeModal();
  await saveTx(t.id, data, t._y).then(() => toast(t.id ? 'Lançamento atualizado' : 'Lançamento salvo')).catch(()=>{});
}
export async function saveTx(id, data, oldYear){
  const key = state.space, y = data.date.slice(0,4);
  ensureYear(key, y);
  if (id && oldYear && String(oldYear) !== y) await del(colRef(key, 'tx'+oldYear).doc(id));
  const ref = id ? colRef(key, 'tx'+y).doc(id) : colRef(key, 'tx'+y).doc();
  await put(ref, data);
  return ref;
}
export function findTx(id, y){ return (SP().tx[y]||[]).find(t => t.id === id); }

