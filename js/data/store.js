// Camada de dados: liga o app ao banco (Firebase ou local) e mantém tudo em memória em state.spaces.
//
// Como os dados são organizados (iguais nos dois bancos):
//   users/{uid}                     → ajustes da conta pessoal (renda, orçamento, categorias, householdId…)
//   users/{uid}/subs|fixed|goals|moves|cards|cardbuys|cardpay/{id}
//   users/{uid}/tx2026/{id}         → lançamentos, separados por ano
//   households/{hid}                → conta conjunta: ajustes + members (uids) + memberNames
//   households/{hid}/...            → mesmas coleções da conta pessoal
//
// "Espaço" (space) = conta pessoal ('personal') ou conjunta ('joint').
import { changed, toast } from '../bus.js';
import { SP, SP_COLS, newSpace, state } from '../state.js';
import { $, todayISO } from '../utils.js';

export let DB = null; // adaptador em uso: LocalDB() ou o do Firebase
export function setDB(db){ DB = db; }
export let AUTH = null; // login (só no modo Firebase)
export function setAuth(a){ AUTH = a; }

/** id da conta conjunta da pessoa logada (fica salvo nos ajustes pessoais). */
export function householdId(){ return (state.spaces.personal.settings || {}).householdId || null; }

/** Documento-base de um espaço. Na conjunta, null enquanto a pessoa não entrou em nenhuma. */
export function baseRef(key){
  if (key === 'personal') return DB.doc(`users/${state.uid}`);
  const hid = householdId();
  return hid ? DB.doc(`households/${hid}`) : null;
}
export const colRef = (key, name) => baseRef(key).collection(name);

/* ---------- Escritas ---------- */
// Uma escrita por vez em cada documento (evita que uma sobrescreva a outra fora de ordem)
export const queues = new Map();
export function serial(path, fn){ const prev = queues.get(path) || Promise.resolve(); const p = prev.then(fn, fn); queues.set(path, p.catch(()=>{})); return p; }
export async function withRetry(fn){ try { return await fn(); } catch(e){ if (e && e.code === 'unavailable'){ await new Promise(r => setTimeout(r, 400 + Math.random()*600)); return fn(); } throw e; } }
export function writeErr(e){
  const code = e && e.code;
  if (code === 'permission_denied') toast('Sem permissão para salvar isso.');
  else if (code === 'resource_exhausted') toast('Limite de uso do Firebase atingido por hoje. Tente mais tarde.');
  else toast('Não foi possível salvar. Verifique sua conexão.');
  console.warn('Erro ao salvar', e);
  throw e;
}
/** Grava o documento inteiro. */
export const put = (ref, data) => serial(ref.path, () => withRetry(() => ref.set(data))).catch(writeErr);
/** Altera só alguns campos (o documento precisa existir). */
export const patch = (ref, data) => serial(ref.path, () => withRetry(() => ref.update(data))).catch(writeErr);
/** Apaga o documento. */
export const del = ref => serial(ref.path, () => withRetry(() => ref.delete())).catch(writeErr);

/** Salva ajustes (renda, orçamento, categorias…) do espaço atual ou do indicado. */
export async function saveSettingsFor(key, changes){
  const sp = state.spaces[key]; const ref = baseRef(key); if (!ref) return;
  const existed = sp.settings !== null;
  sp.settings = Object.assign({}, sp.settings || {}, changes); changed();
  // Se o documento já existe, altera só os campos mudados (assim não apagamos o que outra pessoa salvou)
  if (existed) await patch(ref, changes); else await put(ref, sp.settings);
}
export const saveSettings = changes => saveSettingsFor(state.space, changes);

/* ---------- Leituras em tempo real ---------- */
export function snapErr(e){
  if (!e) return;
  console.warn('Erro ao ler dados', e);
  state.error = e.code === 'permission_denied'
    ? 'Sem permissão para ler parte dos dados. Confira as regras do Firestore (README, passo 2).'
    : 'Não foi possível carregar parte dos dados. Recarregue a página.';
  changed();
}

/** Começa a "escutar" um espaço: qualquer mudança no banco (sua ou de outra pessoa) atualiza a tela. */
export function startSpace(key){
  if (!DB || !state.uid) return;
  const base = baseRef(key); if (!base) return;
  let sp = state.spaces[key];
  if (sp.started && sp.basePath === base.path) return;
  if (sp.started) sp = stopSpace(key);
  sp.started = true; sp.basePath = base.path;
  sp.unsubs.push(base.onSnapshot(s => {
    sp.settings = s.exists ? s.data() : null; sp.settingsLoaded = true;
    if (key === 'personal') syncJoint();
    if (key === 'joint') Object.assign(state.names, (sp.settings || {}).memberNames || {});
    changed();
  }, snapErr));
  for (const c of SP_COLS){
    sp.unsubs.push(base.collection(c).onSnapshot(q => { sp[c] = q.docs.map(d => Object.assign({id:d.id}, d.data())); sp.loaded[c] = true; changed(); }, snapErr));
  }
  ensureYears(key);
}
/** Para de escutar um espaço e limpa os dados dele da memória. */
export function stopSpace(key){
  (state.spaces[key].unsubs || []).forEach(u => { try { u(); } catch {} });
  state.spaces[key] = newSpace();
  return state.spaces[key];
}
/** Liga/desliga/troca a conta conjunta conforme o householdId salvo nos ajustes pessoais. */
export function syncJoint(){
  const hid = householdId(), j = state.spaces.joint;
  if (!hid){ if (j.started) stopSpace('joint'); return; }
  if (j.basePath !== `households/${hid}`) startSpace('joint');
}
/** Lançamentos ficam em uma coleção por ano; esta função começa a escutar o ano pedido (uma vez só). */
export function ensureYear(key, y){
  const sp = state.spaces[key];
  if (!sp.started || sp.yearsSub[y]) return;
  sp.yearsSub[y] = true;
  sp.unsubs.push(colRef(key, 'tx'+y).onSnapshot(q => { sp.tx[y] = q.docs.map(d => Object.assign({id:d.id, _y:y}, d.data())); sp.loaded['tx'+y] = true; changed(); }, snapErr));
}
/** Anos necessários para o mês aberto na tela (o ano anterior é carregado só quando um relatório precisa). */
export function ensureYears(key = state.space){
  ensureYear(key, +state.month.slice(0,4));
  ensureYear(key, +todayISO().slice(0,4));
}
export function spaceReady(sp){ return sp.settingsLoaded && SP_COLS.every(c => sp.loaded[c]); }

/* ---------- Conta conjunta ---------- */
/** Cria uma conta conjunta nova com você como único membro e já entra nela. */
export async function createHousehold(){
  // Código de convite = id do documento: 20 caracteres aleatórios (impossível de adivinhar)
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  const hid = Array.from(crypto.getRandomValues(new Uint8Array(20)), b => abc[b % abc.length]).join('');
  await put(DB.doc(`households/${hid}`), { members: [state.uid], memberNames: { [state.uid]: state.userName || 'Você' }, name: '', createdAt: todayISO() });
  await saveSettingsFor('personal', { householdId: hid });
}
/** Entra numa conta conjunta usando o código recebido. */
export async function joinHousehold(code){
  code = String(code || '').trim();
  if (!/^[\w-]{10,64}$/.test(code)) throw { code: 'bad_code' };
  await DB.joinHousehold(code, state.uid, state.userName || 'Parceiro(a)');
  await saveSettingsFor('personal', { householdId: code });
}
/** Sai da conta conjunta (os dados dela continuam para os outros membros). */
export async function leaveHousehold(){
  const hid = householdId(); if (!hid) return;
  await saveSettingsFor('personal', { householdId: null }); // para de escutar antes de perder o acesso
  syncJoint();
  await DB.leaveHousehold(hid, state.uid);
}

/* ---------- Importar backup ---------- */
// Aceita o JSON exportado por este app (Ajustes → Exportar) e o do site antigo no Claude.
export const IMPORT_MAP = { assinaturas:'subs', fixas:'fixed', metas:'goals', movimentacoes:'moves', cartoes:'cards', compras_cartao:'cardbuys', faturas_pagas:'cardpay' };
export async function importBackup(data, onProgress){
  if (!data || typeof data !== 'object') throw new Error('Arquivo inválido');
  const key = state.space; let n = 0;
  if (data.ajustes && typeof data.ajustes === 'object'){
    const { householdId: _h, members: _m, memberNames: _n, ...rest } = data.ajustes;
    await saveSettings(rest);
  }
  for (const [field, col] of Object.entries(IMPORT_MAP)){
    for (const item of data[field] || []){
      const { id, ...rest } = item; if (!id) continue;
      await put(colRef(key, col).doc(id), rest); n++; onProgress && onProgress(n);
    }
  }
  for (const t of data.lancamentos || []){
    const { id, _y, ...rest } = t; if (!id || !rest.date) continue;
    const y = String(rest.date).slice(0,4);
    if (rest.by) rest.by = state.uid;
    await put(colRef(key, 'tx' + y).doc(id), rest); ensureYear(key, +y); n++; onProgress && onProgress(n);
  }
  return n;
}
/** Monta o backup completo do espaço atual. */
export function exportBackup(){
  const sp = SP();
  return { app: 'financas', versao: 2, exportadoEm: new Date().toISOString(), conta: state.space,
    ajustes: sp.settings, assinaturas: sp.subs, fixas: sp.fixed, metas: sp.goals, movimentacoes: sp.moves,
    cartoes: sp.cards, compras_cartao: sp.cardbuys, faturas_pagas: sp.cardpay,
    lancamentos: Object.values(sp.tx).flat().map(({ _y, ...t }) => t) };
}
