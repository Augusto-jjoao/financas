import { toast } from '../bus.js';
import { saveSettings } from '../data/store.js';
import { cats } from '../selectors.js';
import { closeModal, mHead, openModal } from '../ui.js';
import { $, esc, icon, uidGen } from '../utils.js';

/* --- Categories --- */
export function catModal(c){
  const isEdit = !!c; c = c || {name:'', emoji:'🏷️', kind:'out'};
  const m = openModal(`<form data-form="cat">${mHead(isEdit?'Editar categoria':'Nova categoria')}<div class="modal-b">
    <div class="fields-2" style="grid-template-columns:90px 1fr"><div class="field"><label for="c-emoji">Emoji</label><input class="input" id="c-emoji" name="emoji" value="${esc(c.emoji)}" maxlength="4" style="text-align:center;font-size:20px"></div>
    <div class="field"><label for="c-name">Nome</label><input class="input" id="c-name" name="name" value="${esc(c.name)}" required maxlength="30" autofocus></div></div>
    <div class="field"><label for="c-kind">Tipo</label><select class="select" id="c-kind" name="kind" ${isEdit?'disabled':''}><option value="out" ${c.kind==='out'?'selected':''}>Saída</option><option value="in" ${c.kind==='in'?'selected':''}>Entrada</option></select></div>
  </div><div class="modal-f">${isEdit?`<button type="button" class="btn danger" data-act="delCat" data-id="${esc(c.id)}" style="margin-right:auto">${icon('trash')}Remover</button>`:''}<button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('check')}Salvar</button></div></form>`);
  m.querySelector('form')._obj = c;
}
export async function submitCat(form){
  const c = form._obj; const list = cats().map(x => Object.assign({}, x));
  const name = form.name.value.trim(); if (!name) return;
  if (c.id){ const i = list.findIndex(x => x.id === c.id); list[i] = Object.assign(list[i], {name, emoji: form.emoji.value.trim() || '🏷️'}); }
  else list.push({id: 'c' + uidGen(), name, emoji: form.emoji.value.trim() || '🏷️', kind: form.kind.value});
  closeModal(); await saveSettings({categories: list}).then(()=>toast('Categoria salva')).catch(()=>{});
}

