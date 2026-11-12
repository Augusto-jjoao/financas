/* ================= Utilities ================= */
export const $ = (s, r=document) => r.querySelector(s);
export const $$ = (s, r=document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pad = n => String(n).padStart(2,'0');
export const BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
export const NUM2 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
export const PCT = v => (isFinite(v)? (v*100).toLocaleString('pt-BR',{maximumFractionDigits:1}) : '0') + '%';
export const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
export const MONTHS_S = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
export const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
export const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const ymNow = () => todayISO().slice(0,7);
export const parseISO = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y, (m||1)-1, d||1); };
export const addMonths = (ym, k) => { let [y,m] = ym.split('-').map(Number); m += k; while(m>12){m-=12;y++} while(m<1){m+=12;y--} return `${y}-${pad(m)}`; };
export const ymLabel = ym => `${cap(MONTHS[+ym.slice(5)-1])} ${ym.slice(0,4)}`;
export const ymShort = ym => `${MONTHS_S[+ym.slice(5)-1]}/${ym.slice(2,4)}`;
export const dim = (y,m) => new Date(y, m, 0).getDate();
export const fmtDate = s => { const d = parseISO(s); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; };
export const fmtDay = s => { const d = parseISO(s); const wd = ['dom','seg','ter','qua','qui','sex','sáb'][d.getDay()]; return `${wd}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
export const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
export const uidGen = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const prefs = { hide: false }; // preferência "ocultar valores" (lida por money/compact)
export function money(v){ return prefs.hide ? 'R$ ••••' : BRL.format(Number(v)||0); }
export function moneySigned(v, type){ return (type==='in'?'+ ':'− ') + money(Math.abs(v)); }
export function compact(v){
  if (prefs.hide) return '•••';
  const a = Math.abs(v);
  if (a >= 1e6) return 'R$ ' + (v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1}) + ' mi';
  if (a >= 1e3) return 'R$ ' + (v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1}) + ' mil';
  return 'R$ ' + Math.round(v);
}
export function parseMoney(s){
  if (typeof s === 'number') return s;
  s = String(s||'').replace(/[R$\s]/g,'');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g,'').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,'');
  return Math.round(parseFloat(s)*100)/100;
}
export function moneyInputVal(v){ return (v===undefined||v===null||v==='') ? '' : NUM2.format(v); }
export function lsGet(k, d){ try { const v = localStorage.getItem('fin:'+k); return v===null ? d : JSON.parse(v); } catch { return d; } }
export function lsSet(k, v){ try { localStorage.setItem('fin:'+k, JSON.stringify(v)); } catch {} }

export const IC = {
  home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  repeat:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  gauge:'<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  chart:'<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V7M17 16v-3"/>',
  trend:'<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  checkCircle:'<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
  alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  alertCircle:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  wallet:'<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  up:'<path d="M7 17 17 7M7 7h10v10"/>',
  down:'<path d="M17 7 7 17M17 17H7V7"/>',
  more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play:'<path d="M6 4l14 8-14 8z"/>',
  bulb:'<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  piggy:'<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20M6 15h4"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
};
export const icon = (n, cls='i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||''}</svg>`;

/**
 * Máscara de dinheiro "estilo app de banco": a pessoa digita só números e os centavos,
 * a vírgula e os pontos de milhar aparecem sozinhos (1 → 0,01 · 12 → 0,12 · 1234 → 12,34).
 * Usada em todo <input data-money> (o listener fica em actions.js).
 */
export function maskMoneyInput(el){
  const digits = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
  el.value = digits ? NUM2.format(Number(digits) / 100) : '';
  const end = el.value.length;
  try { el.setSelectionRange(end, end); } catch {}
}
