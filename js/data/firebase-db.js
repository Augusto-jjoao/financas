// Adaptador do FIREBASE (login com Google + banco Cloud Firestore).
// Expõe a mesma interface do local-db.js: doc(path), collection(path), get/set/update/delete/onSnapshot.
// O SDK do Firebase é carregado direto do CDN oficial (gstatic), sem npm e sem etapa de build.
import { colRef } from './store.js';
import { $ } from '../utils.js';

export const SDK = 'https://www.gstatic.com/firebasejs/12.15.0';

/** Converte os códigos de erro do Firebase para os códigos que o app entende. */
export function mapErr(e){
  const codes = { 'permission-denied': 'permission_denied', 'resource-exhausted': 'resource_exhausted', 'unavailable': 'unavailable', 'not-found': 'not_found', 'invalid-argument': 'invalid_argument' };
  return { code: codes[e && e.code] || (e && e.code) || 'unknown', message: e && e.message };
}

/**
 * Inicializa o Firebase e devolve { db, auth }.
 * @param {object} config - o objeto copiado do console do Firebase (js/firebase-config.js)
 */
export async function initFirebase(config){
  const [appMod, authMod, fs] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(config);
  const auth = authMod.getAuth(app);

  // Cache local: o app abre rápido e funciona sem internet; as alterações sincronizam depois.
  let db;
  try {
    db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  } catch (e) {
    console.warn('Cache offline indisponível; usando o modo padrão.', e);
    db = fs.getFirestore(app);
  }

  const wrapDoc = s => ({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: s.metadata });
  const wrapQuery = q => ({ docs: q.docs.map(wrapDoc), size: q.size, empty: q.empty, metadata: q.metadata });
  const fail = e => { throw mapErr(e); };

  const docRef = path => {
    const ref = fs.doc(db, path);
    return {
      id: ref.id, path,
      get: () => fs.getDoc(ref).then(wrapDoc, fail),
      set: data => fs.setDoc(ref, data).catch(fail),
      update: data => fs.updateDoc(ref, data).catch(fail),
      delete: () => fs.deleteDoc(ref).catch(fail),
      onSnapshot: (next, err) => fs.onSnapshot(ref, s => next(wrapDoc(s)), e => err && err(mapErr(e))),
      collection: name => colRef(path + '/' + name),
    };
  };
  const colRef = path => {
    const ref = fs.collection(db, path);
    return {
      path,
      doc: id => docRef(path + '/' + (id || fs.doc(ref).id)),
      add: async data => { const r = docRef(path + '/' + fs.doc(ref).id); await r.set(data); return r; },
      get: () => fs.getDocs(ref).then(wrapQuery, fail),
      onSnapshot: (next, err) => fs.onSnapshot(ref, q => next(wrapQuery(q)), e => err && err(mapErr(e))),
    };
  };

  const dbAdapter = {
    kind: 'firebase',
    doc: docRef,
    collection: colRef,
    /** Entra numa conta conjunta pelo código (o código é o id do documento em "households"). */
    joinHousehold: (hid, uid, name) => fs.updateDoc(fs.doc(db, 'households', hid), {
      members: fs.arrayUnion(uid),
      ['memberNames.' + uid]: name,
    }).catch(fail),
    /** Sai da conta conjunta (remove só a si mesmo). */
    leaveHousehold: (hid, uid) => fs.updateDoc(fs.doc(db, 'households', hid), {
      members: fs.arrayRemove(uid),
      ['memberNames.' + uid]: fs.deleteField(),
    }).catch(fail),
  };

  const authAdapter = {
    onChange: cb => authMod.onAuthStateChanged(auth, cb),
    async signIn(){
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try { await authMod.signInWithPopup(auth, provider); }
      catch (e) {
        // Se o navegador bloquear a janela de login, faz o login na própria página
        if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return authMod.signInWithRedirect(auth, provider);
        throw e;
      }
    },
    signOut: () => authMod.signOut(auth),
  };

  return { db: dbAdapter, auth: authAdapter };
}
