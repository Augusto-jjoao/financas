// Tela "Conta conjunta": criar, convidar (por código), entrar, sair e ver quem pagou o quê.
import { setSpace } from '../actions.js';
import { SERIES } from '../constants.js';
import { createHousehold, householdId, joinHousehold, leaveHousehold } from '../data/store.js';
import { displayName, monthItems } from '../selectors.js';
import { state } from '../state.js';
import { $, MONTHS, PCT, esc, icon, money, sum } from '../utils.js';

/** Mostrada quando a pessoa ainda não participa de nenhuma conta conjunta. */
export function viewJointSetup(){
  const local = state.mode === 'local';
  return `<div class="grid g-2">
    <div class="card"><div class="card-h"><h3>Criar uma conta conjunta</h3></div>
      <p class="t2" style="margin-top:0">Um espaço separado para os gastos, contas, cartões e metas do casal (ou da família). Sua conta pessoal continua privada.</p>
      <button class="btn" data-act="createHousehold">${icon('plus')}Criar conta conjunta</button>
      ${local ? `<p class="xs muted" style="margin:14px 0 0">No modo local, a conta conjunta fica só neste navegador. Para dividir com outra pessoa, configure o Firebase (README, passo 2).</p>` : `<p class="xs muted" style="margin:14px 0 0">Depois de criar, você recebe um código para enviar ao parceiro ou parceira.</p>`}
    </div>
    <div class="card"><div class="card-h"><h3>Recebi um código</h3></div>
      <p class="t2" style="margin-top:0">Se alguém já criou a conta conjunta, cole aqui o código que essa pessoa te enviou.</p>
      <div class="row wrap"><input class="input" id="joinCode" placeholder="Cole o código aqui" autocomplete="off" style="flex:1;min-width:200px" ${local?'disabled':''}><button class="btn" data-act="joinHousehold" ${local?'disabled':''}>Entrar</button></div>
      ${local ? '<p class="xs muted" style="margin:10px 0 0">Disponível quando o Firebase estiver configurado.</p>' : ''}
    </div>
  </div>`;
}

/** Tela da conta conjunta para quem já participa de uma. */
export function viewJoint(){
  const hid = householdId();
  if (!hid) return viewJointSetup();
  const sp = state.spaces.joint, ym = state.month, set = sp.settings || {};
  const members = set.members || [];
  const byMember = {};
  monthItems(ym, sp).filter(t => t.type === 'out').forEach(t => byMember[t.by || '?'] = (byMember[t.by || '?'] || 0) + t.amount);
  const tot = sum(Object.values(byMember));
  let h = `<div class="grid g-main">
    <div class="card"><div class="card-h"><h3>Convidar alguém</h3></div>
      ${state.mode === 'local' ? `<p class="t2" style="margin-top:0">No <b>modo local</b> a conta conjunta fica só neste navegador, então não dá para convidar outra pessoa. Configure o Firebase (README, passo 2) para usar a conta conjunta de verdade.</p>` : `
      <ol class="steps">
        <li><span>Envie o <b>link do site</b> e o <b>código abaixo</b> para a pessoa.</span></li>
        <li><span>Ela entra com a conta Google dela, abre <b>Conta conjunta</b> e cola o código em “Recebi um código”.</span></li>
        <li><span>Pronto: vocês passam a ver e lançar os mesmos dados, em tempo real.</span></li>
      </ol>
      <div class="field" style="margin-top:16px"><label for="inviteCode">Código de convite</label>
        <div class="row"><input class="input num" id="inviteCode" value="${esc(hid)}" readonly style="flex:1;font-family:ui-monospace,monospace"><button class="btn ghost" data-act="copyInvite">${icon('copy')}Copiar</button></div></div>
      <p class="xs muted" style="margin:10px 0 0">Guarde o código como uma senha: quem tiver o código e uma conta Google consegue entrar na conta conjunta.</p>`}
      <div class="row wrap" style="margin-top:16px">${state.space === 'joint' ? `<span class="status good">${icon('checkCircle')}Você está na conta conjunta</span>` : `<button class="btn" data-act="setSpace" data-v="joint">${icon('users')}Abrir a conta conjunta</button>`}</div>
    </div>
    <div class="card"><div class="card-h"><h3>Membros</h3><span class="sub">${members.length}</span></div>
      <div class="list">${members.map(id => `<div class="item"><div class="avatar">${esc(displayName(id).charAt(0).toUpperCase())}</div><div class="main"><div class="title">${esc(displayName(id))}</div></div></div>`).join('')}</div>
      <div class="field" style="margin-top:14px"><label for="jointName">Nome da conta conjunta</label><input class="input" id="jointName" placeholder="Ex.: Casa Ana & João" value="${esc(set.name || '')}" data-on="jointName" maxlength="40" ${state.space==='joint'?'':'disabled'}></div>
      <button class="btn sm danger" style="margin-top:14px" data-act="leaveHousehold">Sair da conta conjunta</button>
    </div>
  </div>`;
  h += `<div class="section-title"><h2>Quem pagou o quê em ${MONTHS[+ym.slice(5)-1]}</h2></div><div class="card">${tot ? `<div class="hbars">${Object.entries(byMember).sort((a,b)=>b[1]-a[1]).map(([id,v],i) => `<div class="hb"><div class="top"><span class="n">${esc(displayName(id))}</span><span class="num t2">${money(v)} · ${PCT(v/tot)}</span></div><div class="track"><i style="width:${v/tot*100}%;background:var(${SERIES[i%8]})"></i></div></div>`).join('')}</div>
    ${Object.keys(byMember).length >= 2 ? `<p class="small t2" style="margin:14px 0 0">Dividindo meio a meio, cada um deveria pagar <b class="num">${money(tot/2)}</b>.</p>` : ''}` : '<p class="t2 small" style="margin:0">Sem saídas lançadas na conta conjunta neste mês.</p>'}</div>`;
  return h;
}
