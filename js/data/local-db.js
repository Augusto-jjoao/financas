// Banco de dados LOCAL ("modo local"): guarda tudo no localStorage deste navegador.
// Tem exatamente a mesma "cara" (interface) do adaptador do Firebase (firebase-db.js),
// então o resto do app não precisa saber qual dos dois está em uso.
//
// Estrutura: documentos JSON identificados por um caminho com número PAR de partes
// ("users/abc", "users/abc/tx2026/xyz"). Coleções são caminhos com número ÍMPAR ("users/abc/tx2026").
import { colRef, joinHousehold, leaveHousehold } from './store.js';
import { $, uidGen } from '../utils.js';

export const STORAGE_KEY = 'fin:localdb';

export function LocalDB(){
  const docs = new Map();
  const listeners = new Set();

  // Carrega o que já estava salvo neste navegador
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    for (const [path, data] of Object.entries(saved)) docs.set(path, data);
  } catch (e) { console.warn('Não foi possível ler os dados locais', e); }

  // Salva no localStorage (agrupando várias alterações seguidas)
  let saveTimer = null;
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(docs))); }
      catch (e) { console.error('Não foi possível salvar os dados locais', e); }
    }, 150);
  };

  const parentOf = p => p.split('/').slice(0, -1).join('/');
  const snap = p => { const d = docs.get(p); return { id: p.split('/').pop(), exists: !!d, data: () => d, metadata: { fromCache: false } }; };
  const querySnap = p => {
    const depth = p.split('/').length + 1;
    const list = [...docs.keys()].filter(k => k.startsWith(p + '/') && k.split('/').length === depth).map(snap);
    return { docs: list, size: list.length, empty: !list.length, metadata: { fromCache: false } };
  };
  // Avisa quem está "escutando" o documento ou a coleção dele
  const notify = p => { for (const l of listeners) if ((l.type === 'doc' && l.path === p) || (l.type === 'col' && l.path === parentOf(p))) l.fire(); };
  const clone = d => JSON.parse(JSON.stringify(d));

  const docRef = path => ({
    id: path.split('/').pop(), path,
    get: async () => snap(path),
    set: async data => { docs.set(path, clone(data)); persist(); notify(path); },
    update: async data => {
      if (!docs.has(path)) throw { code: 'not_found' };
      docs.set(path, { ...docs.get(path), ...clone(data) }); persist(); notify(path);
    },
    delete: async () => { docs.delete(path); persist(); notify(path); },
    onSnapshot(next){ const l = { type: 'doc', path, fire: () => next(snap(path)) }; listeners.add(l); setTimeout(l.fire, 0); return () => listeners.delete(l); },
    collection: name => colRef(path + '/' + name),
  });

  const colRef = path => ({
    path,
    doc: id => docRef(path + '/' + (id || uidGen())),
    add: async data => { const r = docRef(path + '/' + uidGen()); await r.set(data); return r; },
    get: async () => querySnap(path),
    onSnapshot(next){ const l = { type: 'col', path, fire: () => next(querySnap(path)) }; listeners.add(l); setTimeout(l.fire, 0); return () => listeners.delete(l); },
  });

  return {
    kind: 'local',
    doc: docRef,
    collection: colRef,
    // No modo local não existe outra pessoa para entrar: a conta conjunta fica só neste navegador.
    async joinHousehold(){ throw { code: 'local_only' }; },
    async leaveHousehold(hid, uid){
      const p = `households/${hid}`; const d = docs.get(p); if (!d) return;
      const names = { ...(d.memberNames || {}) }; delete names[uid];
      await docRef(p).set({ ...d, members: (d.members || []).filter(x => x !== uid), memberNames: names });
    },
    /** Apaga TODOS os dados locais (usado em Ajustes). */
    wipe(){ docs.clear(); try { localStorage.removeItem(STORAGE_KEY); } catch {} },
  };
}
