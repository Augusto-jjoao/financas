import { setSpace } from './actions.js';
import { afterRender, changed } from './bus.js';
import { householdId, spaceReady } from './data/store.js';
import { settings } from './selectors.js';
import { SP, state } from './state.js';
import { $, esc, icon, ymLabel } from './utils.js';
import { viewSettings } from './views/ajustes.js';
import { viewSubs } from './views/assinaturas.js';
import { viewCard } from './views/cartao.js';
import { viewJoint, viewJointSetup } from './views/conjunta.js';
import { viewFixed } from './views/fixas.js';
import { viewHome } from './views/inicio.js';
import { viewInvest } from './views/investir.js';
import { viewTx } from './views/lancamentos.js';
import { viewGoals } from './views/metas.js';
import { viewBudget } from './views/orcamento.js';
import { viewReports } from './views/relatorios.js';

/* ================= Rendering core ================= */
export const ROUTES = {
  inicio:{t:'Visão geral', i:'home', v:()=>viewHome()},
  transacoes:{t:'Lançamentos', i:'list', v:()=>viewTx()},
  assinaturas:{t:'Assinaturas', i:'repeat', v:()=>viewSubs()},
  fixas:{t:'Despesas fixas', i:'cal', v:()=>viewFixed()},
  cartao:{t:'Cartão de crédito', i:'card', v:()=>viewCard()},
  orcamento:{t:'Orçamento', i:'gauge', v:()=>viewBudget()},
  metas:{t:'Metas e economias', i:'target', v:()=>viewGoals()},
  relatorios:{t:'Relatórios', i:'chart', v:()=>viewReports()},
  investir:{t:'Onde aplicar', i:'trend', v:()=>viewInvest()},
  conjunta:{t:'Conta conjunta', i:'users', v:()=>viewJoint()},
  ajustes:{t:'Ajustes', i:'sliders', v:()=>viewSettings()},
};
export const NAV_MAIN = ['inicio','transacoes','cartao','assinaturas','fixas','orcamento','metas','relatorios','investir'];
export const NAV_SEC = ['conjunta','ajustes'];

export function renderChrome(){
  const r = ROUTES[state.route];
  document.body.classList.toggle('auth', state.mode === 'auth' || state.mode === 'error');
  $('#pageTitle').textContent = r.t;
  document.title = `${r.t} · Finanças`;
  $('#spTag').textContent = state.space === 'joint' ? '👥 ' + (settings().name || 'Conta conjunta') : '🔒 Pessoal';
  $('#monthLabel').textContent = ymLabel(state.month);
  $('#monthNav').style.display = ['ajustes','investir','conjunta'].includes(state.route) ? 'none' : '';
  $('#themeBtn').innerHTML = icon(state.theme === 'dark' ? 'sun' : 'moon');
  $('#hideBtn').innerHTML = icon(state.hide ? 'eyeOff' : 'eye');
  $('#hideBtn').setAttribute('aria-pressed', state.hide);
  $('#spaceSwitch').innerHTML = `
    <button data-act="setSpace" data-v="personal" aria-pressed="${state.space==='personal'}">${icon('lock')}Pessoal</button>
    <button data-act="setSpace" data-v="joint" aria-pressed="${state.space==='joint'}">${icon('users')}Conjunta</button>`;
  const link = k => `<a href="#${k}" ${state.route===k?'aria-current="page"':''}>${icon(ROUTES[k].i)}${ROUTES[k].t}</a>`;
  $('#sideNav').innerHTML = NAV_MAIN.map(link).join('') + '<div class="nav-sep"></div>' + NAV_SEC.map(link).join('');
  const bn = ['inicio','transacoes','cartao','metas'];
  $('#bottomNav').innerHTML = bn.map(k => `<a href="#${k}" ${state.route===k?'aria-current="page"':''}>${icon(ROUTES[k].i)}${k==='transacoes'?'Lançam.':k==='inicio'?'Início':ROUTES[k].t.split(' ')[0]}</a>`).join('') +
    `<button data-act="moreNav" ${bn.includes(state.route)?'':'aria-current="page"'}>${icon('more')}Mais</button>`;
  $('#sideFoot').innerHTML = state.mode === 'cloud'
    ? `${icon('shield')}<span>Conectado como <b>${esc(state.userEmail || state.userName)}</b>.<br>Sua conta pessoal é visível só para você. <a href="#" data-act="signOut">Sair</a></span>`
    : state.mode === 'local' ? `${icon('info')}<span><b>Modo local:</b> dados salvos só neste navegador. <a href="#ajustes">Saiba mais</a></span>` : '';
  // Avisos no topo
  const b = [];
  if (state.error) b.push(`<div class="banner">${icon('alert')}<div>${esc(state.error)}</div></div>`);
  else if (state.slow && state.mode === 'cloud' && !spaceReady(state.spaces.personal)) b.push(`<div class="banner">${icon('clock')}<div>Os dados estão demorando para carregar. Verifique sua conexão — a página continua tentando.</div></div>`);
  if (state.mode === 'local' && state.route === 'inicio') b.push(`<div class="banner info">${icon('info')}<div><b>Modo local.</b> Seus dados ficam salvos só neste navegador. Para entrar com Google, sincronizar entre computadores e usar a conta conjunta, configure o Firebase (passo 2 do README).</div></div>`);
  $('#banners').innerHTML = b.join('');
}

/** Desenha a tela inteira de acordo com o estado atual. Chamado via changed() (bus.js). */
export function render(){
  const ae = document.activeElement; const focusId = ae && ae.id && $('#view').contains(ae) ? ae.id : null;
  const sel = focusId && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  const scroll = window.scrollY;
  renderChrome();
  afterRender.length = 0;
  const sp = SP(), personalReady = spaceReady(state.spaces.personal);
  let html;
  if (state.mode === 'auth') html = viewLogin();
  else if (state.mode === 'error') html = viewBootError();
  else if (state.mode === 'loading' || !personalReady) html = skeleton();
  else if (state.space === 'joint' && !householdId() && state.route !== 'ajustes' && state.route !== 'investir') html = viewJointSetup();
  else if (!spaceReady(sp) && !['investir','ajustes','conjunta'].includes(state.route)) html = skeleton();
  else html = ROUTES[state.route].v();
  $('#view').innerHTML = html;
  afterRender.forEach(f => { try { f(); } catch(e){ console.error(e); } });
  if (focusId){ const el = document.getElementById(focusId); if (el){ el.focus(); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch {} } }
  window.scrollTo(0, scroll);
}
export function skeleton(){ return `<div class="grid g-4">${'<div class="skeleton" style="height:118px"></div>'.repeat(4)}</div><div class="grid g-main" style="margin-top:16px"><div class="skeleton" style="height:320px"></div><div class="skeleton" style="height:320px"></div></div>`; }

/** Tela de entrada (só aparece quando o Firebase está configurado e ninguém entrou ainda). */
export function viewLogin(){
  return `<div class="login"><div class="card login-card">
    <div class="brand-mark big">${icon('wallet')}</div>
    <h1>Finanças</h1>
    <p class="t2">Controle de gastos, assinaturas, cartão, metas e conta conjunta.</p>
    <button class="btn google" data-act="signIn">${GOOGLE_ICON}Entrar com Google</button>
    <p class="xs muted" style="margin:18px 0 0">Cada pessoa vê só os próprios dados. A conta conjunta é compartilhada apenas com quem você convidar.</p>
  </div></div>`;
}
export function viewBootError(){
  return `<div class="login"><div class="card login-card">
    <div class="brand-mark big">${icon('alert')}</div>
    <h1>Não foi possível iniciar</h1>
    <p class="t2">${esc(state.error || 'Erro ao carregar o Firebase.')}</p>
    <button class="btn" onclick="location.reload()">Tentar de novo</button>
  </div></div>`;
}
export const GOOGLE_ICON = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
