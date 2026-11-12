import { DEFAULT_RATES } from './constants.js';
import { lsGet, prefs, ymNow } from './utils.js';

/* ================= State ================= */
export const SP_COLS = ['subs','fixed','goals','moves','cards','cardbuys','cardpay'];
export const newSpace = () => ({unsubs:[], basePath:null, settings:null, settingsLoaded:false, subs:[], fixed:[], goals:[], moves:[], cards:[], cardbuys:[], cardpay:[], members:[], tx:{}, loaded:{}, yearsSub:{}, started:false});
export const state = {
  route: 'inicio', month: ymNow(), space: lsGet('space','personal'),
  get hide(){ return prefs.hide; }, set hide(v){ prefs.hide = v; },
  theme: lsGet('theme', null),
  // mode: 'loading' (iniciando) | 'auth' (precisa entrar) | 'cloud' (Firebase) | 'local' (só neste navegador) | 'error'
  mode: 'loading', uid: null, userName: '', userEmail: '', readOnly: false, slow: false, error: null,
  names: {},
  spaces: {personal: newSpace(), joint: newSpace()},
  txf: {q:'', type:'all', cat:'all', tag:'all'},
  inv: {amount: null, months: 12, liq: false},
  rates: Object.assign({}, DEFAULT_RATES, lsGet('rates', {})),
  cardSel: lsGet('cardSel', null),
  repTable: false,
};
export const SP = () => state.spaces[state.space];
prefs.hide = lsGet('hide', false);

