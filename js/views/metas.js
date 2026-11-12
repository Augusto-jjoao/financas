import { afterRender } from '../bus.js';
import { drawDonut } from '../charts.js';
import { displayName, goalSaved, monthsUntil, totalSaved } from '../selectors.js';
import { SP, state } from '../state.js';
import { emptyState, kpi, statusPill } from '../ui.js';
import { $, PCT, clamp, esc, fmtDate, icon, money, sum, ymLabel } from '../utils.js';
import { foldOther } from './relatorios.js';

/* ---------- Goals ---------- */
export function viewGoals(){
  const sp = SP(); const saved = totalSaved(); const goals = [...sp.goals].sort((a,b) => (a.order||0)-(b.order||0) || String(a.createdAt).localeCompare(String(b.createdAt)));
  const targetSum = sum(goals, g => g.target);
  let h = `<div class="grid g-main"><div class="card hero kpi"><div class="label"><span class="dot">${icon('piggy')}</span>Você já economizou</div><div class="value num" style="font-size:38px">${money(saved)}</div>
      <div class="foot">${targetSum ? `${PCT(saved/targetSum)} do total das metas (${money(targetSum)})` : 'Crie metas para separar o dinheiro guardado por objetivo.'}</div>
      ${goals.length && saved > 0 ? `<div class="alloc" style="background:rgba(255,255,255,.2)">${goals.map((g,i)=>{ const s=goalSaved(g); return s>0?`<i style="width:${s/saved*100}%;background:rgba(255,255,255,${.95 - (i%5)*.15})" title="${esc(g.name)}"></i>`:''; }).join('')}</div>` : ''}
    </div>
    <div class="card"><div class="card-h"><h3>Para onde vai o dinheiro guardado</h3></div>${saved > 0 ? `<div class="donut-wrap"><div class="chart" id="goalDonut"></div><div class="dlegend" id="goalLegend"></div></div>` : '<p class="t2 small" style="margin:0">Quando você guardar dinheiro nas metas, a divisão aparece aqui.</p>'}</div></div>
  <div class="section-title"><h2>Suas metas</h2><div class="right"><button class="btn" data-act="newGoal" data-write>${icon('plus')}Nova meta</button></div></div>`;
  if (!goals.length) return h + `<div class="card">${emptyState('🎯','Nenhuma meta ainda','Exemplos: ✈️ Viagem, 💻 Computador novo, 📺 Televisão, 🎁 Presente para a namorada, 🛟 Reserva de emergência.', `<button class="btn sm" data-act="newGoal" data-write>${icon('plus')}Criar primeira meta</button>`)}</div>`;
  h += `<div class="grid g-3">${goals.map(g => {
    const s = goalSaved(g), t = Number(g.target)||0, pct = t ? s/t : 0, mLeft = monthsUntil(g.deadline);
    let plan = '';
    if (t && s >= t) plan = statusPill({cls:'good', ic:'checkCircle', label:'Meta atingida!'});
    else if (t && g.deadline){ plan = mLeft > 0 ? `<span class="small t2">Guarde <b class="num">${money((t-s)/mLeft)}</b>/mês por ${mLeft} ${mLeft===1?'mês':'meses'}</span>` : statusPill({cls:'serious', ic:'alert', label:'Prazo vencido'}); }
    return `<div class="card goal-card"><div class="ttl"><div class="emoji">${esc(g.emoji||'🎯')}</div><div class="main" style="min-width:0;flex:1"><div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g.name)}${g.isReserve?' <span class="chip">reserva</span>':''}</div><div class="xs muted">${g.deadline ? 'até ' + ymLabel(g.deadline).toLowerCase() : 'sem prazo'}</div></div><button class="icon-btn" data-act="editGoal" data-id="${esc(g.id)}" aria-label="Editar meta" data-write>${icon('edit')}</button></div>
      <div style="margin:14px 0 8px"><span class="big num">${money(s)}</span>${t?` <span class="muted small">de ${money(t)}</span>`:''}</div>
      ${t ? `<div class="bar ${pct>=1?'t-good':''}"><i style="width:${clamp(pct,0,1)*100}%"></i></div><div class="row small" style="justify-content:space-between;margin-top:6px"><span class="t2 num">${PCT(pct)}</span><span class="muted num">${s<t?'faltam '+money(t-s):''}</span></div>` : ''}
      <div style="min-height:24px;margin-top:8px">${plan}</div>
      <div class="row" style="margin-top:12px" data-write><button class="btn sm" style="flex:1" data-act="moveGoal" data-id="${esc(g.id)}" data-v="in">${icon('plus')}Guardar</button><button class="btn sm ghost" style="flex:1" data-act="moveGoal" data-id="${esc(g.id)}" data-v="out">${icon('minus')}Retirar</button></div>
    </div>`;
  }).join('')}</div>`;
  const moves = [...sp.moves].sort((a,b) => (b.date+(b.createdAt||'')).localeCompare(a.date+(a.createdAt||''))).slice(0,12);
  if (moves.length){
    h += `<div class="section-title"><h2>Movimentações recentes</h2></div><div class="card"><div class="list">${moves.map(m => { const g = sp.goals.find(x=>x.id===m.goalId) || {name:'Meta removida', emoji:'🎯'}; return `<div class="item"><div class="emoji sm">${esc(g.emoji||'🎯')}</div><div class="main"><div class="title">${esc(g.name)}</div><div class="meta">${fmtDate(m.date)}${m.note?' · '+esc(m.note):''}${state.space==='joint'&&m.by?` <span class="chip">${esc(displayName(m.by))}</span>`:''}</div></div><div class="amt num ${m.amount>0?'pos':''}">${m.amount>0?'+ ':'− '}${money(Math.abs(m.amount))}</div><button class="icon-btn" data-act="delMove" data-id="${esc(m.id)}" aria-label="Apagar movimentação" data-write>${icon('trash')}</button></div>`; }).join('')}</div></div>`;
  }
  afterRender.push(() => {
    const el = $('#goalDonut'); if (!el) return;
    const items = goals.map(g => ({label:(g.emoji||'🎯')+' '+g.name, value:Math.max(0, goalSaved(g))})).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
    drawDonut(el, $('#goalLegend'), foldOther(items), {title:'Guardado', total:saved});
  });
  return h;
}

