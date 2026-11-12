// Tela "Ajustes": conta, aparência, backup (exportar/importar) e categorias.
import { setTheme } from '../actions.js';
import { cats, settings } from '../selectors.js';
import { state } from '../state.js';
import { $, esc, icon, ymShort } from '../utils.js';

export function viewSettings(){
  const cs = cats(); const custom = !!settings().categories;
  const spaceName = state.space === 'joint' ? 'conta conjunta' : 'conta pessoal';
  const account = state.mode === 'cloud'
    ? `<div class="item"><div class="avatar">${esc((state.userName || '?').charAt(0).toUpperCase())}</div><div class="main"><div class="title">${esc(state.userName)}</div><div class="meta">${esc(state.userEmail)} · dados sincronizados no Firebase</div></div><button class="btn sm ghost" data-act="signOut">Sair</button></div>`
    : `<div class="item"><div class="emoji sm">💻</div><div class="main"><div class="title">Modo local</div><div class="meta">Os dados ficam só neste navegador. Para entrar com Google, sincronizar e usar a conta conjunta, preencha o arquivo <code>js/firebase-config.js</code> (README, passo 2).</div></div></div>`;
  return `<div class="grid g-2">
    <div class="card"><div class="card-h"><h3>Conta e aparência</h3></div>
      <div class="list">
        ${account}
        <div class="item"><div class="emoji sm">${state.theme==='dark'?'🌙':'☀️'}</div><div class="main"><div class="title">Tema</div><div class="meta">Modo ${state.theme==='dark'?'escuro':'claro'}</div></div><div class="seg"><button data-act="setTheme" data-v="light" aria-pressed="${state.theme!=='dark'}">Claro</button><button data-act="setTheme" data-v="dark" aria-pressed="${state.theme==='dark'}">Escuro</button></div></div>
        <div class="item"><div class="emoji sm">🙈</div><div class="main"><div class="title">Ocultar valores</div><div class="meta">Esconde os valores na tela (útil em lugares públicos)</div></div><button class="btn sm ghost" data-act="toggleHide">${state.hide?'Mostrar':'Ocultar'}</button></div>
      </div></div>
    <div class="card"><div class="card-h"><h3>Backup</h3><span class="sub">${spaceName}</span></div>
      <p class="t2 small" style="margin-top:0">Baixe uma cópia completa da ${spaceName} (JSON) ou os lançamentos do mês em planilha (CSV). Para trazer dados do site antigo no Claude, use “Importar backup”.</p>
      <div class="row wrap">
        <button class="btn sm ghost" data-act="downloadJson">${icon('down')}Baixar backup (JSON)</button>
        <button class="btn sm ghost" data-act="downloadCsv">${icon('down')}CSV de ${ymShort(state.month)}</button>
        <button class="btn sm" data-act="importOpen">${icon('up')}Importar backup</button>
      </div>
      ${state.mode === 'local' ? `<button class="btn sm danger" style="margin-top:12px" data-act="wipeLocal">Apagar todos os dados deste navegador</button>` : ''}
    </div>
  </div>
  <div class="section-title"><h2>Categorias</h2><div class="right">${custom?`<button class="btn sm ghost" data-act="resetCats">Restaurar padrão</button>`:''}<button class="btn sm" data-act="newCat">${icon('plus')}Nova categoria</button></div></div>
  <div class="grid g-2">${['out','in'].map(k => `<div class="card"><div class="card-h"><h3>${k==='out'?'Saídas':'Entradas'}</h3></div><div class="list">${cs.filter(c=>c.kind===k).map(c => `<div class="item"><div class="emoji sm">${esc(c.emoji)}</div><div class="main"><div class="title">${esc(c.name)}</div></div><button class="icon-btn" data-act="editCat" data-id="${esc(c.id)}" aria-label="Editar">${icon('edit')}</button></div>`).join('')}</div></div>`).join('')}</div>`;
}
