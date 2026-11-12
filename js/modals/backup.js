// Janela "Importar backup": aceita o arquivo .json baixado em Ajustes
// ou o texto copiado no site antigo (Ajustes → "Copiar backup JSON").
import { toast } from '../bus.js';
import { importBackup } from '../data/store.js';
import { state } from '../state.js';
import { closeModal, mHead, openModal } from '../ui.js';
import { $, icon } from '../utils.js';

export function importModal(){
  const where = state.space === 'joint' ? 'na conta conjunta' : 'na sua conta pessoal';
  const m = openModal(`<form data-form="imp">${mHead('Importar backup')}<div class="modal-b">
    <p class="t2 small" style="margin:0">Os dados serão adicionados <b>${where}</b>. Itens com o mesmo identificador são substituídos (importar o mesmo arquivo duas vezes não duplica nada).</p>
    <div class="field"><label for="imp-file">Arquivo .json</label><input class="input" type="file" id="imp-file" accept=".json,application/json"></div>
    <div class="field"><label for="imp-text">…ou cole o conteúdo do backup</label><textarea class="input" id="imp-text" name="text" rows="6" style="font-family:ui-monospace,monospace;font-size:12px" placeholder='{"exportadoEm": "...", "lancamentos": [...]}'></textarea></div>
    <div class="small t2" id="imp-info"></div>
  </div><div class="modal-f"><button type="button" class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn" type="submit">${icon('up')}Importar</button></div></form>`);
  const f = m.querySelector('form');
  m.querySelector('#imp-file').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    f.text.value = await file.text();
    describe(f);
  });
  f.text.addEventListener('input', () => describe(f));
}

export function parse(text){ try { return JSON.parse(text); } catch { return null; } }

/** Mostra um resumo do que será importado. */
export function describe(f){
  const d = parse(f.text.value), info = f.querySelector('#imp-info');
  if (!d){ info.textContent = f.text.value.trim() ? 'O conteúdo não é um JSON válido.' : ''; return; }
  const n = k => (d[k] || []).length;
  info.innerHTML = `Encontrado: <b>${n('lancamentos')}</b> lançamentos, <b>${n('assinaturas')}</b> assinaturas, <b>${n('fixas')}</b> despesas fixas, <b>${n('metas')}</b> metas, <b>${n('cartoes')}</b> cartões e <b>${n('compras_cartao')}</b> compras no cartão${d.ajustes ? ', além dos ajustes (renda, orçamento, categorias)' : ''}.`;
}

export async function submitImport(f){
  const d = parse(f.text.value);
  if (!d) return toast('Escolha um arquivo ou cole um backup válido.');
  const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Importando…';
  try {
    const n = await importBackup(d, k => { btn.textContent = `Importando… ${k}`; });
    closeModal(); toast(`${n} registro(s) importado(s)`);
  } catch (e) {
    console.error(e); btn.disabled = false; btn.textContent = 'Importar'; toast('Não foi possível importar este backup.');
  }
}
