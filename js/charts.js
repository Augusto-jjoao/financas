import { $, PCT, compact, esc, money, sum, ymLabel } from './utils.js';

/* ================= Charts ================= */
export const tip = $('#tip');
export function showTip(e, html){ tip.innerHTML = html; tip.style.display = 'block'; const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14; tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
export function hideTip(){ tip.style.display = 'none'; }
export function niceMax(v){ if (v <= 0) return 100; const e = Math.pow(10, Math.floor(Math.log10(v))); const n = v/e; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*e; }
export function topRounded(x,y,w,h,r){ r = Math.min(r, w/2, h); return `M${x},${y+h}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h}Z`; }
export function drawBars(el, {labels, series, months}){
  if (!el) return;
  const W = Math.max(280, el.clientWidth), H = +(el.dataset.h||260);
  const m = {l:56, r:6, t:10, b:26}, iw = W-m.l-m.r, ih = H-m.t-m.b;
  const max = niceMax(Math.max(0, ...series.flatMap(s=>s.values)));
  const n = series.length, gw = iw/labels.length, bw = Math.max(3, Math.min(20, (gw*.72 - (n-1)*2)/n)), grpW = n*bw + (n-1)*2;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de barras: ${esc(series.map(x=>x.name).join(' e '))} por mês">`;
  s += `<rect class="band" x="0" y="${m.t}" width="${gw}" height="${ih}" fill="var(--surface-2)" opacity="0" rx="6"/>`;
  for (let i=0;i<=4;i++){ const y = m.t + ih - ih*i/4; s += `<line x1="${m.l}" x2="${W-m.r}" y1="${y}" y2="${y}" stroke="${i?'var(--grid)':'var(--axis)'}" stroke-width="1"/><text x="${m.l-8}" y="${y+4}" text-anchor="end">${compact(max*i/4)}</text>`; }
  const every = gw < 30 ? 2 : 1;
  labels.forEach((lab,i) => {
    const gx = m.l + gw*i + (gw-grpW)/2;
    series.forEach((se,j) => { const v = se.values[i]||0, h = ih*v/max; if (h > 0.5) s += `<path d="${topRounded(gx+j*(bw+2), m.t+ih-h, bw, h, 4)}" fill="var(${se.color})"/>`; });
    if (i % every === 0 || i === labels.length-1) s += `<text x="${m.l+gw*i+gw/2}" y="${H-8}" text-anchor="middle">${esc(lab)}</text>`;
  });
  labels.forEach((lab,i) => { s += `<rect class="hit" data-i="${i}" x="${m.l+gw*i}" y="${m.t}" width="${gw}" height="${ih}" fill="transparent"/>`; });
  s += '</svg>';
  el.innerHTML = s;
  const band = el.querySelector('.band');
  const move = e => { const r = e.target.closest && e.target.closest('.hit'); if (!r){ hideTip(); band.setAttribute('opacity',0); return; } const i = +r.dataset.i; band.setAttribute('x', m.l + gw*i); band.setAttribute('opacity', .8);
    const bal = series.length===2 ? series[0].values[i]-series[1].values[i] : null;
    showTip(e, `<b>${months ? ymLabel(months[i]) : esc(labels[i])}</b>${series.map(se=>`<div class="r"><span><i class="sw" style="background:var(${se.color})"></i> ${esc(se.name)}</span><span class="num">${money(se.values[i])}</span></div>`).join('')}${bal!==null?`<div class="r" style="border-top:1px solid var(--border);margin-top:4px;padding-top:4px"><span>Saldo</span><b class="num" style="display:inline;margin:0">${money(bal)}</b></div>`:''}`); };
  el.onpointermove = move; el.onpointerdown = move; el.onpointerleave = () => { hideTip(); band.setAttribute('opacity',0); };
}
export function arcPath(cx,cy,R,r,a0,a1){ const L = a1-a0 > Math.PI ? 1 : 0; const p = (rad,a) => `${(cx+rad*Math.cos(a)).toFixed(2)},${(cy+rad*Math.sin(a)).toFixed(2)}`; return `M${p(R,a0)}A${R},${R} 0 ${L} 1 ${p(R,a1)}L${p(r,a1)}A${r},${r} 0 ${L} 0 ${p(r,a0)}Z`; }
export function drawDonut(el, legendEl, items, {title, total}){
  if (!el) return;
  const S = 200, cx = S/2, cy = S/2, R = S/2 - 2, r = R*0.64; const tot = sum(items, x=>x.value) || 1;
  let a = -Math.PI/2, s = `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" role="img" aria-label="Gráfico de rosca: ${esc(title)}">`;
  items.forEach((it,i) => { let a1 = a + it.value/tot*Math.PI*2; if (items.length === 1) a1 = a + Math.PI*2 - 0.0001; s += `<path class="seg" data-i="${i}" d="${arcPath(cx,cy,R,r,a,a1)}" fill="var(${it.color})" stroke="var(--surface)" stroke-width="2"/>`; a = a1; });
  s += `<text x="${cx}" y="${cy-4}" text-anchor="middle" style="font-size:12px">${esc(title)}</text><text x="${cx}" y="${cy+16}" text-anchor="middle" style="font-size:16px;font-weight:800;fill:var(--text)">${compact(total)}</text></svg>`;
  el.innerHTML = s; el.style.width = S+'px';
  el.onpointermove = e => { const p = e.target.closest && e.target.closest('.seg'); if (!p) return hideTip(); const it = items[+p.dataset.i]; showTip(e, `<b>${esc(it.label)}</b><div class="r"><span>Valor</span><span class="num">${money(it.value)}</span></div><div class="r"><span>Participação</span><span class="num">${PCT(it.value/tot)}</span></div>`); };
  el.onpointerleave = hideTip;
  if (legendEl) legendEl.innerHTML = items.map(it => `<div class="r"><i class="sw" style="background:var(${it.color})"></i><span class="n">${esc(it.label)}</span><span class="num t2">${money(it.value)}</span><span class="num muted" style="min-width:44px;text-align:right">${PCT(it.value/tot)}</span></div>`).join('');
}

